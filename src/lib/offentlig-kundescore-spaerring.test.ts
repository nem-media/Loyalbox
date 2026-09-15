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

/**
 * DEN OFFENTLIGE SCORE SKAL LÆSES MED SERVICE-ROLE — ELLERS FINDES DEN IKKE.
 *
 * FEJLEN, DER BLEV FUNDET 2026-09-15: `hentOffentligKundescore()` læste
 * feedback med `createClient()`, altså gennem RLS. Men den, der åbner en
 * offentlig anmeldelsesside, er ANONYM, og anonyme har ingen adgang til
 * `feedback`. Opslaget gav nul rækker, fordelingen blev tom, og funktionen
 * svarede null, fordi antallet lå under minimum. Den offentlige kundescore
 * kunne dermed ALDRIG vises for en besøgende.
 *
 * Målt: service-role så 7 vurderinger for demovirksomheden, den anonyme
 * klient så 0. Efter rettelsen viste siden "FORELØBIG KUNDESCORE 3,0 / 5
 * baseret på 7 kundeoplevelser".
 *
 * FEJLEN VAR TAVS OG SÅ RIGTIG UD FRA EJERENS STOL: dashboardets
 * forhåndsvisning læser med ejerens eget login og kunne sagtens se tallene,
 * så butikken slog funktionen til, så scoren i sin egen visning og troede,
 * den stod ude på siden.
 *
 * Prøven er en KILDEPRØVE, fordi fejlen er et valg af klient og ikke en
 * beregning — der er ingen returværdi at se på uden et rigtigt RLS-miljø.
 */
describe("den offentlige kundescore kan faktisk læses af en besøgende", () => {
  const DATA = readFileSync(
    join(process.cwd(), "src/lib/omdoemme-data.ts"),
    "utf8",
  );

  /*
   * KUN FUNKTIONENS EGEN KROP. Et fast antal tegn løb ind i NÆSTE funktion,
   * som med rette bruger `createClient()` — og så fejlede prøven på nabokoden
   * i stedet for på det, den handler om.
   */
  const krop = (() => {
    const i = DATA.indexOf("export async function hentOffentligKundescore");
    const rest = DATA.slice(i + 10);
    const slut = rest.indexOf("\nexport ");
    return slut === -1 ? rest : rest.slice(0, slut);
  })();

  it("henter fordelingen med service-role og ikke gennem RLS", () => {
    expect(krop.length).toBeGreaterThan(50);
    expect(krop).toContain("createAdminClient()");
    // `createClient()` her er præcis fejlen — den må ikke komme tilbage.
    expect(krop).not.toMatch(/await createClient\(\)/);
  });

  /**
   * ...MEN KUN NÅR BUTIKKEN HAR VALGT DET. Service-role omgår RLS, så
   * opt-in-spærren er det eneste, der står mellem en aggregeret score og en
   * butik, der ikke har bedt om at få den vist.
   */
  it("læser slet ikke, når butikken ikke har slået den til", () => {
    const spaerre = krop.indexOf("if (!tilvalgt) return null;");
    const klient = krop.indexOf("createAdminClient()");
    expect(spaerre).toBeGreaterThan(-1);
    expect(spaerre).toBeLessThan(klient);
  });
});
