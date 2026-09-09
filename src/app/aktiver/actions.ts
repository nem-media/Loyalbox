"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { noterFejl } from "@/lib/drift";
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
const FELTER = "id, contact_email, user_id, aktivering_token, aktivering_udloeber";

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
  if (!erGyldigKode(kode)) return { fejl: KODE_FEJL };

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
   * FINDES ADRESSEN I FORVEJEN, knyttes den BESTÅENDE bruger i stedet for at
   * fejle. Køberen har både tokenet fra betalingen og adressen — to beviser —
   * og alternativet ville være en betalende kunde, der ikke kan komme ind,
   * fordi de engang har haft en konto. Deres adgangskode røres ikke; de
   * logger ind som de plejer.
   */
  let brugerId: string | null = null;
  const { data: oprettet, error: opretFejl } =
    await admin.auth.admin.createUser({
      email,
      password: kode,
      email_confirm: true,
      user_metadata: { role: "customer" },
    });

  if (oprettet?.user) {
    brugerId = oprettet.user.id;
  } else {
    const { data: liste } = await admin.auth.admin.listUsers({ perPage: 1000 });
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
    if (oprettet?.user) await admin.auth.admin.deleteUser(oprettet.user.id);
    return {
      fejl: knytFejl
        ? "Kontoen kunne ikke knyttes til din bestilling. Skriv til os."
        : AKTIVERING_TEKSTER.alleredeAktiveret,
      logInd: !knytFejl,
    };
  }

  /*
   * LOG DEM IND MED DET SAMME. De har lige valgt en kode; at bede dem skrive
   * den igen på en loginskærm ville være et ekstra trin uden formål — og det
   * er præcis den slags trin, hele ændringen handler om at fjerne.
   *
   * Kun når vi selv oprettede brugeren: har de en konto i forvejen, kender vi
   * ikke deres kode, og `kode` var aldrig deres.
   */
  if (oprettet?.user) {
    const supabase = await createClient();
    await supabase.auth.signInWithPassword({ email, password: kode });
  }

  revalidatePath("/", "layout");
  redirect(oprettet?.user ? "/dashboard/standere" : "/login");
}

/** Tak-siden: aktiverer med Stripes `session_id`. */
export async function aktiverFraSession(
  _prev: AktiveringResultat,
  formData: FormData,
): Promise<AktiveringResultat> {
  const sessionId = String(formData.get("session_id") ?? "").trim();
  if (!sessionId) return { fejl: AKTIVERING_TEKSTER.intetToken };
  return aktiver(await firmaFraSession(sessionId), String(formData.get("kode") ?? ""));
}

/** Mailen: aktiverer med tokenet. */
export async function aktiverFraToken(
  _prev: AktiveringResultat,
  formData: FormData,
): Promise<AktiveringResultat> {
  const token = String(formData.get("token") ?? "").trim();
  if (!token) return { fejl: AKTIVERING_TEKSTER.intetToken };
  return aktiver(await firmaFraToken(token), String(formData.get("kode") ?? ""));
}
