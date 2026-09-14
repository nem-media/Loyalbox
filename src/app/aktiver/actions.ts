"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { noterFejl } from "@/lib/drift";
import { findKonto } from "@/lib/konto-opslag";
import {
  aktiveringSpaerre,
  erGyldigKode,
  KODE_FEJL,
  AKTIVERING_TEKSTER,
  type AktiveringSpaerre,
} from "@/lib/aktivering";

/**
 * Kunden gør virksomheden til sin, EFTER at have betalt.
 *
 * TO VEJE IND, samme arbejde. Tak-siden kender `session_id` fra Stripes
 * redirect; mailen bærer aktiveringstokenet. Begge finder frem til den samme
 * virksomhed, og resten er fælles — ellers ville den ene vej før eller siden
 * komme til at gøre noget, den anden ikke gør.
 *
 * INGEN AF VEJENE TAGER IMOD EN E-MAIL. Adressen læses fra virksomheden, som
 * fik den fra betalingen. Kunne den sendes med, ville den, der har tokenet,
 * kunne oprette kontoen på en adresse, de selv valgte — og så var tokenet
 * ikke længere et bevis på, at man er køberen.
 */

export interface AktiveringResultat {
  fejl?: string;
  /** Sat når grunden er, at der allerede ER en konto — så kan siden linke til login. */
  logInd?: boolean;
}

const BESKED: Record<AktiveringSpaerre, string> = {
  "allerede-aktiveret": AKTIVERING_TEKSTER.alleredeAktiveret,
  udloebet: AKTIVERING_TEKSTER.udloebet,
  "intet-token": AKTIVERING_TEKSTER.intetToken,
};

/** Felterne, aktiveringen har brug for. Ét sted, så de to veje henter det samme. */
const FELTER =
  "id, contact_email, user_id, aktivering_token, aktivering_udloeber";

/** Virksomheden bag en Stripe-session — vejen fra tak-siden. */
async function firmaFraSession(sessionId: string) {
  const admin = createAdminClient();
  const { data: ordre } = await admin
    .from("orders")
    .select("company_id")
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  if (!ordre?.company_id) return null;

  const { data } = await admin
    .from("companies")
    .select(FELTER)
    .eq("id", ordre.company_id)
    .maybeSingle();

  return data;
}

/** Virksomheden bag et token — vejen fra mailen. */
async function firmaFraToken(token: string) {
  const { data } = await createAdminClient()
    .from("companies")
    .select(FELTER)
    .eq("aktivering_token", token)
    .maybeSingle();

  return data;
}

/**
 * Selve aktiveringen.
 *
 * RÆKKEFØLGEN ER VALGT FOR AT UNDGÅ TO EJERE. Brugeren oprettes først, og
 * virksomheden knyttes derefter med en BETINGET opdatering (`user_id is
 * null`). Rammer den nul rækker, nåede nogen det først — to faner, to klik —
 * og så ryddes den bruger, vi lige har lavet, op igen. Uden betingelsen ville
 * det sidste klik kunne overtage en virksomhed, der allerede var aktiveret.
 */
