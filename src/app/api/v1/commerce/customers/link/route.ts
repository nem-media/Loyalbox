import type { NextRequest } from "next/server";
import { signeret } from "@/lib/commerce-api/route";
import { fejlSvar, okSvar } from "@/lib/commerce-api/errors";
import { anmodKobling } from "@/lib/commerce-api/kobling";

/**
 * POST /api/v1/commerce/customers/link — kontraktens `linkCustomer`.
 *
 * POST og ikke GET: e-mailen må aldrig stå i en URL. 200 = koblingen er
 * bekræftet; 202 = kunden har fået et link i sin indbakke.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return signeret(
    req,
    "customers.link",
    async ({ integration, krop }) => {
      const r = await anmodKobling(integration, krop);
      if (!r.ok) return { svar: fejlSvar(r.kode, r.besked, { details: r.detaljer }) };
      return { svar: okSvar(r.krop, r.http) };
    },
    { laesKrop: true },
  );
}
