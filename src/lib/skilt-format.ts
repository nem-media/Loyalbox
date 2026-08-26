import { normaliserHex } from "./stander-tilvalg";

/**
 * Skiltets mål og geometri — det, både serveren og browseren skal kende.
 *
 * EGEN FIL, fordi `skilt.ts` er `server-only`: den importerer to skabeloner på
 * 167 KB hver, og previewet i bestillingen ville trække dem med ind i
 * browserens bundt bare for at kende en radius.
 */

export const SKILT_BREDDE = 340.5;
export const SKILT_HOEJDE = 541.5;

/**
 * Logocirklen, målt i skabelonen: ringen (#4ea4ad) løber fra x 111→231 og
 * y 6→126. Altså centrum (171, 66) og ydre radius 60.
 */
export const RING = { cx: 171, cy: 66, r: 60 } as const;

/** Skiven inden i ringen. 3 enheder mindre, så stregen ikke bliver ædt. */
export const SKIVE_R = RING.r - 3;

/** Logoets felt inden i skiven. Kvadrat i cirklen. */
export const LOGO_SIDE = Math.round(SKIVE_R * 1.35);

/**
 * Skivens farve — og den følger IKKE baggrunden.
 *
 * Cirklens indre er et selvstændigt element i skabelonen med sin egen fyld:
 * næsten sort i den sorte fil, hvid i den hvide. Den bliver altså stående,
 * også når kunden vælger sin egen baggrund — set i previewet, hvor en
 * bordeaux bund stadig havde en sort cirkel. Brugte skiven baggrundsfarven,
 * ville der komme en bordeaux plet midt i en sort cirkel.
 */
export const SKIVE_FARVE = { sort: "#070707", hvid: "#ffffff" } as const;

/**
 * Relativ lyshed efter WCAG. Bruges til to ting: at vælge skabelon, og at
 * advare når en valgt farve forsvinder i baggrunden.
 */
export function lyshed(hex: string): number {
  const h = normaliserHex(hex) ?? "#000000";
  const kanal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = kanal(parseInt(h.slice(1, 3), 16));
  const g = kanal(parseInt(h.slice(3, 5), 16));
  const b = kanal(parseInt(h.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastforhold mellem to farver, 1–21. */
export function kontrast(a: string, b: string): number {
  const [l1, l2] = [lyshed(a), lyshed(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Hvilken skabelon passer til baggrunden?
 *
 * VALGT PÅ LYSHED OG IKKE PÅ STANDERENS FARVE. Vælger kunden sin egen
 * baggrund, er det den, stregerne og QR-koden skal kunne ses på. Grænsen
 * 0,18 er der, hvor hvid og sort tekst er lige læselige.
 *
 * Det er samtidig dét, der holder QR-koden skanbar: den sorte fil har lyse
 * moduler, den hvide har mørke, og de følger med skabelonen.
 */
export function skabelonTil(baggrund: string): "sort" | "hvid" {
  return lyshed(baggrund) < 0.18 ? "sort" : "hvid";
}

/** Ringens plads i procent af skiltet — til at lægge et logo ovenpå i browseren. */
export const RING_PROCENT = {
  venstre: ((RING.cx - SKIVE_R) / SKILT_BREDDE) * 100,
  top: ((RING.cy - SKIVE_R) / SKILT_HOEJDE) * 100,
  bredde: ((SKIVE_R * 2) / SKILT_BREDDE) * 100,
  hoejde: ((SKIVE_R * 2) / SKILT_HOEJDE) * 100,
  /** Logoets andel af skivens bredde. */
  logoAndel: (LOGO_SIDE / (SKIVE_R * 2)) * 100,
} as const;

/**
 * QR-kodens felt i skabelonen.
 *
 * Målt på klippemasken `fd856c2e98`, som er 116×115 og placeret med
 * `transform="matrix(1, 0, 0, 1, 190, 268)"`. Pladsholderen tegnes inden i
 * netop dette felt, så en rigtig kode i samme felt lander præcis oven på den.
 */
export const QR_FELT = { x: 190, y: 268, side: 115 } as const;

/**
 * Modulernes farve pr. skabelon.
 *
 * BEMÆRK AT DEN SORTE ER INVERTERET: lyse moduler på mørk bund. Det er
 * designets eget valg — pladsholderen ser sådan ud — og telefonkameraer
 * læser inverterede koder. Skal det laves om, er det HER, og så skal
 * baggrunden bag koden også skifte, ellers forsvinder den.
 */
export const QR_MODUL = { sort: "#ffffff", hvid: "#000000" } as const;

/**
 * Trækker modulerne ud af `qrcode`s SVG-svar.
 *
 * EGEN FUNKTION, FORDI DET ER HER, DET GIK GALT. Svaret indeholder TO stier:
 * en hvid baggrundsflade og selve koden — og koden er tegnet med STROKE, ikke
 * fill: åbne, vandrette linjer på halve koordinater (`M0 0.5h7m3 0h1…`) med
 * en stregbredde på 1. Første udgave satte en fyldning på dem, og QR-feltet
 * stod næsten tomt med et par svage konturer. Set i previewet, ikke gættet.
 *
 * Eksporteret for at kunne prøves mod bibliotekets faktiske output, så en
 * opdatering, der ændrer formen på svaret, bliver fanget her og ikke af en
 * kunde med et ubrugeligt skilt.
 */
export function laesQrSvg(raa: string): { d: string; net: number } | null {
  // Sidste sti er koden; den første er baggrunden, vi ikke bruger.
  const sti = raa.match(/<path[^>]*\/>/g)?.pop();
  const d = sti?.match(/d="([^"]+)"/)?.[1];
  const net = Number(raa.match(/viewBox="0 0 (\d+)/)?.[1] ?? 0);
  if (!d || !net || !sti?.includes("stroke=")) return null;
  return { d, net };
}
