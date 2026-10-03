/**
 * Download af WooCommerce-pluginet — kun for LoyalSum Komplet og Komplet Online.
 *
 * ADGANGEN AFGØRES HER, PÅ SERVEREN, HVER GANG:
 *   1. en indlogget bruger (ellers 401),
 *   2. virksomhedens EJER — samme regel som parringen (ellers 403 owner_only),
 *   3. `kanHenteWooCommercePlugin()` = `commerceIPlan()` (ellers 403
 *      woocommerce_plugin_not_in_plan).
 * Virksomheden er den, sessionen giver (`getCompanyAccess()`). Ruten læser
 * ingen parametre, så en anden virksomheds id i URL'en ændrer intet.
 *
 * FILEN LIGGER I EN PRIVAT SPAND (`loyalsum-releases`, migration 0050) uden
 * policies, så kun service-role kan læse den. Ruten henter den selv og sender
 * bytene videre — der udleveres ingen URL, heller ikke en signeret. Filen
 * udleveres kun, hvis dens sha256 er præcis den i `release.ts`.
 */
import { createHash } from "node:crypto";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { kanHenteWooCommercePlugin } from "@/lib/woocommerce-plugin/adgang";
import {
  WOOCOMMERCE_PLUGIN,
  WOOCOMMERCE_PLUGIN_SPAND,
  woocommercePluginSti,
} from "@/lib/woocommerce-plugin/release";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function fejl(status: number, error: string, message: string): Response {
  return Response.json(
    { error, message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

export async function GET(): Promise<Response> {
  const access = await getCompanyAccess();
  if (!access) return fejl(401, "unauthenticated", "Log ind for at hente pluginet.");
  if (access.role !== "owner") {
    return fejl(403, "owner_only", "Kun ejeren kan hente WooCommerce-pluginet.");
  }
  if (!(await kanHenteWooCommercePlugin(access.companyId))) {
    return fejl(
      403,
      "woocommerce_plugin_not_in_plan",
      "WooCommerce-integrationen er inkluderet i LoyalSum Komplet og LoyalSum Komplet Online.",
    );
  }

  const { data, error } = await createAdminClient()
    .storage.from(WOOCOMMERCE_PLUGIN_SPAND)
    .download(woocommercePluginSti());
  if (error || !data) {
    return fejl(503, "plugin_unavailable", "Pluginet kan ikke hentes lige nu. Prøv igen senere.");
  }

  const bytes = new Uint8Array(await data.arrayBuffer());
  const sha = createHash("sha256").update(bytes).digest("hex");
  if (sha !== WOOCOMMERCE_PLUGIN.sha256) {
    // Hellere ingen fil end en anden fil end den, der er udgivet.
    return fejl(503, "plugin_unavailable", "Pluginet kan ikke hentes lige nu. Prøv igen senere.");
  }

  return new Response(bytes, {
    status: 200,
    headers: {
      "Content-Type": "application/zip",
      "Content-Length": String(bytes.byteLength),
      "Content-Disposition": `attachment; filename="${WOOCOMMERCE_PLUGIN.filnavn}"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
