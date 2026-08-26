import "server-only";
import { SKABELON_SORT } from "./print/skabelon-sort";
import { SKABELON_HVID } from "./print/skabelon-hvid";
import { normaliserHex } from "./stander-tilvalg";
import {
  RING,
  SKIVE_R,
  SKIVE_FARVE,
  LOGO_SIDE,
  skabelonTil,
  kontrast,
} from "./skilt-format";

/**
 * Skiltet, som det bliver trykt — og som det vises i bestillingen.
 *
 * ÉN KILDE. Previewet i designeren og trykfilen kommer fra den SAMME funktion,
 * så de ikke kan komme til at vise hver sit. Alternativet — en let, hjemmelavet
 * gengivelse i previewet — var hurtigere, men så ville kunden godkende ét
 * skilt og få et andet, og det opdages først på en disk.
 *
 * Skabelonerne er Canva-eksporter, hvor al tekst er lavet om til kurver. Der
 * er hverken <text> eller <circle> at rette i; kun farverne står som
 * literaler, og det er dem, der kan skiftes. Se scripts/lav-print-skabelon.mjs.
 */

export {
  SKILT_BREDDE,
  SKILT_HOEJDE,
  lyshed,
  kontrast,
  skabelonTil,
} from "./skilt-format";

export interface SkiltValg {
  /** Baggrundsfarven. Standerens farve, eller kundens egen mod betaling. */
  baggrund: string;
  /** Farven på stjerner, ring og "Scan eller tap". Frit valg, uden beregning. */
  accent: string;
  /**
   * Kundens logo som en `data:`-URI.
   *
   * IKKE EN ADRESSE, og det er ikke til pynt: en SVG, der indlæses gennem et
   * <img>, er et sandkasse-dokument uden adgang til netværket. Et <image
   * href="https://…"> blev derfor tegnet som et brudt ikon — set i browseren.
   * Bagt ind virker filen både i previewet, i trykken og i en PDF, uden at
   * afhænge af, at et lager svarer.
   */
  logoDataUri?: string | null;
}

/**
 * Bygger skiltet som en SVG-streng.
 *
 * LOGOET LÆGGES IND SOM <image> MED preserveAspectRatio="xMidYMid meet", så
 * det aldrig strækkes. Der maskeres ikke: har logoet en hvid baggrund, ses
 * den — præcis som den bliver trykt. Skjulte vi den, ville kunden først
 * opdage det på skiltet, og et skilt kan ikke kaldes tilbage.
 */
export function byggSkilt(valg: SkiltValg): string {
  const baggrund = normaliserHex(valg.baggrund) ?? "#111111";
  const accent = normaliserHex(valg.accent) ?? "#4ea4ad";

  const variant = skabelonTil(baggrund);
  const skabelon = variant === "sort" ? SKABELON_SORT : SKABELON_HVID;

  let svg = skabelon
    .replaceAll("{{BG}}", baggrund)
    .replaceAll("{{ACCENT}}", accent);

  if (valg.logoDataUri) {
    const x = RING.cx - LOGO_SIDE / 2;
    const y = RING.cy - LOGO_SIDE / 2;
    const lag =
      `<circle cx="${RING.cx}" cy="${RING.cy}" r="${SKIVE_R}" fill="${SKIVE_FARVE[variant]}"/>` +
      `<image href="${escapeXml(valg.logoDataUri)}" x="${x}" y="${y}" ` +
      `width="${LOGO_SIDE}" height="${LOGO_SIDE}" preserveAspectRatio="xMidYMid meet"/>`;
    // Sidst i dokumentet, så laget ligger ØVERST. En <image> tidligere i
    // filen ville forsvinde under skabelonens egne flader.
    svg = svg.replace("</svg>", `${lag}</svg>`);
  }

  return svg;
}

/**
 * `&` og `"` i en URL ville lukke attributten og ødelægge dokumentet.
 * Supabase-adresser indeholder begge dele i deres query.
 */
function escapeXml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/** Advarsler, kunden skal se FØR skiltet går i trykken — ikke bagefter. */
export function skiltAdvarsler(valg: SkiltValg): string[] {
  const ud: string[] = [];
  const baggrund = normaliserHex(valg.baggrund) ?? "#111111";
  const accent = normaliserHex(valg.accent) ?? "#4ea4ad";

  /*
   * 3:1 er WCAG's grænse for grafik, der skal kunne ses. Under den forsvinder
   * stjernerne og "Scan eller tap" i baggrunden — og et trykt skilt kan ikke
   * rettes bagefter. Der ADVARES og spærres ikke: det er kundens skilt, og de
   * kan have en grund, vi ikke kender.
   */
  if (kontrast(accent, baggrund) < 3) {
    ud.push(
      "Din farve ligger tæt på baggrunden. Stjernerne og teksten “Scan eller tap” bliver svære at se på det trykte skilt.",
    );
  }

  return ud;
}
