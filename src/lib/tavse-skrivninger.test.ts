import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * EN SKRIVNING, HVIS SVAR INGEN LÆSER.
 *
 * De sidste fem steder fra fejningen efter gennemgangen. De så ud som kapløb,
 * men var noget andet og enklere: **`update` mod PostgREST svarer glad, når
 * den rammer NUL rækker**, og `error` er så null. Webhookens egen kommentar
 * har sagt det hele tiden — det var bare ikke ført igennem.
 *
 * Konsekvensen er to ting, og begge er tavse:
 *
 *  - **Revisionsloggen kommer til at lyve.** `setCompanyProduct` og
 *    `genoptagKundeforhold` skrev en linje i `admin_log` om en ændring, der
 *    ikke fandt sted. En log, der kan lyve, er værre end ingen log, for den
 *    bliver troet på.
 *  - **En betalende kunde låses ude.** `bestilUdenKonto` skriver ved en
 *    genbestilling accepten af vilkårene OG et nyt aktiveringstoken — dét,
 *    der giver adgang til købet. Ramte den nul rækker, ville kunden betale og
 *    få en aktiveringsmail med et token, der ikke findes.
 *
 * Og `saelgAdresseAdmin` skriver EFTER at Stripe er hævet, altså efter at
 * kunden har fået en regning: driver kolonnen fra abonnementet dér, møder hun
 * "skriv til os" for noget, hun betaler for — præcis dét, funktionen findes
 * for at forhindre.
 *
 * `addEmployee` er en anden slags: dubletten ER umulig (`employees_user_
 * company_idx`), men et tabt kapløb viste ejeren databasens rå besked.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

/** Kroppen af én funktion — frem til næste `export`. */
function krop(kode: string, navn: string): string {
  const i = kode.indexOf(`function ${navn}(`);
  expect(i, `${navn} findes ikke`).toBeGreaterThan(-1);
  const rest = kode.slice(i);
  const slut = rest.indexOf("\nexport ");
  const ud = slut === -1 ? rest : rest.slice(0, slut);
  expect(ud.length, `${navn} har en tom krop`).toBeGreaterThan(200);
  return ud;
}

describe("admin-loggen må ikke kunne lyve", () => {
  const ADMIN = kilde("src/app/admin/actions.ts");

  for (const navn of ["setCompanyProduct", "genoptagKundeforhold"]) {
    it(`${navn} noterer først, når en række faktisk blev ramt`, () => {
      const k = krop(ADMIN, navn);
      const opdater = k.indexOf(".update(efter)");
      const log = k.indexOf("noterAdminHandling");
      expect(opdater).toBeGreaterThan(-1);
      expect(log).toBeGreaterThan(opdater);

      // Mellem skrivningen og loggen SKAL der stå et tjek af rækketallet.
      const imellem = k.slice(opdater, log);
      expect(imellem, "ingen .select() på opdateringen").toContain(
        '.select("id")',
      );
      expect(imellem, "rækketallet tjekkes ikke").toMatch(/!ramt\?\.length/);
    });
  }
});

describe("adressesalget siger fra, hvis kolonnen ikke blev skrevet", () => {
  it("tjekker rækketallet og alarmerer", () => {
    const k = krop(kilde("src/app/admin/actions.ts"), "saelgAdresseAdmin");
    const i = k.indexOf("adresser_tilladt: svar.adresserTilladt");
    expect(i).toBeGreaterThan(-1);
    const efter = k.slice(i, i + 900);
    expect(efter).toContain('.select("id")');
    expect(efter).toMatch(/!ramtFirma\?\.length/);
    // Stripe er allerede hævet — det SKAL kunne ses, ikke gå stille forbi.
    expect(efter).toContain("noterFejl");
  });
});

describe("bestillingen uden konto afviser, før der betales", () => {
  const k = kilde("src/app/bestil/uden-konto/actions.ts");

  it("læser svaret på genbestillingens opdatering", () => {
    const i = k.indexOf("terms_accepted_at: new Date().toISOString()");
    expect(i).toBeGreaterThan(-1);
    const efter = k.slice(i, i + 1400);
    expect(efter).toContain('.select("id")');
    expect(efter).toMatch(/!ramt\?\.length/);
    expect(efter).toContain("noterFejl");
  });

  /**
   * AFVISNINGEN SKAL LIGGE FØR STRIPE. Sker den bagefter, har kunden betalt
   * for en bestilling, vi ikke kan aktivere — og så er det ikke længere en
   * fejl, der kan rettes ved at prøve igen.
   */
  it("afvisningen står før checkout-sessionen oprettes", () => {
    const afvis = k.indexOf("Bestillingen kunne ikke oprettes. Prøv igen, eller skriv til os.");
    const stripe = k.indexOf("checkout.sessions.create");
    expect(afvis).toBeGreaterThan(-1);
    expect(stripe).toBeGreaterThan(-1);
    expect(afvis).toBeLessThan(stripe);
  });
});

describe("medarbejderen får en menneskelig besked", () => {
  it("en dublet oversættes i stedet for at vise databasens tekst", () => {
    const k = krop(kilde("src/app/dashboard/personale/actions.ts"), "addEmployee");
    const i = k.indexOf('23505');
    expect(i, "23505 håndteres ikke").toBeGreaterThan(-1);
    // Beskeden skal være den samme som ved det opslag, der fandt dubletten.
    expect(k.slice(i, i + 200)).toMatch(/allerede tilføjet/);
    // Og den skal komme FØR den rå videresendelse af error.message.
    expect(i).toBeLessThan(k.indexOf("error: error.message"));
  });
});
