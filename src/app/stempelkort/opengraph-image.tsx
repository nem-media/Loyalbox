import { ImageResponse } from "next/og";
import { OG_STOERRELSE, OG_TYPE, ogKort, ogSkrifter } from "@/lib/og-kort";

/**
 * EGEN FIL, FORDI SIDEN SÆTTER `openGraph` SELV.
 *
 * `/stempelkort` giver sit OG-opslag en skarpere titel end sidens `<title>`,
 * og dét slår rodens `opengraph-image` fra — målt 2026-09-17 var den og
 * `/reviewstander` de eneste to sider uden delebillede, efter at roden
 * ellers dækkede alt. At de to er netop de vigtigste kommercielle sider gør
 * det værd at have filen.
 *
 * Overskriften er sidens EGEN H1, sat sammen til én linje. Underlinjen er
 * sidens eyebrow. Intet nyt loves.
 */

export const alt = "Digitalt stempelkort til virksomheder — LoyalSum";
export const size = OG_STOERRELSE;
export const contentType = OG_TYPE;

export default async function Image() {
  return new ImageResponse(
    ogKort({
      overskrift: "Få nye kunder til at blive til faste kunder",
      underlinje: "Digitalt stempelkort — uden app, uden konto for kunden.",
    }),
    { ...size, fonts: await ogSkrifter() },
  );
}
