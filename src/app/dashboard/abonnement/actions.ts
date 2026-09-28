"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  skiftTilAarsbetaling,
  type AarsSkifteFejl,
} from "@/lib/aarsabonnement";
import { COMPANY, TERMS_VERSION, aarsPris, getProduct } from "@/lib/constants";
import { aarsskifteMail, opgraderetMail } from "@/lib/abonnementsmail";
import { opgraderAbonnement, type OpgraderingsFejl } from "@/lib/opgradering";
import { createAdminClient } from "@/lib/supabase/admin";
import { DPA_VERSION, requiresDpa } from "@/lib/dpa";
import { sendAbonnementsmail } from "@/lib/abonnementsmail-udsendelse";

export interface AarsSkifteResultat {
  ok?: boolean;
  fejlbesked?: string;
}

/**
 * Beskeden til kunden pr. grund.
 *
 * EN GRUND OG IKKE BARE ET NEJ — samme regel som `koebSpaerre()`. "Vi har ikke
 * åbnet for det endnu" er en anden besked end "din betaling er bagud", og en
 * knap, der bare fejler, forklarer ingen af delene.
 */
const BESKEDER: Record<AarsSkifteFejl, string> = {
  "ingen-virksomhed": "Log ind med din virksomhed for at skifte.",
  "intet-abonnement":
    "Der er ikke noget løbende abonnement at skifte. Har du lige købt, så prøv igen om et øjeblik.",
  "ikke-aabnet": `Årsbetaling er ikke åbnet endnu. Skriv til ${COMPANY.email}, så sætter vi det op.`,
  "betaler-ikke":
    "Din seneste betaling er ikke gået igennem. Ret betalingskortet først under Betaling og kvitteringer — så kan du skifte bagefter.",
  "allerede-aarlig": "Du betaler allerede for et år ad gangen.",
  "linjen-mangler": `Vi kunne ikke finde abonnementslinjen hos Stripe. Skriv til ${COMPANY.email}, så ordner vi det.`,
  stripe: `Betalingen kunne ikke gennemføres. Prøv igen, eller skriv til ${COMPANY.email}.`,
};

/**
 * Skift til årsbetaling.
 *
 * VIRKSOMHEDEN HENTES AF SESSIONEN og kommer aldrig fra formularen. Et skjult
 * felt kunne forfalskes, og så ville et klik kunne ændre en anden butiks
 * abonnement — samme regel som i supportformularen.
 *
 * Der SKRIVES ingenting i basen her. `adresser_tilladt` og `stripe_status`
 * holdes i takt af webhooken (`customer.subscription.updated`), som henter
 * abonnementet friskt hos Stripe. To steder, der skriver det samme tal, er to
 * steder, der kan komme i utakt.
 */
export async function skiftTilAar(): Promise<AarsSkifteResultat> {
  const user = await getCurrentUser();
  const svar = await skiftTilAarsbetaling(user?.company);

  if (!svar.ok) return { fejlbesked: BESKEDER[svar.fejl ?? "stripe"] };

  /*
   * BEKRÆFTELSEN PÅ SKRIFT. Stripes kvittering viser et beløb på flere tusinde
   * kroner med en linje, der hedder "Remaining time" — ikke hvad det dækker.
   * Nøglen er abonnementet: det skifter kun til år én gang (den anden vej går
   * gennem os), så to hurtige tryk kan ikke give to mails. Skiftet ER sket,
   * så en mail, der fejler, må ikke gøre svaret til en fejl — den noteres.
   */
  const company = user!.company!;
  const produkt = getProduct(company.product_slug!);
  const aarPris = produkt ? aarsPris(produkt) : null;
  if (produkt && aarPris !== null) {
    await sendAbonnementsmail({
      noegle: `aar:${company.stripe_subscription_id}`,
      til: company.contact_email,
      mail: aarsskifteMail({
        firmanavn: company.name ?? null,
        vare: produkt.name,
        aarPris,
        antal: svar.antal ?? 1,
        naesteBetaling: svar.naesteBetaling ?? null,
      }),
    });
  }

  revalidatePath("/dashboard/abonnement");
  return { ok: true };
}

