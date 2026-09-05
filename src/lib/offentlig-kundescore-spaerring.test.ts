import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * SPÆRRINGERNE OM DEN OFFENTLIGE KUNDESCORE.
 *
 * Tre ting afgør, om funktionen er forsvarlig, og ingen af dem kan prøves med
 * en ren funktion: standardværdien står i en migration, og de to andre er
 * vagter i en server-action, der kræver hele Next-runtimen for at kunne
 * kaldes. Samme greb som `komplet-spaerring.test.ts`: der læses i KILDEN, for
 * det, der skal fanges, er ikke en forkert beregning — det er en spærring, der
 * bliver slettet.
 *
 * De tre er ikke tilfældige. De er de eneste steder, hvor et uheld ville
 * offentliggøre noget om en virksomhed, som virksomheden ikke havde bedt om.
 */

function kilde(sti: string): string {
  return readFileSync(join(process.cwd(), sti), "utf8");
}

describe("den offentlige kundescore er slået fra som standard", () => {
  /**
   * EN DEFAULT PÅ `true` VILLE OFFENTLIGGØRE HVER ENESTE eksisterende kundes
   * tal den dag, migrationen kørte. Det er hele forskellen på et tilvalg og en
   * udrulning.
   */
  it("migrationen sætter kolonnen til false", () => {
    const sql = kilde("supabase/migrations/0027_offentlig_kundescore.sql");
    expect(sql).toMatch(
      /offentlig_kundescore\s+boolean\s+not\s+null\s+default\s+false/i,
    );
    expect(sql).not.toMatch(/default\s+true/i);
  });
});

describe("kun ejeren kan ændre den offentlige visning", () => {
  const action = kilde("src/app/dashboard/omdoemme/actions.ts");

  /**
   * Hvad der står offentligt om forretningen, er ikke en daglig handling som
   * at stemple et kort. Omdømme-siden nås kun af en ejer, men en server-action
   * skal kunne stå alene: en formular kan sendes uden om en brugerflade.
   */
  it("afviser andre roller end owner", () => {
    expect(action).toMatch(/access\.role\s*!==\s*"owner"/);
  });

  /**
   * MINIMUMSGRÆNSEN HÅNDHÆVES PÅ SERVEREN og ikke kun i knappen. Uden det kan
   * en score på én kundeoplevelse offentliggøres ved at sende formularen selv.
   */
  it("håndhæver minimumsgrænsen, før visningen slås til", () => {
    expect(action).toContain("OFFENTLIG_MINIMUM");
    expect(action).toMatch(/hentOffentligtGrundlag/);
  });
});

describe("Reputation Score kan ikke slippe ud", () => {
  /**
   * Den offentlige komponent har ikke en prop, Reputation Score kunne komme
   * ind ad — den tager kun `OffentligKundescore`, som er tre tal: snittet,
   * antallet og "foreløbig". Prøven her holder fast i, at ingen tilføjer en.
   *
   * Der prøves på FELTNAVNENE fra `Omdoemme` og på 100-skalaen, ikke på ordet
   * "reputation": det står med vilje i filens kommentar som en forklaring på,
   * hvorfor scoren aldrig må ende her.
   */
  it("den offentlige komponent kender kun kundescoren", () => {
    const komponent = kilde("src/components/offentlig-kundescore.tsx");
    expect(komponent).toMatch(/score:\s*OffentligKundescore/);
    expect(komponent).not.toMatch(/\betiket\b|faktiskeVaegte|\bdele\b/);
    expect(komponent).not.toMatch(/\/\s*100/);
  });

  /** Den offentlige side må ikke hente det samlede omdømme overhovedet. */
  it("den offentlige side henter kun kundescoren", () => {
    const side = kilde("src/app/r/[slug]/page.tsx");
    expect(side).toContain("hentOffentligKundescore");
    expect(side).not.toContain("hentOmdoemme");
  });
});
