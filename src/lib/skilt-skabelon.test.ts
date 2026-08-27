import { describe, it, expect } from "vitest";
import { SKABELON_SORT } from "./print/skabelon-sort";
import { SKABELON_HVID } from "./print/skabelon-hvid";
import { MAAL, SKILT_BREDDE, SKILT_HOEJDE, type Variant } from "./skilt-format";

/**
 * MÅLENE MOD SKABELONEN.
 *
 * HULLET DEN 27. AUGUST. Designet blev rykket i Canva og eksporteret på ny.
 * Generatoren kørte igennem uden at kny — farverne var jo uændrede — og
 * skabelonerne blev opdateret, mens hvert eneste tal i `MAAL` blev stående og
 * pegede på de gamle positioner. QR-koden ville være tegnet 18 enheder fra
 * pladsholderen, og logoets dækflade ville have været 5 enheder for høj.
 * Ingen test i huset ville have opdaget det: farvetællingen passede.
 *
 * DERFOR REGNES TALLENE HER UD AF SKABELONEN IGEN, af selve den streng, der
 * bliver trykt. Er de to uenige, er filen skiftet uden at målene fulgte med,
 * og en kunde ville stå med et skilt, hvor koden sad ved siden af feltet.
 *
 * Prøven læser skabelonen som TEKST og ikke som et dokument. Der er ingen
 * SVG-fortolker i testmiljøet, og en fuld fortolkning ville kræve et
 * afhængighedstræ for at kontrollere fire tal. Ankrene er præcise nok: de er
 * de samme, `lav-print-skabelon.mjs` afviser en kørsel på.
 */

const SKABELONER: Record<Variant, string> = {
  sort: SKABELON_SORT,
  hvid: SKABELON_HVID,
};
const VARIANTER: Variant[] = ["sort", "hvid"];

/** Udsnittet, generatoren har skåret ind til standeren. */
function udsnit(s: string) {
  const m = s.match(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/);
  if (!m) throw new Error("ingen viewBox i skabelonen");
  return { x: +m[1], y: +m[2], bredde: +m[3], hoejde: +m[4] };
}

/** Logofeltets flade: en gruppe med et rent rektangel i skivefarven. */
function logofelt(s: string) {
  const m = s.match(
    /matrix\(1, 0, 0, 1, (\d+), (\d+)\)">(?:<g[^>]*>)*<path fill="\{\{SKIVE\}\}" d="M ([\d.]+) ([\d.]+) L ([\d.]+) \4 L \5 ([\d.]+)/,
  );
  if (!m) throw new Error("logofeltet findes ikke i skabelonen");
  const [tx, ty, x0, y0, x1, y1] = m.slice(1).map(Number);
  return { x: tx + x0, y: ty + y0, bredde: x1 - x0, hoejde: y1 - y0 };
}

/** NFC-cirklen: en kurve, der begynder i toppen og går gennem højre yderpunkt. */
function nfcCirkel(s: string) {
  const m = s.match(
    /<path fill="\{\{SKIVE\}\}" d="M ([\d.]+) ([\d.]+) C [\d.]+ [\d.]+ ([\d.]+) [\d.]+ ([\d.]+) ([\d.]+)/,
  );
  if (!m) throw new Error("NFC-cirklen findes ikke i skabelonen");
  const [cx, , , hoejre, cy] = m.slice(1).map(Number);
  return { cx, cy, r: hoejre - cx };
}

/** QR-pladsholderens gruppe. Selve tegningen er kurver, men gruppen har et hjørne. */
function qrGruppe(s: string) {
  const m = s.match(/transform="matrix\(1, 0, 0, 1, 190, (\d+)\)"/);
  if (!m) throw new Error("QR-gruppen findes ikke i skabelonen");
  return { x: 190, y: +m[1] };
}

