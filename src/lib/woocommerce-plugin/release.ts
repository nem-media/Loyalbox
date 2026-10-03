/**
 * DEN AKTUELLE UDGAVE AF WOOCOMMERCE-PLUGINET — ÉT STED.
 *
 * Dashboardet viser versionen herfra, og downloadruten henter filen herfra og
 * nægter at udlevere den, hvis dens sha256 ikke er præcis den, der står her.
 *
 * NY VERSION (fx 1.0.1):
 *   1. Hent ZIP'en fra GitHub-releasen `woocommerce-vX.Y.Z` i
 *      nem-media/loyalsum-integrations (den officielle, CI-byggede fil) og
 *      tjek dens sha256 mod releasens `.sha256`.
 *   2. Upload den til den PRIVATE spand `loyalsum-releases` på `sti` herunder
 *      (Supabase → Storage). Den gamle fil må gerne blive liggende.
 *   3. Ret de tre felter herunder og deploy.
 * Rækkefølgen betyder, at den nye fil ligger klar, før koden peger på den.
 *
 * Ingen hemmeligheder her: sha256 og stien er ikke adgangskontrol — det er
 * spandens privathed og `kanHenteWooCommercePlugin()` i downloadruten.
 */

export const WOOCOMMERCE_PLUGIN_SPAND = "loyalsum-releases";

export const WOOCOMMERCE_PLUGIN = {
  navn: "LoyalSum for WooCommerce",
  version: "1.0.0",
  filnavn: "loyalsum-for-woocommerce-1.0.0.zip",
  /** Den officielle GitHub-release `woocommerce-v1.0.0` (CI-bygget). */
  sha256: "1519ff90686aa6be04caa89cb01417a841792ebeb979e70ea3e383dfab0c1851",
} as const;

/** Stien i spanden: `woocommerce/<version>/<filnavn>`. */
export function woocommercePluginSti(r: { version: string; filnavn: string } = WOOCOMMERCE_PLUGIN): string {
  return `woocommerce/${r.version}/${r.filnavn}`;
}

/** Ruten, dashboardet linker til. Den selv afgør adgangen. */
export const WOOCOMMERCE_PLUGIN_DOWNLOAD_URL = "/api/integrationer/woocommerce/download";
