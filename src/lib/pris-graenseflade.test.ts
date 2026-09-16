import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KATALOG, priceFor, getProduct } from "./constants";

/**
 * PRISEN, KUNDEN SER, SKAL VÆRE DEN, STRIPE OPKRÆVER.
 *
 * Det er den ene grænse, ingen enhedsprøve kan se over: vores side regner ét
 * tal ud, og Stripe opkræver et andet, hvis de to kommer i utakt. Der er ingen
 * fejl, ingen log og ingen alarm — kunden betaler bare noget andet, end der
 * stod.
 *
 * EFTERPRØVET MOD STRIPE 2026-09-16:
 *
 *  - Abonnementernes LIVE-priser (`monthlyPriceId`) står på 99 og 399 kr/md,
 *    altså præcis som kataloget. De BRUGES ved købet.
 *  - Momssatsen i live er 25 %, `exclusive`, Danmark, aktiv — så priserne er
 *    ex moms hele vejen, som teksterne lover.
 *  - Engangsprisen sendes som `price_data` og regnes ud; de gemte
 *    prisobjekter står på 399, mens kataloget og produktsiden står på 499.
 *    Forskellen er harmløs, FORDI objekterne ikke bruges.
 *
 * Prøverne her holder fast i den sidste sætning. Tages `priceId` i brug, er
 * hver stander pludselig 100 kr billigere, end der står på skiltet.
 */

const CHECKOUT = readFileSync(
  join(process.cwd(), "src/app/api/checkout/route.ts"),
  "utf8",
);
const UDEN_KONTO = readFileSync(
  join(process.cwd(), "src/app/bestil/uden-konto/actions.ts"),
  "utf8",
);

/** Kilden uden kommentarer — forklaringerne citerer dét, de handler om. */
const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

describe("engangsbeløbet regnes ud og hentes ikke fra et gemt prisobjekt", () => {
  for (const [navn, kilde] of [
    ["/api/checkout", CHECKOUT],
    ["/bestil/uden-konto", UDEN_KONTO],
  ] as const) {
    it(`${navn} priser standeren med price_data`, () => {
      const kode = udenKommentarer(kilde);
      expect(kode).toContain("price_data");
      expect(kode).toMatch(/unit_amount:\s*Math\.round\(/);
    });

    /**
     * SELVE FÆLDEN. `price: ids.priceId` ser ud som den naturlige måde at gøre
     * det på — og ville opkræve det gemte beløb (399) i stedet for det
     * beregnede (499), uden at noget fejlede.
     */
    it(`${navn} bruger ikke ids.priceId til en linje`, () => {
      const kode = udenKommentarer(kilde);
      expect(kode).not.toMatch(/price:\s*ids\.priceId/);
      expect(kode).not.toMatch(/price:\s*\w*\.?priceId\b/);
    });

    /** Abonnementslinjen SKAL derimod bruge det gemte månedsprisobjekt. */
    it(`${navn} bruger monthlyPriceId til abonnementet`, () => {
      expect(udenKommentarer(kilde)).toMatch(/price:\s*ids\.monthlyPriceId/);
    });
  }
});

describe("katalogets tal er dem, kunden ser", () => {
  /**
   * `priceFor()` skal bygge på `product.price`. Gør den ikke det, kan
   * produktsiden og betalingen sige hver sit — siden viser `product.price`.
   */
  it("enhedsprisen uden rabat og tilvalg er varens egen pris", () => {
    for (const p of KATALOG) {
      const pris = priceFor(p, 1, {});
      expect(pris.standUnit, p.slug).toBe(p.price);
    }
  });

  /**
   * MÅNEDSPRISERNE ER EFTERPRØVET HOS STRIPE i live, og de tal står her.
   * Ændres kataloget uden at prisobjektet hos Stripe ændres med, opkræves den
   * GAMLE pris hver måned — for dén linje bruger et gemt objekt.
   */
  it("månedspriserne er dem, der er bekræftet i Stripe live", () => {
    expect(getProduct("reviewstander-pro")?.monthlyPrice).toBe(99);
    expect(getProduct("loyalsum-komplet")?.monthlyPrice).toBe(399);
  });

  /** Tilkøbet og engangsvarerne deler pris — det er samme fysiske stander. */
  it("alle engangsvarer koster det samme pr. stander", () => {
    const priser = new Set(KATALOG.map((p) => p.price));
    expect(priser.size, `flere standerpriser: ${[...priser]}`).toBe(1);
  });
});
