import { ImageResponse } from "next/og";
import { OG_STOERRELSE, OG_TYPE, ogKort, ogSkrifter } from "@/lib/og-kort";

/**
 * EGEN FIL — samme grund som på `/stempelkort`: siden sætter `openGraph`
 * selv, og det slår rodens delebillede fra. Se `og-kort.tsx`.
 *
 * Overskriften er sidens egen H1; underlinjen siger, hvad standeren gør, med
 * sidens egne ord.
 */

export const alt = "Reviewstander med NFC og QR — LoyalSum";
export const size = OG_STOERRELSE;
export const contentType = OG_TYPE;

export default async function Image() {
  return new ImageResponse(
    ogKort({
      overskrift: "Få flere anmeldelser med en reviewstander",
      underlinje: "Kunden scanner QR-koden eller holder mobilen hen til den.",
    }),
    { ...size, fonts: await ogSkrifter() },
  );
}
