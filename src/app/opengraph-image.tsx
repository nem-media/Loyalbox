import { ImageResponse } from "next/og";
import { OG_STOERRELSE, OG_TYPE, ogKort, ogSkrifter } from "@/lib/og-kort";

/**
 * SITETS FÆLLES DELEBILLEDE.
 *
 * MÅLT MOD PRODUKTION 2026-09-17: **ni ud af tolv offentlige sider havde
 * intet `og:image`**, og de tre, der havde et, pegede på en **SVG** — som
 * Facebook, LinkedIn og Slack ikke gengiver. I praksis stod hvert delt link
 * som ren tekst.
 *
 * Nexts konvention gør det til én fil: et `opengraph-image` i roden arves af
 * hver rute, der ikke selv sætter et. Teksten er forsidens egen H1 og det
 * første led af `SITE_TAGLINE` — intet nyt loves her.
 */

export const alt = "LoyalSum — anmeldelser, loyalitet og feedback i én platform";
export const size = OG_STOERRELSE;
export const contentType = OG_TYPE;

export default async function Image() {
  return new ImageResponse(
    ogKort({
      overskrift: "Få flere kunder. Få dem til at komme igen.",
      underlinje: "Anmeldelser, loyalitet, feedback og synlighed i én platform.",
    }),
    { ...size, fonts: await ogSkrifter() },
  );
}
