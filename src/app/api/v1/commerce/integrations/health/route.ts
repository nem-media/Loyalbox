import type { NextRequest } from "next/server";
import { signeret } from "@/lib/commerce-api/route";
import { okSvar } from "@/lib/commerce-api/errors";
import { CONTRACT_VERSIONS } from "@/lib/commerce-api/contract";
import { API_VERSION } from "@/lib/commerce-api/auth";

/**
 * GET /api/v1/commerce/integrations/health — kontraktens `integrationHealth`.
 *
 * Svarer også, når abonnementet er faldet bort (`entitlement: "missing"`), så
 * pluginet kan sige det til butiksejeren i stedet for bare at fejle. Ingen
 * nøgle, ingen kundedata.
 */
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  return signeret(
    req,
    "health",
    async ({ integration, harAdgang }) => ({
      svar: okSvar({
        status: integration.status,
        integration_id: integration.id,
        contract_versions: [...CONTRACT_VERSIONS],
        server_time: new Date().toISOString().replace(/\.\d{3}Z$/, "Z"),
        api_version: API_VERSION,
        entitlement: harAdgang ? "active" : "missing",
      }),
    }),
    { kraevAdgang: false },
  );
}
