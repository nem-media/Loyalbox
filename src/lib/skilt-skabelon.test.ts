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

/**
 * De to felter i skivefarven: logofeltet øverst og NFC-feltet nede ved
 * QR-koden. Begge er rene rektangler under en afrundet klippemaske, så
 * tallene kan læses direkte.
 */
function skiveFelter(s: string) {
  const fundne = [
    ...s.matchAll(
      /matrix\(1, 0, 0, 1, (\d+), (\d+)\)">(?:<g[^>]*>)*<path fill="\{\{SKIVE\}\}" d="M ([\d.]+) ([\d.]+) L ([\d.]+) [\d.]+ L [\d.]+ ([\d.]+)/g,
    ),
  ].map((m) => {
    const [tx, ty, x0, y0, x1, y1] = m.slice(1).map(Number);
    return { x: tx + x0, y: ty + y0, bredde: x1 - x0, hoejde: y1 - y0 };
  });
  if (fundne.length !== 2) {
    throw new Error(`fandt ${fundne.length} felter i skivefarven, forventede 2`);
  }
  fundne.sort((a, b) => a.y - b.y);
  return { logo: fundne[0], nfc: fundne[1] };
}

/** QR-pladsholderens gruppe. Selve tegningen er kurver, men gruppen har et hjørne. */
function qrGruppe(s: string) {
  const m = s.match(/transform="matrix\(1, 0, 0, 1, (195), (\d+)\)"/);
  if (!m) throw new Error("QR-gruppen findes ikke i skabelonen");
  return { x: +m[1], y: +m[2] };
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
   * DEN VIGTIGSTE PRØVE I FILEN — og den prøver BEGGE skabeloner mod det
   * SAMME ene sæt tal. To ting fanges derfor på én gang: at designet er
   * flyttet i Canva uden at målene fulgte med, og at de to filer er drevet fra
   * hinanden. Begge dele er sket.
   */
  it.each(VARIANTER)("finder logofeltet, hvor MAAL siger (%s)", (v) => {
    const s = SKABELONER[v];
    const felt = skiveFelter(s).logo;
    const y0 = udsnit(s).y;
    expect(felt.x).toBeCloseTo(MAAL.logo.x, 4);
    // MAAL regnes fra udsnittets øverste kant, skabelonen fra sit eget nul.
    expect(felt.y - y0).toBeCloseTo(MAAL.logo.y, 4);
    expect(felt.bredde).toBeCloseTo(MAAL.logo.bredde, 4);
    expect(felt.hoejde).toBeCloseTo(MAAL.logo.hoejde, 4);
  });

  it.each(VARIANTER)("finder NFC-feltet, hvor MAAL siger (%s)", (v) => {
    const s = SKABELONER[v];
    const felt = skiveFelter(s).nfc;
    const y0 = udsnit(s).y;
    expect(felt.x).toBeCloseTo(MAAL.nfc.x, 4);
    expect(felt.y - y0).toBeCloseTo(MAAL.nfc.y, 4);
    expect(felt.bredde).toBeCloseTo(MAAL.nfc.bredde, 4);
    expect(felt.hoejde).toBeCloseTo(MAAL.nfc.hoejde, 4);
  });

  /**
   * QR-pladsholderen er kurver og har ingen ramme at læse af. Gruppens hjørne
   * kan læses, og feltet skal ligge lige inden for det — under en enhed er den
   * luft, Canva lægger mellem gruppen og tegningen. Går de fra hinanden, er
   * pladsholderen flyttet.
   */
  it.each(VARIANTER)("finder QR-feltet ved sin gruppe (%s)", (v) => {
    const s = SKABELONER[v];
    const g = qrGruppe(s);
    const y0 = udsnit(s).y;
    for (const afstand of [MAAL.qr.x - g.x, MAAL.qr.y - (g.y - y0)]) {
      expect(afstand).toBeGreaterThanOrEqual(0);
      expect(afstand).toBeLessThan(1.5);
    }
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
