import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { COMPANY, SITE_NAME, SELSKABSLINJE } from "./constants";

/**
 * "LOYALSUM.DK – EN DEL AF NEM MEDIA APS".
 *
 * Kunden har købt hos LoyalSum og har aldrig hørt om Nem Media. Selskabsnavnet
 * stod alene dér, hvor loven kræver en identifikation — footeren,
 * handelsbetingelserne, mailfoden — så den, der læste efter, hvem hun lige
 * havde handlet med, mødte et navn, der ikke står nogen andre steder.
 *
 * TO REGLER, OG DEN ANDEN ER DEN, DER GLIDER. Linjen skal være ENS de steder,
 * navnet ER et krav — og selskabet må IKKE nævnes de steder, det ikke er.
 * Kontaktformularens privatlivslinje sagde "i vores mailboks hos Nem Media
 * ApS": hverken et krav eller en hjælp, bare et fremmed navn i den sætning,
 * hvor man skal beslutte, om man tør skrive.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("selskabslinjen", () => {
  it("binder brandet og selskabet sammen i dén rækkefølge", () => {
    expect(SELSKABSLINJE.startsWith(SITE_NAME)).toBe(true);
    expect(SELSKABSLINJE).toContain(COMPANY.legalName);
    /* Brandet FØRST. Står selskabet forrest, er vi tilbage ved at præsentere
       kunden for et navn, hun ikke kender. */
    expect(SELSKABSLINJE.indexOf(SITE_NAME)).toBeLessThan(
      SELSKABSLINJE.indexOf(COMPANY.legalName),
    );
  });

  /**
   * DE TRE STEDER, NAVNET SKAL STÅ, SLÅR DET OP — de skriver det ikke af.
   * Tre formuleringer af, hvem vi er, er præcis dét, der får nogen til at tro,
   * at det er to virksomheder.
   */
  for (const sti of [
    "src/components/site-footer.tsx",
    "src/components/legal.tsx",
    "src/lib/mail-skabelon.ts",
  ]) {
    it(`${sti} bruger konstanten og ikke sit eget ord`, () => {
      const s = kilde(sti);
      expect(s).toMatch(/SELSKABSLINJE(_HALE)?/);
      /* `COMPANY.legalName` alene er dét, der var galt — navnet uden brandet
         foran. Databehandleraftalen er undtagelsen og står ikke på listen:
         dér ER selskabet aftaleparten. */
      expect(
        s.includes("COMPANY.legalName"),
        `${sti}: brug SELSKABSLINJE frem for legalName alene`,
      ).toBe(false);
    });
  }

  it("kontaktformularen nævner ikke selskabet", () => {
    /* Oplysningspligten opfyldes med et link til privatlivspolitikken — ikke
       ved at nævne et selskab, afsenderen aldrig har hørt om. */
    const s = kilde("src/components/kontakt-form.tsx");
    expect(s).not.toContain("COMPANY.legalName");
    expect(s).not.toContain(COMPANY.legalName);
    /* Men linket SKAL blive: et navn og en mailadresse er personoplysninger,
       og GDPR art. 13 kræver, at den, der afgiver dem, får det at vide. */
    expect(s).toContain("/privatliv");
  });
});
