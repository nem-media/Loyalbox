import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * HVEM MÅ HVAD I POINTPROGRAMMET — OG HVOR DET AFGØRES.
 *
 * Rettighederne er de EKSISTERENDE (`getCompanyAccess`): der er ikke opfundet
 * en rolle til point. En medarbejder, der må stemple, må også give point; en
 * justering eller en annullering kræver administratoradgang, fordi den flytter
 * et tal, kunden ikke selv har optjent.
 *
 * DET AFGØRENDE ER, AT KONTROLLEN LIGGER PÅ SERVEREN. En knap, der er skjult,
 * er ikke en spærre: en server action kan kaldes direkte. Prøven læser derfor
 * kilden UDEN kommentarer — filerne citerer med vilje dét, de forklarer, og en
 * prøve på den rå tekst ville bestå på en kommentar, hvis vagten blev slettet.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const kilde = (sti: string) => udenKommentarer(readFileSync(sti, "utf8"));

const SERVICE = kilde("src/lib/loyalty/point-service.ts");
const ACTIONS = kilde("src/app/dashboard/loyalitet/point/actions.ts");

describe("rettighederne håndhæves i servicelaget", () => {
  it("at give point kræver den samme rettighed som et stempel", () => {
    expect(SERVICE).toMatch(
      /type === "earn" \? access\.permissions\.canStamp : access\.permissions\.canManage/,
    );
  });

  it("indløsning kræver canRedeem", () => {
    expect(SERVICE).toMatch(/if \(!access\.permissions\.canRedeem\)/);
  });

  it("annullering kræver canManage", () => {
    const blok = SERVICE.slice(SERVICE.indexOf("export async function annullerPointTransaktion"));
    expect(blok).toMatch(/if \(!access\.permissions\.canManage\)/);
  });

  /*
   * INGEN AF DEM STOLER PÅ KALDEREN. Rettigheden læses af `CompanyAccess`,
   * som kommer fra `getCompanyAccess()` — den kan ikke sendes med i en
   * formular.
   */
  it("rettigheden kommer fra adgangen og ikke fra inddata", () => {
    expect(SERVICE).not.toMatch(/formData/);
    expect(SERVICE).not.toMatch(/permissions\s*=\s*\{/);
  });
});

describe("virksomheden kan kun røre sit eget", () => {
  /*
   * ORGANISATIONSISOLATION. Hvert kald til basen bærer `access.companyId`, og
   * SQL-funktionerne slår programmet op MED `company_id` i forespørgslen. Et
   * id fra en anden butik giver derfor ikke et afslag bagefter — det findes
   * slet ikke.
   */
  it("hvert RPC-kald sender virksomheden med", () => {
    const kald = SERVICE.match(/p_company: [^,]+/g) ?? [];
    expect(kald.length).toBeGreaterThanOrEqual(3);
    for (const k of kald) expect(k).toContain("access.companyId");
  });

  it("opslag i pointtabellerne binder til virksomheden", () => {
    for (const fn of ["hentPointProgram"]) {
      const blok = SERVICE.slice(SERVICE.indexOf(`export async function ${fn}`));
      expect(blok, fn).toMatch(/\.eq\("company_id", companyId\)/);
    }
  });

  it("dashboardets skrivninger har ejerskabet i forespørgslen", () => {
    // Hver update/delete på programmet eller belønningerne skal bære
    // `company_id` — ellers kan et id fra en anden butik rammes.
    const opdateringer = ACTIONS.match(/\.from\("loyalty_point_(programs|rewards)"\)[\s\S]{0,600}?;/g) ?? [];
    const skrivninger = opdateringer.filter((b) => /\.update\(|\.delete\(/.test(b));
    expect(skrivninger.length).toBeGreaterThanOrEqual(3);
    for (const b of skrivninger) {
      expect(b).toMatch(/\.eq\("company_id", access\.companyId\)/);
    }
  });

  /*
   * OG SVARET LÆSES. En `update` mod PostgREST svarer glad ved NUL rækker, så
   * uden `.select()` ville et fremmed id give "Gemt!" uden at have gemt noget.
   * Det er den mest udbredte fejlklasse i dette projekt.
   */
  it("opdateringer læser rækketallet", () => {
    const opdater = ACTIONS.slice(
      ACTIONS.indexOf("export async function opdaterPointProgram"),
      ACTIONS.indexOf("export async function saetPointProgramStatus"),
    );
    expect(opdater).toMatch(/\.select\("id"\)/);
    expect(opdater).toMatch(/if \(error \|\| !data\?\.length\)/);
  });
});

describe("abonnementet spørges, ikke kun rollen", () => {
  /*
   * TRE TING SKAL PASSE: adgang til virksomheden, rettigheden, OG at
   * pointprogrammet er med i det købte produkt. Spørges der kun om de to
   * første, kan en medarbejder med administratoradgang oprette et
   * pointprogram på et abonnement, ejerens egen side siger nej til — nøjagtig
   * den fejl, `stempelkortIPlan` blev skrevet for at lukke.
   */
  it("administration kræver pointprogramIPlan", () => {
    const kraev = ACTIONS.slice(
      ACTIONS.indexOf("async function kraevAdmin"),
      ACTIONS.indexOf("/* ======================================================= selve programmet */"),
    );
    expect(kraev).toMatch(/if \(!\(await pointprogramIPlan\(access\.companyId\)\)\)/);
    expect(kraev).toMatch(/if \(!access\.permissions\.canManage\)/);
  });

  it("svaret er det SAMME som stempelkortets", () => {
    const plan = kilde("src/lib/loyalty/plan.ts");
    expect(plan).toMatch(
      /export async function pointprogramIPlan\([\s\S]{0,120}return stempelkortIPlan\(companyId\);/,
    );
  });
});

describe("pointtallet regnes på serveren", () => {
  /*
   * PREVIEWET VED DISKEN ER EN VISNING. Kom tallet med i formularen, ville en
   * ændret værdi i en devtools-konsol være en gratis saldo — og den ville se
   * helt almindelig ud i ledgeren bagefter.
   */
  it("optjeningen læser programmets egne tal og ikke formularens", () => {
    const giv = ACTIONS.slice(
      ACTIONS.indexOf("export async function givPointAction"),
      ACTIONS.indexOf("export async function justerPointAction"),
    );
    expect(giv).toMatch(/const program = await hentPointProgram\(access\.companyId\)/);
    expect(giv).toMatch(/Math\.floor\(beloeb \/ Number\(program\.earn_value\)\)/);
    // Der findes ikke et felt, hvor point kan sendes ind ved en beløbsoptjening.
    expect(giv).not.toMatch(/formData\.get\("earned_points"\)/);
  });

  it("fortegnet sættes af typen og ikke af et tal fra en formular", () => {
    expect(SERVICE).toMatch(/const delta = type === "adjust_remove" \? -antal : antal/);
    expect(SERVICE).toMatch(/Math\.floor\(Math\.abs\(Number\(params\.points\)\)\)/);
  });

  it("en justering kræver en begrundelse", () => {
    const juster = ACTIONS.slice(
      ACTIONS.indexOf("export async function justerPointAction"),
      ACTIONS.indexOf("export async function indloesPointAction"),
    );
    expect(juster).toMatch(/if \(!begrundelse\) return \{ error:/);
  });
});

describe("kunden ser kun sit eget", () => {
  /*
   * KUNDEISOLATION. Kortet hentes på `public_token` (besiddelse er
   * autorisationen, som i resten af systemet), og "Mine fordele" henter kun
   * medlemsrækker, hvor `user_id` er den indloggede. Der findes ingen vej,
   * hvor et gættet member-id giver en fremmed kundes saldo.
   */
  it("pointkortene på kontoen hentes på brugerens egne medlemsrækker", () => {
    const konto = kilde("src/lib/loyalty/member-account.ts");
    const blok = konto.slice(konto.indexOf("export async function getPointCardsForUser"));
    expect(blok).toMatch(/\.from\("loyalty_members"\)[\s\S]{0,200}\.eq\("user_id", userId\)/);
    expect(blok).toMatch(/\.in\("member_id", memberIds\)/);
  });

  it("kortsiden slår kunden op på tokenet", () => {
    const side = kilde("src/app/kort/[token]/page.tsx");
    expect(side).toMatch(/\.from\("loyalty_members"\)[\s\S]{0,200}\.eq\("public_token", token\)/);
    // Pointdelen hentes for NETOP den fundne kunde.
    expect(side).toMatch(/hentPointSaldo\(pointProgram\.id, member\.id\)/);
  });
});
