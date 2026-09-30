import type { NextRequest } from "next/server";
import { signeret } from "@/lib/commerce-api/route";
import { fejlSvar, okSvar } from "@/lib/commerce-api/errors";
import { frigiv } from "@/lib/commerce-api/beloenninger";

/**
 * POST /api/v1/commerce/rewards/release — kontraktens `releaseReward`. Idempotent.
 * Se `frigiv()` i src/lib/commerce-api/beloenninger.ts og migration 0049.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  return signeret(
    req,
    "rewards.release",
    async ({ integration, krop }) => {
      const r = await frigiv(integration, krop);
      if (!r.ok) return { svar: fejlSvar(r.kode, r.besked, { details: r.detaljer }) };
      return { svar: okSvar(r.krop, r.http) };
    },
    { laesKrop: true },
  );
}
