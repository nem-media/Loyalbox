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
