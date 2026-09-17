import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * ÉT OPSLAG I HEADEREN GJORDE TI MARKETINGSIDER DYNAMISKE.
 *
 * `SiteHeader` kaldte `getCurrentUser()` for at kunne skrive "Dashboard" i
 * stedet for "Log ind". Fordi headeren bæres af hver eneste side, læste hver
 * eneste side dermed en cookie — og en side, der læser en cookie, kan ikke
 * forudgenereres. **Målt 2026-09-17:** 66 af 73 ruter var dynamiske, og på ti
 * af dem var headeren den ENESTE grund (kun `/bestil` og
 * `/databehandleraftale` havde en anden).
 *
 * Konsekvensen var, at HTML'en fik `private, no-cache, no-store`:
 *
 *  - ingen marketingside kunne ligge på kanten, så hver visning blev bygget i
 *    Dublin — dyrest for dem, der er længst væk, og vi har en kunde i Nuuk;
 *  - **browserens bfcache var slået fra**, fordi `no-store` udelukker den, så
 *    back-knappen hentede siden forfra i stedet for at vise den med det samme.
 *
 * Efter opdelingen: ti ruter flyttet, `/` og syv andre er `○` statiske, og
 * blogartiklerne og produktsiderne er `●` forudgenererede. Efterprøvet i
 * browseren: `pageshow.persisted` er nu `true` ved et tilbage-tryk, og
 * JS-tilstanden overlever.
 *
 * DENNE PRØVE ER EN SPÆRRE, IKKE EN BESKRIVELSE. Gevinsten forsvinder i
 * stilhed, hvis nogen gør `SiteHeader` `async` igen eller lader den læse en
 * cookie — byggeriet siger ingenting, og siderne bliver bare dynamiske. Det
 * er præcis den slags, ingen opdager.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

describe("headeren holder marketingsiderne statiske", () => {
  const HEADER = kilde("src/components/site-header.tsx");

  it("SiteHeader er ikke async", () => {
    expect(
      HEADER,
      "en async header gør hver side, der bærer den, dynamisk",
    ).not.toMatch(/export\s+async\s+function\s+SiteHeader/);
    expect(HEADER).toMatch(/export\s+function\s+SiteHeader/);
  });

  /**
   * Det er ikke nok at fjerne `async`: et hvilket som helst opslag, der rører
   * anmodningen, gør det samme. Her fanges de tre veje ind — brugeren,
   * cookien og serverklienten, som selv læser cookies.
   */
  it("headeren rører ikke anmodningen", () => {
    for (const forbudt of [
      "getCurrentUser",
      "cookies(",
      "headers(",
      "createClient",
    ]) {
      expect(HEADER, `${forbudt} i site-header.tsx`).not.toContain(forbudt);
    }
  });

  it("det personlige stykke er en klientkomponent", () => {
    const KONTO = kilde("src/components/header-konto.tsx");
    expect(KONTO.trimStart().startsWith('"use client"')).toBe(true);
  });

  /**
   * DEN DYRE UDGAVE BLEV PRØVET FØRST. Supabases browserklient er korrekt og
   * læser endda udløbstiden — men den trak **64 KB JavaScript** ind på hver
   * eneste marketingside, og forsiden faldt fra 88 til 81 i produktion.
   * Billedgevinsten fra samme dag blev ædt af en knap. Et opslag i cookien
   * koster nul afhængigheder, og knappen er kosmetik.
   */
  it("knappen trækker ikke et auth-bibliotek med sig", () => {
    const KONTO = kilde("src/components/header-konto.tsx");
    for (const dyrt of ["@supabase", "supabase/client", "createClient"]) {
      expect(KONTO, `${dyrt} i headeren koster ~64 KB pr. besøgende`).not.toContain(
        dyrt,
      );
    }
    expect(KONTO, "sessionen aflæses ikke af cookien").toContain("document.cookie");
  });

  /**
   * EFTER AT BFCACHE VIRKER, ER DEN HER IKKE VALGFRI: en gendannet side
   * beholder sin gamle tilstand, så en, der loggede ud og trykkede tilbage,
   * ville stadig se "Dashboard".
   */
  it("tilstanden genlæses, når siden gendannes fra bfcache", () => {
    const KONTO = kilde("src/components/header-konto.tsx");
    expect(KONTO).toContain('addEventListener("pageshow"');
  });

  /**
   * ROLLEN SLÅS IKKE OP. Den ligger i `public.users` og ville være et
   * databaseopslag i browseren ved hver sidevisning — for at vælge mellem to
   * adresser, hvor den ene i forvejen sender videre til den anden.
   */
  it("der linkes til /dashboard og slås ikke en rolle op", () => {
    const KONTO = kilde("src/components/header-konto.tsx");
    expect(KONTO).toContain('href="/dashboard"');
    expect(KONTO).not.toMatch(/"admin"/);
    expect(KONTO).not.toContain('from("users")');
  });

  /**
   * PLADSEN ER RESERVERET. "Dashboard" er 111 px, mens "Log ind" + "Kom i
   * gang" er 208 — uden en fast bredde ville navigationen til venstre rykke
   * sig i det øjeblik, en logget ind bruger blev genkendt. Målt: med `min-w`
   * står navigationens højrekant på 1199 px i BEGGE tilstande.
   */
  it("knapgruppen reserverer sin plads, så intet flytter sig", () => {
    const KONTO = kilde("src/components/header-konto.tsx");
    const m = /min-w-\[(\d+)px\]/.exec(KONTO);
    expect(m, "ingen reserveret bredde — skiftet vil flytte navigationen").not.toBeNull();
    expect(Number(m![1]), "for smal til 'Log ind' + 'Kom i gang' (208 px)").toBeGreaterThanOrEqual(
      208,
    );
  });
});
