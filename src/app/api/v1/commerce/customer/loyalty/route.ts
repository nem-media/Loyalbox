import type { NextRequest } from "next/server";
import { signeret } from "@/lib/commerce-api/route";
import { fejlSvar, okSvar } from "@/lib/commerce-api/errors";
import { hentBekraeftetKobling, kundensLoyalitet } from "@/lib/commerce-api/beloenninger";

/**
 * GET /api/v1/commerce/customer/loyalty?loyalsum_customer_ref=… —
 * kontraktens `customerLoyalty`. Kun for en BEKRÆFTET kobling i denne butik.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return signeret(req, "customer.loyalty", async ({ integration, url }) => {
    const link = await hentBekraeftetKobling(integration, url.searchParams.get("loyalsum_customer_ref"));
    if (!link) return { svar: fejlSvar("customer_not_linked", "Kunden er ikke koblet til LoyalSum i denne butik.") };
    return { svar: okSvar(await kundensLoyalitet(integration, link)) };
  });
}
