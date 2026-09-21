import { describe, it, expect } from "vitest";
import { PRODUCTS, getProduct, arvetFra } from "./constants";

/**
 * "ALT I REVIEWSTANDER PRO" SKAL KUNNE SES FRA DEN SIDE, DER SIGER DET.
 *
 * Linjen stod som første punkt i `features` på LoyalSum Komplet. Den var
 * sand — Komplet indeholder ordret alt i Pro — men den var ubrugelig dér,
 * hvor den stod: på produktsiden for Komplet kan man ikke se, HVAD der er i
 * Pro, og så skal man forlade den side, man er ved at købe fra. Meldt af
 * brugeren.
 *
 * Relationen er nu data (`indeholder`), og produktsiden folder punkterne ud.
 * To ting kan gå galt bagefter, og begge er tavse:
 *
 *   1. Et slug med en tastefejl. `arvetFra()` svarer `null`, siden tegner
 *      ingenting, og funktionerne forsvinder uden at noget fejler.
 *   2. Nogen skriver linjen tilbage i `features`. Så står "Alt i
 *      Reviewstander Pro" to gange — én gang som en udfoldet gruppe og én
 *      gang som et blindt punkt.
 */
describe("en vare, der indeholder en anden", () => {
  const medArv = PRODUCTS.filter((p) => p.indeholder);

  it("der ER varer, der arver", () => {
    /* Uden det led ville alle prøver herunder bestå på en tom liste — og så
       ville de holde op med at beskytte noget den dag, `indeholder` blev
       fjernet fra dem alle. */
    expect(medArv.length).toBeGreaterThan(0);
  });

  for (const p of medArv) {
    it(`${p.slug}: peger på en vare, der findes`, () => {
      expect(
        getProduct(p.indeholder!),
        `${p.slug} peger på "${p.indeholder}", som ikke er i PRODUCTS`,
      ).toBeDefined();
    });

    it(`${p.slug}: arver navn OG punkter fra den vare`, () => {
      const kilde = getProduct(p.indeholder!)!;
      const arv = arvetFra(p);
      expect(arv).not.toBeNull();
      expect(arv!.navn).toBe(kilde.name);
      expect(arv!.punkter).toEqual(kilde.features);
      expect(arv!.punkter.length).toBeGreaterThan(0);
    });

    it(`${p.slug}: har ikke linjen skrevet af i sine egne punkter`, () => {
      /* Egenskaben er "ingen uigennemsigtig henvisning", ikke en bestemt
         formulering: både "Alt i X" og "Alle funktioner fra X" er den samme
         fejl — et punkt, der beder læseren om at gå et andet sted hen. */
      for (const punkt of p.features) {
        expect(
          /^(alt i|alle funktioner fra)\b/i.test(punkt.trim()),
          `${p.slug}: "${punkt}" hører til i \`indeholder\`, ikke i \`features\``,
        ).toBe(false);
      }
    });
  }

  it("en vare uden `indeholder` arver ingenting", () => {
    const uden = PRODUCTS.find((p) => !p.indeholder);
    expect(uden).toBeDefined();
    expect(arvetFra(uden)).toBeNull();
    expect(arvetFra(undefined)).toBeNull();
  });
});
