import { describe, it, expect } from "vitest";
import { KATALOG, PRODUKT_FOTO } from "./constants";
import { kortMetabeskrivelse } from "./site";

/**
 * TITLER OG BESKRIVELSER, DER FAKTISK KAN STÅ I ET SØGERESULTAT.
 *
 * Produktsiderne brugte `description` — teksten, der står PÅ siden — som meta
 * description. **Målt mod produktion 2026-09-17:** Reviewstander Pro sendte
 * **401 tegn**, LoyalSum Komplet 269 og Reviewstander 230, hvor Google klipper
 * omkring 155. To titler var 70 og 80 tegn og blev klippet på samme måde.
 *
 * Det ses ikke i koden og ikke på siden — kun i søgeresultatet, og først når
 * nogen kigger. Derfor står grænserne som en prøve.
 *
 * TALLENE ER SKØN, IKKE LOVE. Google måler i pixels, så en titel med mange
 * brede bogstaver klippes før en smal. Grænserne her er dem, branchen regner
 * med, og de er sat som ØVRE grænser — ikke som et mål, man skal ramme.
 */

const SITENAVN_HALE = " — LoyalSum.dk".length;

describe("produkternes metadata kan stå i et søgeresultat", () => {
  for (const p of KATALOG) {
    const titel = (p.metaTitle ?? p.name) + " — LoyalSum.dk";

    it(`${p.slug}: titlen klippes ikke`, () => {
      expect(titel.length, `"${titel}"`).toBeLessThanOrEqual(65);
    });

    it(`${p.slug}: beskrivelsen klippes ikke`, () => {
      const beskrivelse =
        p.metaDescription ?? kortMetabeskrivelse(p.description);
      expect(beskrivelse.length, beskrivelse).toBeLessThanOrEqual(160);
      // For kort er også spild: uddraget er gratis plads i resultatet.
      expect(beskrivelse.length, beskrivelse).toBeGreaterThan(70);
    });

    /**
     * EN KORTERE UDGAVE MÅ SIGE DET SAMME — IKKE NOGET ANDET. Håndskrevne
     * `metaDescription` er der for at forkorte, ikke for at love mere end
     * produktsiden. Prøven kan ikke læse mening, men den kan holde fast i, at
     * der ikke er sneget en pris eller et tal ind, som siden ikke nævner.
     */
    it(`${p.slug}: den korte beskrivelse påstår ikke nye tal`, () => {
      const kort = p.metaDescription;
      if (!kort) return;
      const talIKort = kort.match(/\d+/g) ?? [];
      for (const tal of talIKort) {
        expect(
          p.description.includes(tal),
          `"${tal}" står i meta description, men ikke i produktbeskrivelsen`,
        ).toBe(true);
      }
    });
  }

  /** To sider, der hedder det samme, konkurrerer om det samme resultat. */
  it("ingen to varer deler titel eller beskrivelse", () => {
    const titler = KATALOG.map((p) => p.metaTitle ?? p.name);
    const beskrivelser = KATALOG.map(
      (p) => p.metaDescription ?? kortMetabeskrivelse(p.description),
    );
    expect(new Set(titler).size).toBe(titler.length);
    expect(new Set(beskrivelser).size).toBe(beskrivelser.length);
  });
});

describe("delebilledet er et foto og ikke en tegning", () => {
  /**
   * `product.image` er mockup-SVG'en, som siden bruger. **Facebook, LinkedIn
   * og Slack gengiver ikke SVG**, så et delt produktlink stod uden billede.
   * `PRODUKT_FOTO` er den JPG, produktsiden allerede viser.
   */
  for (const p of KATALOG) {
    it(`${p.slug} har et rigtigt foto til deling`, () => {
      const foto = PRODUKT_FOTO[p.slug];
      expect(foto, `PRODUKT_FOTO mangler for ${p.slug}`).toBeTruthy();
      expect(foto, "en SVG kan ikke bruges som og:image").not.toMatch(
        /\.svg$/i,
      );
    });
  }
});

describe("kortMetabeskrivelse", () => {
  it("lader en kort tekst være i fred", () => {
    const kort = "En kort beskrivelse.";
    expect(kortMetabeskrivelse(kort)).toBe(kort);
  });

  it("klipper på en sætningsgrænse og ikke midt i en", () => {
    const lang = `${"A".repeat(100)}. ${"B".repeat(100)}.`;
    const ud = kortMetabeskrivelse(lang);
    expect(ud.endsWith(".")).toBe(true);
    expect(ud.length).toBeLessThanOrEqual(155);
  });

  /** Én sætning, der er længere end grænsen, må ikke klippes midt i et ord. */
  it("klipper på et ordskel, når selv første sætning er for lang", () => {
    const ord = "ord ".repeat(80).trim();
    const ud = kortMetabeskrivelse(ord);
    expect(ud.length).toBeLessThanOrEqual(155);
    expect(ud.endsWith("ord")).toBe(true);
  });
});
