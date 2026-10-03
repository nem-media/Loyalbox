import "server-only";
import { commerceIPlan } from "@/lib/loyalty/plan";

/**
 * Må virksomheden hente WooCommerce-pluginet?
 *
 * PRÆCIS SAMME SVAR SOM WEBSHOPINTEGRATIONEN, OG DET ER MENINGEN. Pluginet er
 * kun værd noget sammen med parringen, og parringen kræver `commerceIPlan()`:
 * et aktivt abonnement (ikke ophørt, ikke suspenderet uden betaling — se
 * `abonnementTilstand()`) på et produkt med `includesLoyalSum`, i dag LoyalSum
 * Komplet og LoyalSum Komplet Online. Reviewstander og Reviewstander Pro har
 * det ikke, og tilkøb (ekstra stander) giver det ikke.
 *
 * Ingen egen pakke- eller abonnementslogik her: den dag pakkerne ændrer sig,
 * følger download og parring med hinanden af sig selv.
 *
 * `companyId` skal komme fra den indloggede brugers adgang
 * (`getCompanyAccess()`), aldrig fra klienten.
 */
export async function kanHenteWooCommercePlugin(companyId: string): Promise<boolean> {
  return commerceIPlan(companyId);
}
