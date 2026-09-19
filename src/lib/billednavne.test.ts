import { describe, it, expect } from "vitest";
import { existsSync } from "node:fs";
import { join } from "node:path";
import {
  KATALOG,
  PRODUKT_FOTO,
  PRODUKT_FOTO_ALT,
  KOMMENDE_FOTO,
  KOMMENDE_FOTO_ALT,
  UPCOMING_MERCH,
} from "./constants";

/**
 * FILNAVNET ER OGSÅ TEKST, GOOGLE LÆSER.
 *
 * Billederne kom ud af en generator som "ChatGPT Image 19. sep. 2026,
 * 18.12.52 (5).png" — et navn, der hverken siger noget til en søgemaskine
 * eller til den næste, der åbner mappen, og som oven i købet har mellemrum,
 * punktummer og parenteser i en URL. Prøven her holder navnene ved søgeord.
 *
 * ALT-TEKSTEN ER DEN ANDEN HALVDEL. Den stod som `${p.name} — reviewstander i
 * brug` skrevet ind i koden, og det var sandt, så længe hver vare var en
 * stander. LoyalSum Komplet Online viser en bærbar og en telefon, så en
 * skærmlæser fik at vide, at der stod en reviewstander på billedet.
 */

const ROD = process.cwd();

/** Et filnavn, der kan stå i en URL og betyder noget. */
function erSeoNavn(sti: string): string | null {
  const fil = sti.replace(/^\//, "");
  if (/[^a-z0-9./-]/.test(fil)) return `"${fil}" har tegn, der ikke hører i en URL`;
  if (/\s/.test(fil)) return `"${fil}" har mellemrum`;
  const navn = fil.replace(/\.[a-z]+$/, "");
  if (navn.length < 12) return `"${fil}" er for kort til at sige noget`;
  if (!navn.includes("-")) return `"${fil}" er ét ord uden bindestreger`;
  return null;
}

describe("produktfotos", () => {
  it("findes på disken", () => {
    for (const [slug, sti] of Object.entries(PRODUKT_FOTO)) {
      expect(existsSync(join(ROD, "public", sti)), `${slug}: ${sti}`).toBe(true);
    }
  });

  it("hver vare i kataloget har ét", () => {
    /* Kravet blev midlertidigt filtreret ned til de fysiske varer, mens
       LoyalSum Komplet Online ikke havde et billede. Den har ét nu. */
    for (const p of KATALOG) {
      expect(PRODUKT_FOTO[p.slug], `${p.slug} mangler et foto`).toBeTruthy();
    }
  });

  it("har en alt-tekst, der beskriver BILLEDET", () => {
    for (const p of KATALOG) {
      const alt = PRODUKT_FOTO_ALT[p.slug];
      expect(alt, `${p.slug} mangler alt-tekst`).toBeTruthy();
      expect(alt.length, `${p.slug}: for kort`).toBeGreaterThan(25);
      /* "Billede af …" er støj: skærmlæseren siger allerede, at det er et
         billede. Samme regel som på bloggen. */
      expect(alt.toLowerCase().startsWith("billede")).toBe(false);
    }
  });

  it("lover ikke en stander på varen uden stander", () => {
    /* Den konkrete fejl, alt-teksten havde: hver vare fik "reviewstander i
       brug", også den der ikke har en. */
    const alt = PRODUKT_FOTO_ALT["loyalsum-komplet-online"].toLowerCase();
    expect(alt).not.toContain("reviewstander");
    expect(alt).not.toContain("stander på disken");
  });
});

describe("billederne til de kommende materialer", () => {
  it("findes på disken", () => {
    for (const [key, sti] of Object.entries(KOMMENDE_FOTO)) {
      expect(existsSync(join(ROD, "public", sti)), `${key}: ${sti}`).toBe(true);
    }
  });

  it("peger kun på materialer, der findes", () => {
    const kendte = UPCOMING_MERCH.map((m) => m.key);
    for (const key of Object.keys(KOMMENDE_FOTO)) {
      expect(kendte, `ukendt nøgle: ${key}`).toContain(key);
    }
  });

  it("har en alt-tekst hver", () => {
    for (const key of Object.keys(KOMMENDE_FOTO)) {
      const alt = KOMMENDE_FOTO_ALT[key];
      expect(alt, `${key} mangler alt-tekst`).toBeTruthy();
      expect(alt.length).toBeGreaterThan(25);
    }
  });
});

describe("filnavnene er søgeord og ikke generatornavne", () => {
  for (const [navn, kort] of [
    ["produktfotos", PRODUKT_FOTO],
    ["kommende materialer", KOMMENDE_FOTO],
  ] as const) {
    it(`${navn} kan stå i en URL og betyder noget`, () => {
      for (const sti of Object.values(kort)) {
        expect(erSeoNavn(sti), sti).toBeNull();
      }
    });
  }
});
