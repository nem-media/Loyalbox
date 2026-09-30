import type { NextRequest } from "next/server";
import { signeret } from "@/lib/commerce-api/route";
import { fejlSvar, okSvar } from "@/lib/commerce-api/errors";
import { synkroniserOrdre } from "@/lib/commerce-api/sync";
import { synkAfhaengigheder } from "@/lib/commerce-api/service";

/**
 * POST /api/v1/commerce/orders/sync — kontraktens `syncOrder`.
 *
 * Ordrens NUVÆRENDE tilstand ind; LoyalSum regner eligible spend, target og
 * delta. 200 med `applied`/`unchanged`, 202 med `deferred`, 422 hvis ordren
 * ikke følger kontrakten eller ikke går op. Se `src/lib/commerce-api/sync.ts`.
 */
export const dynamic = "force-dynamic";

function eksterntOrdreId(krop: unknown): string | null {
  const id = (krop as { order?: { external_order_id?: unknown } } | null)?.order?.external_order_id;
  return typeof id === "string" ? id.slice(0, 255) : null;
}

export async function POST(req: NextRequest) {
  return signeret(
    req,
    "orders.sync",
    async ({ integration, krop, requestId }) => {
      const eksternId = eksterntOrdreId(krop);
      const r = await synkroniserOrdre(integration, krop, requestId, synkAfhaengigheder());
      if (!r.ok) {
        return { svar: fejlSvar(r.kode, r.besked, { details: r.detaljer }), externalOrderId: eksternId };
      }
      return { svar: okSvar(r.krop, r.http), externalOrderId: eksternId, syncStatus: r.krop.status };
    },
    { laesKrop: true },
  );
}
