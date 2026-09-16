import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { tjekStanderLinks, STANDER_LINKFELTER } from "./stands";
import { erGyldigUrl, laesDestination } from "./bestilling-uden-konto";

/**
 * STANDERENS DESTINATION ER HELE VAREN — OG DEN BLEV IKKE PRØVET.
 *
 * `erGyldigUrl()` fandtes og blev brugt på "egne platforme", altså det felt,
 * der kom sidst til. De FIRE oprindelige felter tyve linjer længere oppe —
 * Google, Trustpilot, Facebook og eget link — havde den ikke. Sjette gang
 * samme lektie: rettelsen stoppede ved den linje, opmærksomheden var rettet
 * mod, og søskendefelterne blev stående.
 *
 * MÅLT I BRUGERFLADEN 2026-09-16: `ikke-en-url-overhovedet` blev gemt uden en
 * lyd, og "Gemt!" kom frem. Adressen er relativ, så kunden, der trykkede
 * "Anmeld os på Google", landede på `/r/ikke-en-url-overhovedet` — **en 404 på
 * vores eget domæne**. Butikken kunne ikke se det nogen steder, og adressen
 * bliver trykt på et skilt, der ikke kan kaldes tilbage. Den hyppigste
 * virkelige fejl er ikke et angreb, men en glemt `https://`.
 *
 * `javascript:` spærres i dag af React ved visningen (efterprøvet: href'en
 * bliver til `javascript:throw new Error('React has blocked...')`), men
 * `erGyldigUrl` siger det selv i sit eget hoved: den slags må ikke kunne nå
 * et skilt i første omgang.
 *
 * BEGGE VEJE TIL KOLONNERNE PRØVER DET SAMME. Admin er den betroede af de to,
 * men også den, der RETTER en kundes link — en tastefejl dér er lige så dyr.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

const fra = (v: Record<string, string>) => (felt: string) => v[felt] ?? "";

describe("linkene på en stander prøves", () => {
  it("tager imod en rigtig adresse", () => {
    expect(
      tjekStanderLinks(
        fra({ google_review_url: "https://g.page/r/abc/review" }),
        erGyldigUrl,
      ),
    ).toBeNull();
  });

  it("tomme felter er i orden", () => {
    expect(tjekStanderLinks(fra({}), erGyldigUrl)).toBeNull();
  });

  /** Den hyppigste virkelige fejl. */
  it("siger fra ved en glemt protokol — og siger hvilket felt", () => {
    const fejl = tjekStanderLinks(
      fra({ google_review_url: "www.google.dk/skriv" }),
      erGyldigUrl,
    );
    expect(fejl).toMatch(/Google-linket/);
    expect(fejl).toMatch(/https:\/\//);
  });

  it("afviser javascript: på hvert eneste felt", () => {
    for (const [felt] of STANDER_LINKFELTER) {
      expect(
        tjekStanderLinks(fra({ [felt]: "javascript:alert(1)" }), erGyldigUrl),
        felt,
      ).not.toBeNull();
    }
  });
});

describe("destinationstypen læses, ikke påstås", () => {
  it("kendte værdier går igennem", () => {
    for (const v of ["google", "trustpilot", "facebook", "custom"]) {
      expect(laesDestination(v)).toBe(v);
    }
  });

  it("alt andet falder tilbage på Google", () => {
    for (const v of ["", "drop table", "GOOGLE", null, "toString"]) {
      expect(laesDestination(v), String(v)).toBe("google");
    }
  });
});

describe("begge veje til de fire kolonner bruger samme kontrol", () => {
  const VEJE = [
    ["src/app/dashboard/actions.ts", "updateStand"],
    ["src/app/admin/actions.ts", "updateStandLinks"],
  ] as const;

  for (const [sti, navn] of VEJE) {
    const KODE = kilde(sti);
    const i = KODE.indexOf(`export async function ${navn}(`);
    const rest = KODE.slice(i);
    const slut = rest.indexOf("\nexport ");
    const krop = slut === -1 ? rest : rest.slice(0, slut);

    it(`${navn} prøver linkene`, () => {
      expect(i, `${navn} findes ikke`).toBeGreaterThan(-1);
      expect(krop, "tjekStanderLinks kaldes ikke").toContain(
        "tjekStanderLinks(",
      );
    });

    /**
     * Afvisningen skal ligge FØR skrivningen — ellers er adressen gemt, og
     * beskeden kommer bagefter.
     */
    it(`${navn} afviser før den skriver`, () => {
      const afvis = krop.indexOf("if (linkFejl)");
      const skriv = krop.indexOf(".update(");
      expect(afvis).toBeGreaterThan(-1);
      expect(skriv).toBeGreaterThan(-1);
      expect(afvis).toBeLessThan(skriv);
    });

    it(`${navn} påstår ikke destinationstypen med as`, () => {
      expect(krop).not.toMatch(/as\s+DestinationType/);
      expect(krop).toContain("laesDestination(");
    });
  }
});
