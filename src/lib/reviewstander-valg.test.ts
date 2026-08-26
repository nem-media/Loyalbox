import { describe, it, expect } from "vitest";
import { PLATFORM_VALG, prisTekst } from "./reviewstander-valg";
import { KATALOG, PRODUCTS, getProduct } from "./constants";

/**
 * Sammenligningen på /reviewstander skal beskrive DE VARER, VI FAKTISK SÆLGER.
 *
 * Sektionen listede før "Skilt uden konto", "Reviewstander" og "Reviewstander
 * Pro". To af de tre navne fandtes ikke i kataloget, og LoyalSum Komplet —
 * den dyreste vare og den eneste med stempelkort — manglede helt. En kunde,
 * der læste sammenligningen, fik altså ikke det produkt at se, vi helst vil
 * sælge.
 *
 * Navnene og priserne slås nu op i PRODUCTS og skrives ikke af, så DE kan
 * ikke drive. Det testene her fanger, er det, opslaget ikke kan: at listen
 * peger på en vare, der er fjernet, eller at en ny vare kommer i kataloget
 * uden at komme med i sammenligningen.
 */

describe("PLATFORM_VALG", () => {
  it("peger kun på varer, der findes", () => {
    for (const v of PLATFORM_VALG) {
      expect(getProduct(v.slug), `ukendt slug: ${v.slug}`).toBeDefined();
    }
  });

  /**
   * DEN VIGTIGSTE. Tilføjes en fjerde offentlig vare, skal den enten med i
   * sammenligningen eller bevidst udelades — og det valg skal træffes her,
   * ikke opdages af en kunde, der undrer sig over, hvorfor den ikke står der.
   */
  it("dækker hele det offentlige katalog", () => {
    const iSammenligningen = PLATFORM_VALG.map((v) => v.slug).sort();
    const iKataloget = KATALOG.map((p) => p.slug).sort();
    expect(iSammenligningen).toEqual(iKataloget);
  });

  it("holder tilkøb ude — de har ingen egen side at sammenligne", () => {
    for (const v of PLATFORM_VALG) {
      expect(getProduct(v.slug)?.addon).toBeFalsy();
    }
  });

  it("har præcis én fremhævet vare", () => {
    const fremhaevede = PLATFORM_VALG.filter(
      (v) => getProduct(v.slug)?.featured,
    );
    expect(fremhaevede).toHaveLength(1);
  });

  it("har korte nok celler til at kunne skimmes i tabellen", () => {
    for (const v of PLATFORM_VALG) {
      expect(v.kundenSer.length, v.slug).toBeLessThanOrEqual(45);
      expect(v.skifte.length, v.slug).toBeLessThanOrEqual(45);
    }
  });
});

describe("prisTekst", () => {
  it("viser engangsprisen alene, når der ikke er abonnement", () => {
    const vare = PRODUCTS.find((p) => !p.monthlyPrice && !p.addon)!;
    expect(prisTekst(vare.slug)).not.toContain("/md.");
  });

  it("viser både engangspris og månedspris ved abonnement", () => {
    const vare = PRODUCTS.find((p) => p.monthlyPrice)!;
    const tekst = prisTekst(vare.slug);
    expect(tekst).toContain("/md.");
    // Begge tal skal med — en pris, der kun viser det ene, ser billigere ud,
    // end den er, og dét er en prisoplysning, ikke en designdetalje.
    expect(tekst).toContain(String(vare.price));
    expect(tekst).toContain(String(vare.monthlyPrice));
  });

  it("svarer tomt på en ukendt vare frem for at gætte", () => {
    expect(prisTekst("findes-ikke")).toBe("");
  });
});
