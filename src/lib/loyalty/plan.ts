import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hasLoyaltyAccess } from "@/lib/constants";
import { abonnementTilstand } from "@/lib/abonnement";

/**
 * Er stempelkort med i virksomhedens abonnement lige nu?
 *
 * ÉT STED, fordi både ejerens dashboard-handlinger og medarbejderens egne
 * handlinger (`/personale/stempelkort`) skal svare ens. Lå tjekket to steder,
 * ville en medarbejder med `canManage` før eller siden kunne oprette et kort
 * på et abonnement, ejerens egen side sagde nej til.
 *
 * BEVIDST KUN PÅ ADMINISTRATION (opret/aktivér/deaktivér). Stempling og
 * indløsning af EKSISTERENDE kort er ikke spærret — en kunde med et halvt
 * fyldt kort skal ikke stå med et dødt kort, hvis abonnementet falder.
 *
 * En suspenderet aftale spærrer på samme måde som en plan uden stempelkort;
 * kortene selv røres ikke (se `src/lib/abonnement.ts`).
 */
export async function stempelkortIPlan(companyId: string): Promise<boolean> {
  const data = await hentAbonnementsfelter(companyId);
  if (!data) return false;
  if (abonnementTilstand(data) !== "aktiv") return false;
  return hasLoyaltyAccess(data.product_slug);
}

/**
 * Må virksomheden administrere MEDARBEJDERE?
 *
 * SAMME SVAR SOM STEMPELKORTET, OG DET ER HELE POINTEN. En medarbejder findes
 * for at kunne stemple, give rabat og indløse — alt sammen stempelkort. En
 * Reviewstander Pro-kunde har intet af det, så medarbejderfladen var en
 * invitationsflade til rettigheder, ingen af parterne kunne bruge til noget.
 *
 * SPÆRRINGEN HANG FØR PÅ `harAbonnement()`, altså "har du købt en løbende
 * vare" — og både Pro (99 kr.) og Komplet (399 kr.) svarer ja på dét. Fejlen
 * var tavs og til kundens fordel: intet gik i stykker, ingen klagede, og en
 * Pro-kunde kunne invitere ansatte ind til en funktion, de ikke havde købt.
 * Samme klasse fejl som `/dashboard/opslag`, der heller ikke var spærret.
 *
 * DER SPØRGES BEVIDST IKKE TIL SUSPENSION — modsat `stempelkortIPlan()`.
 * Reglen er den samme som for kortene: en manglende betaling lukker
 * dashboardets indsigt, ikke det personalet står og bruger ved disken. En
 * butik i restance skal stadig kunne fjerne en medarbejder, der er stoppet.
 */
export async function medarbejdereIPlan(companyId: string): Promise<boolean> {
  const data = await hentAbonnementsfelter(companyId);
  return data ? hasLoyaltyAccess(data.product_slug) : false;
}

/**
 * Felterne, begge spørgsmål regnes ud fra. Ét opslag, så de to ikke kan
 * komme til at læse hver sin kolonne.
 */
async function hentAbonnementsfelter(companyId: string) {
  const { data } = await createAdminClient()
    .from("companies")
    .select(
      "product_slug, stripe_subscription_id, stripe_status, suspenderet_siden, ophoert_den, sletning_udfoeres_den",
    )
    .eq("id", companyId)
    .maybeSingle();
  return data;
}
