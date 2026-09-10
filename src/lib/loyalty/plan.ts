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
  const { data } = await createAdminClient()
    .from("companies")
    .select(
      "product_slug, stripe_subscription_id, stripe_status, suspenderet_siden, ophoert_den, sletning_udfoeres_den",
    )
    .eq("id", companyId)
    .maybeSingle();

  if (!data) return false;
  if (abonnementTilstand(data) !== "aktiv") return false;
  return hasLoyaltyAccess(data.product_slug);
}
