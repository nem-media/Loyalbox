import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { maaKnyttesAutomatisk } from "./loyalty/member-account";
import { stampProgress, redemptionStampDelta } from "./loyalty/balance";

/**
 * De fem fejl fra gennemtesten 2026-09-07 — låst fast.
 *
 * Alle fem havde det til fælles, at de var USYNLIGE: intet fejlede, ingen log
 * sagde noget, og skærmen så rigtig ud. De blev fundet ved at køre platformen
 * igennem som kunde, medarbejder og ejer og sammenligne databasen før og efter
 * hver handling. Derfor står prøverne her samlet: de beskriver hver især en
 * fejl, der KAN komme igen uden at nogen opdager det.
 *
 * To af dem prøves i kilden. Det er ikke dovenskab: den ene handler om hvilken
 * Supabase-klient en server action bruger, den anden om at en side overhovedet
 * har en knap. Ingen af delene kan kaldes fra en test uden hele Next-runtimen,
 * og begge dele forsvinder ved en uskyldigt udseende ændring.
 */

function kilde(sti: string): string {
  return readFileSync(join(process.cwd(), sti), "utf8");
}

describe("1. et nyt kort må ikke lande på personalets konto", () => {
  /**
   * DEN OPRINDELIGE FEJL: kortet blev knyttet til hvem som helst, browseren
   * var logget ind som. I gennemtesten endte et kort oprettet i navnet
   * "Testkunde Syvende" under en ADMINISTRATORS "Mine stempelkort".
   */
  it("knytter ikke, når e-mailen er en anden", () => {
    expect(maaKnyttesAutomatisk("ejer@butik.dk", "kunde@example.com")).toBe(false);
  });

  /** Uden e-mail i formularen er der intet, der binder kortet til kontoen. */
  it("knytter ikke uden e-mail", () => {
    expect(maaKnyttesAutomatisk("ejer@butik.dk", "")).toBe(false);
    expect(maaKnyttesAutomatisk("ejer@butik.dk", null)).toBe(false);
    expect(maaKnyttesAutomatisk("ejer@butik.dk", undefined)).toBe(false);
  });

  /** Og ikke når ingen er logget ind. */
  it("knytter ikke uden konto", () => {
    expect(maaKnyttesAutomatisk("", "kunde@example.com")).toBe(false);
    expect(maaKnyttesAutomatisk(null, "kunde@example.com")).toBe(false);
  });

  /**
   * Kunden på sin EGEN telefon skal stadig slippe for at trykke "Gem på min
   * konto" bagefter. Det var den gode del af den gamle opførsel.
   */
  it("knytter, når det er den samme adresse", () => {
    expect(maaKnyttesAutomatisk("kunde@example.com", "kunde@example.com")).toBe(true);
  });

  /** Store bogstaver og mellemrum er samme menneske. */
  it("er ligeglad med store bogstaver og mellemrum", () => {
    expect(maaKnyttesAutomatisk("  Kunde@Example.COM ", "kunde@example.com")).toBe(true);
  });
});

describe("2. 'Markér som fulgt op' skal kunne SKRIVE", () => {
  const action = kilde("src/app/dashboard/omdoemme/actions.ts");

  /**
   * DEN OPRINDELIGE FEJL: handlingen brugte brugerens egen klient, men
   * `feedback` har kun en LÆSE-policy. Opdateringen ramte nul rækker, RLS gav
   * ingen fejl, og handlingen svarede `ok`. Knappen havde aldrig virket for
   * nogen — ingen feedback i hele basen havde `haandteret_den` sat — og
   * feedbackhåndtering vejer 18 % af Reputation Score.
   */
  it("bruger service-role og ikke brugerens klient", () => {
    const del = action.slice(action.indexOf("export async function saetHaandteret"));
    expect(del).toContain("createAdminClient()");
    expect(del.slice(0, del.indexOf("revalidatePath"))).not.toMatch(
      /await createClient\(\)/,
    );
  });

  /** Virksomheden kommer fra adgangen, aldrig fra formularen. */
  it("begrænser stadig til egen virksomhed", () => {
    const del = action.slice(action.indexOf("export async function saetHaandteret"));
    expect(del).toContain('.eq("company_id", access.companyId)');
  });

  /**
   * Og den skal SIGE FRA, når den ikke rammer noget. Det var tavsheden, der
   * gjorde den oprindelige fejl usynlig i månedsvis.
   */
  it("siger fra, når ingen række blev ramt", () => {
    const del = action.slice(action.indexOf("export async function saetHaandteret"));
    expect(del).toMatch(/if \(!data\?\.length\)/);
  });
});

