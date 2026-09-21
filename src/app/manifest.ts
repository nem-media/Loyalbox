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
    background_color: "#eff5f7",
    theme_color: "#08303c",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      /*
        MASKABLE HAR SIN EGEN FIL, OG DET ER IKKE PYNT.
        En maskable-ikon er et LØFTE til styresystemet om, at hele fladen er
        dækket: launcheren beskærer til sin egen form og fylder selv resten
        ud. Her delte den fil med "any" — en GENNEMSIGTIG stjerne, der gik
        helt ud til kanten — så Android lagde SORT bag mærket og klippede
        spidserne af. Filerne laves af `scripts/lav-app-ikoner.mjs`, hvor
        den ene fylder 64 % og den anden 52 %, fordi kun de inderste 80 %
        er sikre.
      */
      {
        src: "/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
