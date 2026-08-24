import type { MetadataRoute } from "next";
import { SITE_NAME } from "@/lib/constants";

/**
 * Web-app-manifest. Gør at kunden kan lægge sit stempelkort på hjemmeskærmen og
 * åbne det uden browserlinje — der er ingen app at installere, det er stadig
 * bare hjemmesiden.
 *
 * `start_url: "/mine-kort"` er med vilje: har kunden en konto, lander de
 * direkte på deres kort; er de ikke logget ind, sender middleware dem til login.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: `${SITE_NAME} — mine stempelkort`,
    short_name: SITE_NAME.replace(".dk", ""),
    description:
      "Dine digitale stempelkort fra dine lokale butikker — samlet ét sted, uden app.",
    lang: "da",
    start_url: "/mine-kort",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4ee",
    theme_color: "#2c324e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