export interface OpgraderingsResultat {
  ok?: boolean;
  fejlbesked?: string;
  /** Kun når betalingen skal godkendes eller betales på Stripes side. */
  fakturaUrl?: string | null;
}

const OPGRADERINGSBESKEDER: Record<OpgraderingsFejl, string> = {
  "ingen-virksomhed": "Log ind med din virksomhed for at opgradere.",
  "ikke-opgradering":
    "Det skifte kan ikke tages her. Har du lige opgraderet, så genindlæs siden.",
  "ikke-aabnet": `Opgraderingen er ikke åbnet for dit abonnement endnu. Skriv til ${COMPANY.email}, så ordner vi det.`,
  "linjen-mangler": `Vi kunne ikke finde abonnementslinjen hos Stripe. Skriv til ${COMPANY.email}, så ordner vi det.`,
  "betaling-fejlede":
    "Betalingen gik ikke igennem, så du er stadig på dit nuværende abonnement, og der er ikke skiftet noget. Ret betalingskortet under Betaling og kvitteringer, og prøv igen.",
  stripe: `Opgraderingen kunne ikke gennemføres. Der er ikke skiftet noget. Prøv igen, eller skriv til ${COMPANY.email}.`,
};

/**
 * Opgrader til en større vare på det abonnement, der allerede kører.
 *
 * VIRKSOMHEDEN HENTES AF SESSIONEN, og varen slås op i kataloget — et slug,
 * der ikke findes, giver `ikke-aabnet`, og spærren i `opgraderAbonnement()`
 * afgør resten.
 *
 * IKKE I SUPPORTTILSTAND. Opgraderingen trækker straks på kundens kort, og et
 * træk udløst af et klik hos OS er ikke noget, kunden har sagt ja til —
 * samme grund til at admins adressesalg ikke fakturerer med det samme.
 *
 * ACCEPTEN STEMPLES FØR BETALINGEN, som i checkout: en accept uden køb er
 * harmløs, et køb uden accept er det ikke.
 */
export async function opgraderTil(
  _prev: OpgraderingsResultat,
  formData: FormData,
): Promise<OpgraderingsResultat> {
  const user = await getCurrentUser();
  if (!user?.company) return { fejlbesked: OPGRADERINGSBESKEDER["ingen-virksomhed"] };
  if (user.supportFor) {
    return {
      fejlbesked:
        "Du er i kundens dashboard som support. En opgradering trækker på kundens kort og skal trykkes af kunden selv.",
    };
  }
  if (formData.get("accepterVilkaar") !== "on") {
    return { fejlbesked: "Du skal acceptere handelsbetingelserne for at opgradere." };
  }

  const company = user.company;
  const maal = getProduct(String(formData.get("produkt") ?? ""));
  const nuvaerende = getProduct(company.product_slug ?? "");

  const admin = createAdminClient();
  await admin
    .from("companies")
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    })
    .eq("id", company.id);
  if (maal && requiresDpa(maal)) {
    await admin
      .from("companies")
      .update({
        dpa_accepted_at: new Date().toISOString(),
        dpa_version: DPA_VERSION,
      })
      .eq("id", company.id)
      .or(`dpa_version.is.null,dpa_version.neq.${DPA_VERSION}`);
  }

  const svar = await opgraderAbonnement(company, maal);
  if (!svar.ok) {
    return {
      fejlbesked: OPGRADERINGSBESKEDER[svar.fejl ?? "stripe"],
      fakturaUrl: svar.fakturaUrl ?? null,
    };
  }

  const nyPris = svar.aarligt ? aarsPris(maal!) : maal!.monthlyPrice!;
  if (nyPris !== null) {
    await sendAbonnementsmail({
      noegle: `opgradering:${company.stripe_subscription_id}:${maal!.slug}`,
      til: company.contact_email,
      mail: opgraderetMail({
        firmanavn: company.name ?? null,
        fra: nuvaerende?.name ?? "dit tidligere abonnement",
        til: maal!.name,
        nyPris,
        aarligt: Boolean(svar.aarligt),
        antal: svar.antal ?? 1,
        betaltOere: svar.betaltOere ?? null,
        naesteBetaling: svar.naesteBetaling ?? null,
      }),
    });
  }

  revalidatePath("/dashboard", "layout");
  return { ok: true };
}
