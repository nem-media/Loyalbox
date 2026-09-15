import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { begraens, TEKST_MAKS } from "./tekstgraenser";

/**
 * INGEN AF TABELLERNE HAR EN LÆNGDE. Kolonnerne er `text`, og trimning var
 * alt, der stod mellem et formularfelt og databasen — så et programnavn på ti
 * tusind tegn blev gemt uden at noget fejlede, og landede som overskrift på
 * kundens kort.
 *
 * Det er ikke en sikkerhedsfejl (Supabase parametriserer, React escaper), men
 * et layoutproblem dér, hvor vi har mindst kontrol: kundens egen telefon. Og
 * butikken opdager det aldrig, for de ser deres eget kort i dashboardet, hvor
 * de selv har skrevet noget kort og pænt.
 */
describe("begraens", () => {
  it("trimmer som før og rører ikke almindelige værdier", () => {
    expect(begraens("  Kaffeklub  ", 80)).toBe("Kaffeklub");
    expect(begraens(null, 80)).toBe("");
    expect(begraens("", 80)).toBe("");
  });

  it("afkorter i stedet for at afvise", () => {
    const langt = "a".repeat(5000);
    expect(begraens(langt, TEKST_MAKS.navn)).toHaveLength(TEKST_MAKS.navn);
  });

  /**
   * TEGN OG IKKE BYTES. Et dansk `æ` fylder to bytes og ét tegn; en grænse i
   * bytes ville skære et navn over et sted, der afhang af hvilke bogstaver
   * der stod i det.
   */
  it("tæller tegn, så æøå ikke koster dobbelt", () => {
    expect(begraens("æ".repeat(100), 40)).toHaveLength(40);
    expect(begraens("Bagerens Ærlige Ø", 80)).toBe("Bagerens Ærlige Ø");
  });

  /** Et afkortet navn må ikke ende på et mellemrum. */
  it("efterlader ikke et hængende mellemrum", () => {
    expect(begraens("ab cd", 3)).toBe("ab");
  });
});

/**
 * GRÆNSEN SKAL LIGGE PÅ SERVEREN. Et `maxLength` i browseren er en
 * bekvemmelighed; server-handlingen kan kaldes direkte. Prøven læser i kilden,
 * fordi det er et kaldested og ikke en beregning.
 */
describe("felterne, kundens telefon får at se, er bundet", () => {
  const kilde = (s: string) => readFileSync(join(process.cwd(), s), "utf8");

  it("stempelkortets navn og underlinje", () => {
    const s = kilde("src/app/dashboard/loyalitet/actions.ts");
    expect(s).toContain('begraens(formData.get("name"), TEKST_MAKS.navn)');
    expect(s).toContain("TEKST_MAKS.kortTekst");
    expect(s).toContain("TEKST_MAKS.navn) || \"Belønning\"");
  });

  it("standerens navn og knapetiketten på den offentlige side", () => {
    const s = kilde("src/app/dashboard/actions.ts");
    expect(s).toContain("TEKST_MAKS.etiket");
    expect(s).toContain('begraens(formData.get("name"), TEKST_MAKS.navn)');
  });

  /** Kundens eget navn står på kortsiden og kommer fra en OFFENTLIG formular. */
  it("medlemmets navn fra den offentlige tilmelding", () => {
    expect(kilde("src/app/kort/actions.ts")).toContain(
      'begraens(formData.get("name"), TEKST_MAKS.navn)',
    );
  });
});