async function aktiver(
  firma: {
    id: string;
    contact_email: string | null;
    user_id: string | null;
    aktivering_token: string | null;
    aktivering_udloeber: string | null;
  } | null,
  kode: string,
): Promise<AktiveringResultat> {
  const spaerre = aktiveringSpaerre(firma);
  if (spaerre) {
    return {
      fejl: BESKED[spaerre],
      logInd: spaerre === "allerede-aktiveret",
    };
  }
  const email = firma!.contact_email?.trim();
  if (!email) {
    await noterFejl(
      "aktivering",
      `Virksomhed ${firma!.id} har et gyldigt token, men ingen kontaktmail.`,
    );
    return { fejl: AKTIVERING_TEKSTER.intetToken };
  }

  const admin = createAdminClient();

  /*
   * FINDES ADRESSEN I FORVEJEN, knyttes den BESTÅENDE bruger — køberen har
   * både tokenet fra betalingen og adressen, og alternativet ville være en
   * betalende kunde, der ikke kan komme ind, fordi de engang har haft en
   * konto. Men der SPØRGES FØRST, og der bliver IKKE bedt om en kode.
   *
   * FØR BLEV KODEN TAGET IMOD OG SMIDT VÆK I TAVSHED. Kunden valgte en
   * adgangskode, blev sendt til loginskærmen uden en eneste besked og kunne
   * så ikke logge ind med den — den var aldrig gemt nogen steder. Det ramte
   * et rigtigt køb 14. september 2026. Koden må heller ikke bare SÆTTES i
   * stedet: så kunne den, der har tokenet, skifte adgangskode på en
   * bestående konto, og tokenet ville gå fra at knytte et køb til en konto
   * til at overtage den.
   */
  const konto = await findKonto(email);

  let brugerId: string | null = konto?.brugerId ?? null;
  let viOprettede = false;

  if (!brugerId) {
    if (!erGyldigKode(kode)) return { fejl: KODE_FEJL };

    const { data: oprettet, error: opretFejl } =
      await admin.auth.admin.createUser({
        email,
        password: kode,
        email_confirm: true,
        user_metadata: { role: "customer" },
      });

    if (oprettet?.user) {
      brugerId = oprettet.user.id;
      viOprettede = true;
    } else {
      /*
       * SPEJLET I `public.users` FYLDES VED OPRETTELSEN OG IKKE VED ET
       * SENERE SKIFT, så en kunde, der har ændret sin e-mail bagefter,
       * findes ikke af opslaget ovenfor — men `createUser` afviser hende.
       * Så er det stadig en eksisterende konto, og koden skal STADIG ikke
       * bruges: vi ender i den samme besked som alle andre med en konto i
       * forvejen, frem for at tie.
       */
      const { data: liste } = await admin.auth.admin.listUsers({
        perPage: 1000,
      });
      const fundet = liste?.users.find(
        (u) => u.email?.toLowerCase() === email.toLowerCase(),
      );
      if (!fundet) {
        await noterFejl(
          "aktivering",
          `Kunne ikke oprette bruger til ${firma!.id}: ${opretFejl?.message ?? "ukendt"}`,
        );
        return { fejl: "Kontoen kunne ikke oprettes. Prøv igen." };
      }
      brugerId = fundet.id;
    }
  }

  const { data: knyttet, error: knytFejl } = await admin
    .from("companies")
    .update({
      user_id: brugerId,
      aktivering_token: null,
      aktivering_udloeber: null,
    })
    .eq("id", firma!.id)
    .is("user_id", null)
    .select("id");

  if (knytFejl || !knyttet?.length) {
    // Kapløbet tabt, eller opdateringen fejlede: ryd den bruger, vi lige har
    // lavet, hvis det var os, der lavede den.
    if (viOprettede && brugerId) await admin.auth.admin.deleteUser(brugerId);
    return {
      fejl: knytFejl
        ? "Kontoen kunne ikke knyttes til din bestilling. Skriv til os."
        : AKTIVERING_TEKSTER.alleredeAktiveret,
      logInd: !knytFejl,
    };
  }

  /*
   * EJEDE BRUGEREN ALLEREDE EN VIRKSOMHED, ejer de nu to — og dashboardet
   * viser kun én. Det skal bestillingen have afvist på forhånd (se
   * `EMAIL_HAR_KONTO`); står vi her alligevel, er noget sluppet forbi, og
   * kunden har betalt for noget, de ikke kan se. Derfor et varsel frem for
   * en tavs tilknytning: det er dét, der gør forskel på en fejl, VI
   * opdager, og en, kunden opdager.
   */
  if (konto?.harVirksomhed) {
    await noterFejl(
      "aktivering",
      `Virksomhed ${firma!.id} blev knyttet til en bruger, der i forvejen ` +
        "ejer en virksomhed. Dashboardet viser kun én — flyt købet i hånden.",
    );
  }

  /*
   * LOG DEM IND MED DET SAMME. De har lige valgt en kode; at bede dem skrive
   * den igen på en loginskærm ville være et ekstra trin uden formål — og det
   * er præcis den slags trin, hele ændringen handler om at fjerne.
   *
   * Kun når VI oprettede brugeren: har de en konto i forvejen, kender vi
   * ikke deres kode. De sendes til login MED EN BESKED om netop det — en bar
   * loginskærm efter en betaling ligner, at købet ikke gik igennem.
   */
  if (!viOprettede) {
    revalidatePath("/", "layout");
    redirect("/login?besked=knyttet");
  }

  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email, password: kode });

  /*
   * IND PÅ DEN STANDER, DE LIGE HAR KØBT — ikke på listen.
   *
   * Standeren er oprettet af købet og mangler kun ét: hvor QR-koden skal føre
   * hen. Det er hele grunden til, at de er her, og en liste med præcis ét
   * element er et ekstra klik, der kun kan gøre skade. Har de mod forventning
   * ingen eller flere standere, falder vi tilbage på listen — dér kan de selv
   * vælge, og en ødelagt adresse ville være værre end et klik.
   */
  const { data: standere } = await admin
    .from("stands")
    .select("id")
    .eq("company_id", firma!.id)
    .order("created_at", { ascending: true })
    .limit(2);

  revalidatePath("/", "layout");
  redirect(
    standere?.length === 1
      ? `/dashboard/standere/${standere[0].id}`
      : "/dashboard/standere",
  );
}

/** Tak-siden: aktiverer med Stripes `session_id`. */
export async function aktiverFraSession(
  _prev: AktiveringResultat,
  formData: FormData,
): Promise<AktiveringResultat> {
  const sessionId = String(formData.get("session_id") ?? "").trim();
  if (!sessionId) return { fejl: AKTIVERING_TEKSTER.intetToken };
  return aktiver(
    await firmaFraSession(sessionId),
    String(formData.get("kode") ?? ""),
  );
}

/** Mailen: aktiverer med tokenet. */
export async function aktiverFraToken(
  _prev: AktiveringResultat,
  formData: FormData,
): Promise<AktiveringResultat> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { fejl: AKTIVERING_TEKSTER.intetToken };
  return aktiver(
    await firmaFraToken(token),
    String(formData.get("kode") ?? ""),
  );
}
