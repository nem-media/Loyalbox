import type { NextRequest } from "next/server";
import { parButik } from "@/lib/commerce-api/pairing";
import { fejlSvar, okSvar } from "@/lib/commerce-api/errors";
import { commerceLog } from "@/lib/commerce-api/log";

/**
 * POST /api/v1/commerce/integrations/pair — kontraktens `pairIntegration`.
 *
 * Det ENESTE kald uden signatur: der findes ingen nøgle endnu. Engangskoden
 * fra dashboardet er autorisationen; se `src/lib/commerce-api/pairing.ts`.
 * Svaret bærer nøglen ÉN gang og må aldrig caches.
 */
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const start = Date.now();
  try {
    let krop: unknown;
    try {
      krop = await req.json();
    } catch {
      return fejlSvar("invalid_request", "Kroppen er ikke gyldig JSON.");
    }
    const r = await parButik(krop);
    if (!r.ok) {
      commerceLog({ operation: "pair", result: "error", error_code: r.kode, duration_ms: Date.now() - start });
      return fejlSvar(r.kode, r.besked, { details: r.detaljer });
    }
    commerceLog({
      operation: "pair",
      result: "ok",
      integration_id: r.krop.integration_id,
      status: 201,
      duration_ms: Date.now() - start,
    });
    return okSvar(r.krop, 201);
  } catch (e) {
    console.error("[commerce-api] pair fejlede:", (e as Error).message);
    commerceLog({ operation: "pair", result: "error", error_code: "internal_error", status: 500 });
    return fejlSvar("internal_error", "Der skete en fejl hos LoyalSum. Prøv igen.");
  }
}