describe("skabelonens udsnit", () => {
  /**
   * Canva lægger et par enheders tomt lærred under designet. Generatoren
   * skærer det væk, så previewets silhuet følger skiltets kant i stedet for
   * at stå med en gennemsigtig stribe under.
   */
  it.each(VARIANTER)("er skåret ind til standeren (%s)", (v) => {
    const u = udsnit(SKABELONER[v]);
    expect(u.bredde).toBeCloseTo(SKILT_BREDDE, 4);
    expect(u.hoejde).toBeCloseTo(SKILT_HOEJDE, 1);
    expect(u.x).toBe(0);
  });
});

describe("MAAL mod skabelonen", () => {
  /**
   * DEN VIGTIGSTE PRØVE I FILEN. Logofeltets tal regnes ud af skabelonens
   * egen sti og sammenlignes med `MAAL`. Flytter feltet sig i Canva, uden at
   * tallene følger med, fejler den her — ikke hos en kunde.
   */
  it.each(VARIANTER)("finder logofeltet, hvor MAAL siger (%s)", (v) => {
    const s = SKABELONER[v];
    const felt = logofelt(s);
    const y0 = udsnit(s).y;
    expect(felt.x).toBeCloseTo(MAAL[v].logo.x, 4);
    // MAAL regnes fra udsnittets øverste kant, skabelonen fra sit eget nul.
    expect(felt.y - y0).toBeCloseTo(MAAL[v].logo.y, 4);
    expect(felt.bredde).toBeCloseTo(MAAL[v].logo.bredde, 4);
    expect(felt.hoejde).toBeCloseTo(MAAL[v].logo.hoejde, 4);
  });

  it.each(VARIANTER)("finder NFC-cirklen, hvor MAAL siger (%s)", (v) => {
    const s = SKABELONER[v];
    const c = nfcCirkel(s);
    const y0 = udsnit(s).y;
    expect(c.cx).toBeCloseTo(MAAL[v].nfc.cx, 4);
    expect(c.cy - y0).toBeCloseTo(MAAL[v].nfc.cy, 4);
    expect(c.r).toBeCloseTo(MAAL[v].nfc.r, 4);
  });

  /**
   * QR-pladsholderen er kurver og har ingen ramme at læse af. Gruppens hjørne
   * kan læses, og feltet skal ligge lige inden for det — halvanden enhed er
   * den luft, Canva lægger mellem gruppen og tegningen. Går de fra hinanden,
   * er pladsholderen flyttet.
   */
  it.each(VARIANTER)("finder QR-feltet ved sin gruppe (%s)", (v) => {
    const s = SKABELONER[v];
    const g = qrGruppe(s);
    const y0 = udsnit(s).y;
    expect(MAAL[v].qr.x - g.x).toBeGreaterThanOrEqual(0);
    expect(MAAL[v].qr.x - g.x).toBeLessThan(1.5);
    expect(MAAL[v].qr.y - (g.y - y0)).toBeGreaterThanOrEqual(0);
    expect(MAAL[v].qr.y - (g.y - y0)).toBeLessThan(1.5);
  });
});

describe("skabelonens farver", () => {
  /** Uden pladsholdere bliver skiltet tegnet i skabelonens egne farver. */
  it.each(VARIANTER)("har alle fire pladsholdere (%s)", (v) => {
    for (const p of ["{{BG}}", "{{ACCENT}}", "{{SKIVE}}", "{{RING}}"]) {
      expect(SKABELONER[v], p).toContain(p);
    }
  });

  /**
   * Canvas grå bagplade må ALDRIG trykkes med — den er en skærmbaggrund, ikke
   * en del af skiltet, og uden for standerens hjørner skal filen være
   * gennemsigtig, for det er dér, trykkeriet skærer.
   */
  it.each(VARIANTER)("har ingen grå bagplade tilbage (%s)", (v) => {
    expect(SKABELONER[v]).not.toContain("#b4b4b4");
  });

  /**
   * Accenten skal være helt væk som literal. Bliver ét sted stående, får
   * kunden en stjerne i LoyalSums turkis midt i sin egen farve.
   */
  it.each(VARIANTER)("har ingen rå accentfarve tilbage (%s)", (v) => {
    expect(SKABELONER[v].toLowerCase()).not.toContain("#4ea4ad");
  });
});
