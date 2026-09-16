import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * SIKKERHEDSHEADERE.
 *
 * MÅLT PÅ PRODUKTIONEN 2026-09-16: sitet sendte KUN
 * `Strict-Transport-Security`. Ingen `X-Frame-Options`, ingen
 * `frame-ancestors`, ingen `nosniff`, ingen `Referrer-Policy` — og
 * `/dashboard` kunne indlejres i en iframe.
 *
 * HVOR SLEMT ER DET? Efterprøvet frem for gættet. Indlejres `/dashboard` fra
 * et FREMMED domæne (example.com), viser rammen **loginsiden** og ikke
 * kundens dashboard: sessionscookien er `SameSite` og følger ikke med på
 * tværs af sites. Klassisk clickjacking af en indlogget kunde virker altså
 * ikke, og headerne her er hærdning — ikke lukningen af et åbent hul.
 *
 * Det er værd at sige præcist, for forskellen er stor: havde cookien været
 * `SameSite=None`, ville enhver side på internettet have kunnet lægge
 * usynlige knapper oven på kundens dashboard.
 *
 * CSP ER BEVIDST IKKE MED. Den ville betyde mest — auth-cookien kan læses fra
 * JavaScript, sådan som Supabase-klienten i browseren virker, så enhver XSS
 * ville give sessionen væk. Men en rigtig CSP på en Next-app kræver nonces og
 * en gennemgang af hver inline-stil; en halvfærdig CSP slår funktioner fra i
 * stilhed. Det er sit eget stykke arbejde med sin egen afprøvning.
 */

const KONFIG = readFileSync(join(process.cwd(), "next.config.ts"), "utf8");

/** Uden kommentarer: filen citerer med vilje de headere, den forklarer. */
const KODE = KONFIG.replace(/\/\*[\s\S]*?\*\//g, "").replace(
  /(^|[^:])\/\/.*$/gm,
  "$1",
);

describe("sitet sætter sine sikkerhedsheadere", () => {
  it("der findes en headers()-funktion", () => {
    expect(KODE).toMatch(/async headers\(\)/);
  });

  it("dækker alle ruter", () => {
    expect(KODE).toMatch(/source:\s*"\/:[^"]*\*"/);
  });

  /**
   * BEGGE SÆTTES. `frame-ancestors` er efterfølgeren, men ældre browsere
   * kender kun `X-Frame-Options` — og det er netop dem, der er værd at
   * beskytte, for de er også dem uden de nyere standardværdier.
   */
  it("nægter indlejring på to måder", () => {
    expect(KODE).toContain("X-Frame-Options");
    expect(KODE).toMatch(/DENY/);
    expect(KODE).toMatch(/frame-ancestors 'none'/);
  });

  it("slår MIME-sniffing fra", () => {
    expect(KODE).toContain("X-Content-Type-Options");
    expect(KODE).toContain("nosniff");
  });

  /**
   * KORTETS ADRESSE ER SELVE AUTORISATIONEN, og anmeldelsesflowet sender
   * kunden videre til Google eller Trustpilot. Moderne browsere sender kun
   * oprindelsen på tværs af sites, men det er en standardværdi og ikke et
   * løfte.
   */
  it("holder adresser tilbage på tværs af sites", () => {
    expect(KODE).toContain("Referrer-Policy");
    expect(KODE).toContain("strict-origin-when-cross-origin");
  });

  it("afviser de rettigheder, vi aldrig beder om", () => {
    expect(KODE).toContain("Permissions-Policy");
    for (const r of ["camera=()", "microphone=()", "geolocation=()"]) {
      expect(KODE, r).toContain(r);
    }
  });

  /**
   * EN HALVFÆRDIG CSP ER VÆRRE END INGEN. Sætter nogen en `script-src` her
   * uden nonces, holder siden op med at virke — i stilhed, og først i
   * produktionen. Prøven er en påmindelse om, at det skal være et bevidst
   * stykke arbejde og ikke en tilføjet linje.
   */
  it("har ikke fået en script-CSP smidt på i forbifarten", () => {
    const csp = /Content-Security-Policy[\s\S]{0,200}/.exec(KODE)?.[0] ?? "";
    expect(csp).not.toContain("script-src");
    expect(csp).not.toContain("default-src");
  });
});
