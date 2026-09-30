import { normalizeEmail } from "@/lib/employees";
import type { CommerceCustomer } from "./types";

/**
 * HVEM ER KUNDEN PÅ ORDREN? — kun for at OPTJENE, aldrig for at BRUGE.
 *
 * Rækkefølgen:
 *   1. En BEKRÆFTET kobling (webshopkunde ↔ LoyalSum-kunde) for netop denne
 *      integration og dette kunde-id. Det stærkeste signal, vi har.
 *   2. Ordrens e-mail, normaliseret (trim + små bogstaver — samme regel som
 *      `normalizeEmail()` bruger om medarbejdere), mod medlemmerne i SAMME
 *      virksomhed. Præcis ét match → den kunde.
 *   3. Intet match → `unknown`: ordren gemmes, og optjeningen venter, til
 *      kunden bekræfter sin e-mail. Der oprettes IKKE en kunde af sig selv.
 *   4. Flere match → `ambiguous`: der gættes ikke. Samme venteposition.
 *
 * AT E-MAILEN PASSER, ER NOK TIL AT GIVE POINT — det er kundens egen ordre,
 * og det værste, der kan ske, er, at de rigtige point lander på det kort, der
 * har den adresse. Det er ALDRIG nok til at BRUGE point: dertil kræves en
 * bekræftet kobling (se `commerce_reserver()` i 0049).
 *
 * Matchningen er altid inden for ÉN virksomhed. Samme e-mail hos en anden
 * butik er en anden kunde.
 */

export type Opslag = "link" | "email" | "unknown" | "ambiguous";

export interface KundeAfhaengigheder {
  bekraeftetMedlem(integrationId: string, externalCustomerId: string): Promise<string | null>;
  medlemmerMedEmail(companyId: string, emailNorm: string): Promise<string[]>;
}

export interface Kunde {
  memberId: string | null;
  resolution: Opslag;
  emailNorm: string;
}

export function normaliserEmail(email: string): string {
  return normalizeEmail(email);
}

export async function findKunde(
  companyId: string,
  integrationId: string,
  kunde: CommerceCustomer,
  deps: KundeAfhaengigheder,
): Promise<Kunde> {
  const emailNorm = normaliserEmail(kunde.email);

  if (kunde.external_customer_id) {
    const m = await deps.bekraeftetMedlem(integrationId, kunde.external_customer_id);
    if (m) return { memberId: m, resolution: "link", emailNorm };
  }

  const ids = await deps.medlemmerMedEmail(companyId, emailNorm);
  if (ids.length === 1) return { memberId: ids[0], resolution: "email", emailNorm };
  if (ids.length > 1) return { memberId: null, resolution: "ambiguous", emailNorm };
  return { memberId: null, resolution: "unknown", emailNorm };
}
