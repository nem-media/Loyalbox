import { describe, it, expect } from "vitest";
import { PLATFORM_VALG, prisTekst } from "./reviewstander-valg";
import { KATALOG, PRODUCTS, getProduct, harFysiskSkilt } from "./constants";

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
  it("dækker HELE kataloget", () => {
    /*
     * ONLINE VAR FØRST HOLDT UDE, og begrundelsen var, at tabellen svarer på
     * "hvilken stander skal jeg vælge?", så en vare uden skilt ville få en
     * række med fire tankestreger. DET HOLDT IKKE: platformene, kundens vej,
     * skiftet og stempelkortet er de SAMME som i LoyalSum Komplet, fordi det
     * er den samme software — hver eneste celle har et rigtigt svar.
     *
     * Det, der manglede, var en kolonne til den ene forskel, der findes:
     * `stander`. Uden den svarede tabellen ens på alt for Komplet og Online,
     * og de ville ligne samme vare til to priser.
     */
    const iSammenligningen = PLATFORM_VALG.map((v) => v.slug).sort();
    const offentlige = KATALOG.map((p) => p.slug).sort();
    expect(iSammenligningen).toEqual(offentlige);
  });

  it("siger om hver vare har et fysisk skilt", () => {
    /* Kolonnen er hele grunden til, at de digitale varer kan stå i tabellen.
       Den skal svare det samme som `harFysiskSkilt`, ellers sammenligner
       tabellen noget andet end systemet gør. */
    for (const v of PLATFORM_VALG) {
      const vare = getProduct(v.slug)!;
      expect(v.stander.length, `${v.slug}: cellen skal kunne skimmes`).toBeLessThanOrEqual(30);
      const sigerJa = /^ja\b/i.test(v.stander);
      expect(
        sigerJa,
        `${v.slug}: cellen siger "${v.stander}", men harFysiskSkilt siger ${harFysiskSkilt(vare)}`,
      ).toBe(harFysiskSkilt(vare));
    }
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
