"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import {
  skiftTilAarsbetaling,
  type AarsSkifteFejl,
} from "@/lib/aarsabonnement";
import { COMPANY } from "@/lib/constants";

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

  revalidatePath("/dashboard/abonnement");
  return { ok: true };
}
