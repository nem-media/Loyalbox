import type { NextRequest } from "next/server";
import { signeret } from "@/lib/commerce-api/route";
import { fejlSvar, okSvar } from "@/lib/commerce-api/errors";
import { reserver } from "@/lib/commerce-api/beloenninger";

/**
 * POST /api/v1/commerce/rewards/reserve — kontraktens `reserveReward`. Fejler LUKKET: intet 201, ingen rabat.
 * Se `reserver()` i src/lib/commerce-api/beloenninger.ts og migration 0049.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return signeret(
    req,
    "rewards.reserve",
    async ({ integration, krop }) => {
      const r = await reserver(integration, krop);
      if (!r.ok) return { svar: fejlSvar(r.kode, r.besked, { details: r.detaljer }) };
      return { svar: okSvar(r.krop, r.http) };
    },
    { laesKrop: true },
  );
}
