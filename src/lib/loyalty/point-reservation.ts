import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { noterFejl } from "@/lib/drift";

type Admin = ReturnType<typeof createAdminClient>;

/**
 * Point holdt af til en webshopkurv, pr. program, for ét medlem.
 *
 * Tallet kommer fra basen (`point_reserverede_for_medlem`) — den samme
 * definition, som disken og webshoppen afgør forbrug efter. Findes
 * funktionen ikke endnu (migrationer køres i hånden, og koden kan stå i drift
 * før 0049), er svaret tomt: uden webshoptabellerne kan intet være reserveret.
 */
export async function hentReserveredePoint(
  companyId: string,
  memberId: string,
  admin: Admin = createAdminClient(),
): Promise<Map<string, number>> {
  const { data, error } = await admin.rpc("point_reserverede_for_medlem", {
    p_company: companyId,
    p_member: memberId,
  });
  if (error) {
    if (error.code !== "PGRST202") {
      await noterFejl("pointprogram", `point_reserverede_for_medlem: ${error.message}`);
    }
    return new Map();
  }
  return new Map(Object.entries((data ?? {}) as Record<string, number>).map(([k, v]) => [k, Number(v)]));
}
