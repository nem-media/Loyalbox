import { SITE_NAME } from "./constants";

/**
 * Web-app-manifest for ÉT stempelkort.
 *
 * HVORFOR IKKE BARE DET FÆLLES MANIFEST (src/app/manifest.ts): dets
 * `start_url` er `/mine-kort`, som kræver en konto. Kortet virker uden konto —
 * det er hele pointen med `/kort/<public_token>` — så en kunde uden login, der
 * lagde kortet på hjemmeskærmen, fik et ikon, der åbnede en loginside. De
 * havde trykket på "Læg kortet på min telefon" og fået alt andet end kortet.
 *
 * Her er `start_url` kortets egen adresse, og navnet er BUTIKKENS, så ikonet
 * på hjemmeskærmen hedder det samme som stedet, stemplerne er fra.
 *
 * `scope` er "/" og ikke kortets egen sti med vilje: kortsiden linker til
 * /mine-kort, /opret-konto og /login, og med en snæver scope ville de tre
 * springe ud i browseren midt i et flow. Hvert kort får sit eget `id`, så to
 * installerede kort ikke bliver til det samme ikon.
 *
 * Ligger som en ren funktion og ikke inde i ruten, så den kan prøves uden en
 * database.
 */

/** Plads under et ikon på en hjemmeskærm. Længere navne klipper telefonen selv. */
export const KORT_NAVN_MAKS = 12;

export function kortManifest(token: string, butiksnavn?: string | null) {
  const butik = butiksnavn?.trim() || SITE_NAME;
  const sti = `/kort/${token}`;

  return {
    id: sti,
    name: `Stempelkort hos ${butik}`,
    // Klip selv frem for at lade telefonen gøre det: "Frisør Nielsi…" med en
    // prik, vi selv har sat, ser bedre ud end et navn, der bare stopper.
    short_name:
      butik.length > KORT_NAVN_MAKS
        ? `${butik.slice(0, KORT_NAVN_MAKS - 1).trimEnd()}…`
        : butik,
    description: `Dit stempelkort hos ${butik} — uden app.`,
    lang: "da",
    start_url: sti,
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#f6f4ee",
    theme_color: "#1e1c1a",
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

/** Adressen på et korts eget manifest. Ét sted, så siden og ruten er enige. */
export function kortManifestSti(token: string): string {
  return `/kort/${token}/manifest.webmanifest`;
}
