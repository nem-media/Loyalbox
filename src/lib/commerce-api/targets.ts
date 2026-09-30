import type { PointEarnModel } from "@/lib/loyalty/point";

/**
 * HVAD SKAL EN WEBSHOPORDRE HAVE GIVET? — programmets EKSISTERENDE regler.
 *
 * Der findes ingen webshopregler. Et pointprogram, der siger "1 point pr. 10
 * kr.", giver 1 point pr. 10 kr. — ved disken og i webshoppen — og runder NED
 * præcis som `beregnPoint()` (src/lib/loyalty/point.ts): 249 kr. er 24 point.
 *
 * FORSKELLEN ER KUN ENHEDEN. `beregnPoint()` får et beløb i kroner, fordi det
 * tastes ved disken; her kommer beløbet i ØRE fra kontrakten. Divideres der
 * med 100 først, kan en float ramme ved siden af (0,3 / 0,1 = 2,9999…), så
 * udregningen laves i heltal: `floor(øre / optjeningsværdi_i_øre)`. Samme
 * regel, ingen afrundingsfejl. `point-target.test.ts` holder de to enige.
 *
 * `earn_value` er gemt som numeric(10,2) i kroner. Kun valutaer med to
 * decimaler giver mening her — se `UNDERSTOETTEDE_VALUTAER`.
 */

/** Kroner med højst to decimaler → øre, uden float-støj. */
export function kronerTilOere(kroner: number | string): number {
  const s = typeof kroner === "number" ? kroner.toFixed(2) : kroner.trim();
  const m = /^(\d+)(?:\.(\d{1,2}))?$/.exec(s);
  if (!m) return 0;
  return Number(m[1]) * 100 + Number((m[2] ?? "0").padEnd(2, "0"));
}

export interface PointProgramRegel {
  earn_model: PointEarnModel;
  earn_value: number | string;
}

/**
 * Point for en ordre med dette grundlag.
 *
 * - `per_amount`: 1 point pr. `earn_value` kr. af eligible spend, rundet ned.
 * - `per_visit`: `earn_value` point pr. kvalificerende ordre (et køb er et
 *   besøg) — men kun hvis der er noget tilbage efter refunderinger.
 * - `manual`: 0. Point tastes af personalet og kan ikke udledes af en ordre.
 */
export function pointTarget(
  regel: PointProgramRegel,
  eligibleMinor: number,
  kvalificeret: boolean,
): number {
  if (!kvalificeret || eligibleMinor <= 0) return 0;
  const vaerdiOere = kronerTilOere(regel.earn_value);
  if (vaerdiOere <= 0) return 0;

  switch (regel.earn_model) {
    case "per_amount":
      return Math.floor(eligibleMinor / vaerdiOere);
    case "per_visit":
      return Math.floor(vaerdiOere / 100);
    case "manual":
    default:
      return 0;
  }
}

/**
 * Stempler for en ordre: ét pr. kvalificerende, betalt ordre.
 *
 * Et stempel ER et køb i stempelkortets verden, og det er dét, V1 udleder af
 * en webshopordre. Butikken kan sætte et minimum pr. kanal (fx 100 kr.), så en
 * ordre på en enkelt pakke filtre ikke tæller som et helt besøg.
 * Refunderes ordren under minimummet, falder stemplet bort igen.
 */
export function stempelTarget(
  eligibleMinor: number,
  kvalificeret: boolean,
  minimumMinor: number | null,
): number {
  if (!kvalificeret || eligibleMinor <= 0) return 0;
  if (minimumMinor != null && eligibleMinor < minimumMinor) return 0;
  return 1;
}