describe("3. overskydende stempler må ikke lyve", () => {
  /** Kortet viste "11 af 10 stempler". Nu står de ekstra for sig. */
  it("regner stempler ud over tærsklen for sig", () => {
    const p = stampProgress(11, 10);
    expect(p.overskydende).toBe(1);
    expect(p.reached).toBe(true);
  });

  it("har ingen overskydende under tærsklen", () => {
    expect(stampProgress(7, 10).overskydende).toBe(0);
    expect(stampProgress(10, 10).overskydende).toBe(0);
  });

  /** Visningen skal tælle til tærsklen — ikke til saldoen. */
  it("kortet tæller kun til tærsklen", () => {
    const komponent = kilde("src/components/loyalty/stamp-card-preview.tsx");
    expect(komponent).toMatch(/Math\.min\(p\.have, p\.required\)/);
  });

  /** Og sige hvad der sker med resten. */
  it("kortet fortæller, hvad der sker med de overskydende", () => {
    const komponent = kilde("src/components/loyalty/stamp-card-preview.tsx");
    expect(komponent).toContain("beholderOverskydende");
    expect(komponent).toContain("bortfalder");
  });

  /**
   * TÆRSKLEN ER IKKE TI. `required_stamps` sættes pr. belønning, og en butik
   * kan lige så godt vælge 6 eller 20. Hele gennemtesten kørte på ti, så det
   * her er dét, der holder fast i, at intet er skrevet fast til det tal.
   * Efterprøvet på et rigtigt kort med 6: belønning ved præcis 6/6, og et
   * syvende stempel gav "6 af 6" plus "+1 ekstra stempel".
   */
  it.each([3, 6, 12, 20])("virker med %i stempler som tærskel", (kraevet) => {
    expect(stampProgress(kraevet - 1, kraevet).reached).toBe(false);
    expect(stampProgress(kraevet - 1, kraevet).overskydende).toBe(0);

    const netop = stampProgress(kraevet, kraevet);
    expect(netop.reached).toBe(true);
    expect(netop.overskydende).toBe(0);
    expect(netop.remaining).toBe(0);

    const over = stampProgress(kraevet + 2, kraevet);
    expect(over.overskydende).toBe(2);
    expect(Math.min(over.have, over.required)).toBe(kraevet);
  });

  /**
   * OG DE TO INDSTILLINGER SKAL BLIVE VED AT BETYDE HVER SIT. Begge er set
   * virke på et rigtigt kort med tærsklen 6: beholdes de overskydende, står
   * kortet på 1 efter indløsningen; gør de ikke, står det på 0.
   */
  it.each([3, 6, 12, 20])(
    "trækker det rigtige ved indløsning med tærskel %i",
    (kraevet) => {
      const saldo = kraevet + 2;
      expect(redemptionStampDelta(saldo, kraevet, true)).toBe(-kraevet);
      expect(redemptionStampDelta(saldo, kraevet, false)).toBe(-saldo);
    },
  );
});

describe("4. medarbejderen skal kunne logge ud", () => {
  /**
   * `/personale` er den ENESTE side, en medarbejder kan nå — dashboardet
   * sender dem tilbage hertil. Der var ingen "Log ud" nogen steder på den, og
   * på en delt telefon ved disken betyder det, at den forrige vagt stadig er
   * logget ind. Samme fejl som i menuen på dashboardet, bare aldrig rettet her.
   */
  it("personalesiden har en log ud-knap", () => {
    const side = kilde("src/app/personale/page.tsx");
    expect(side).toContain("Log ud");
    expect(side).toMatch(/action=\{signout\}/);
  });
});

describe("5. tilmeldingen må ikke tømme felterne", () => {
  /**
   * React nulstiller en formular, når en server action svarer. Et glemt
   * flueben ved vilkårene tømte derfor navn, e-mail OG telefon, og kunden
   * skulle skrive alt forfra — foran disken, på en telefon.
   */
  it("felterne er styrede, så et afvist forsøg ikke sletter det skrevne", () => {
    const form = kilde("src/app/kort/tilmeld/[slug]/self-enroll-form.tsx");
    for (const felt of ["navn", "email", "telefon", "vilkaar", "markedsfoering"]) {
      expect(form, `${felt} skal være styret`).toContain(`set${felt[0].toUpperCase()}${felt.slice(1)}`);
    }
    expect(form).toMatch(/value=\{navn\}/);
    expect(form).toMatch(/value=\{email\}/);
    expect(form).toMatch(/checked=\{vilkaar\}/);
  });

  /**
   * AFKRYDSNINGSFELTERNE KRÆVER MERE END EN TILSTAND. Efterprøvet på et rigtigt
   * preview: teksterne overlevede et afvist forsøg, men fluebenene sprang
   * tilbage. React nulstiller formularen, og for et styret afkrydsningsfelt
   * sættes DOM'ens `checked` tilbage, uden at React gentegner — tilstanden er
   * jo uændret. Et nyt `key` pr. svar fra handlingen tvinger dem forfra.
   */
  it("afkrydsningsfelterne tegnes forfra ved hvert svar", () => {
    const form = kilde("src/app/kort/tilmeld/[slug]/self-enroll-form.tsx");
    expect(form).toMatch(/key=\{`vilkaar-\$\{state\.forsoeg/);
    expect(form).toMatch(/key=\{`markedsfoering-\$\{state\.forsoeg/);

    // Og tælleren skal faktisk komme fra handlingen, ellers står key stille.
    const action = kilde("src/app/kort/actions.ts");
    expect(action).toMatch(/forsoeg = \(_prev\.forsoeg \?\? 0\) \+ 1/);
    // Ingen fejlvej i selfEnroll må gå uden om tælleren.
    const del = action.slice(
      action.indexOf("export async function selfEnroll"),
      action.indexOf("export async function claimCard"),
    );
    expect(del).not.toMatch(/return \{ error:/);
  });
});
