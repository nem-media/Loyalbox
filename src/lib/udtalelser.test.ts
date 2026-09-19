import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { UDTALELSER, synligeUdtalelser } from "./testimonials";

/**
 * EN OPDIGTET KUNDEUDTALELSE ER VILDLEDENDE MARKEDSFØRING.
 *
 * Sektionen blev bygget, før der var noget at citere, netop fordi designet
 * skulle kunne vurderes — og dét er også, hvordan en pladsholder ender med at
 * blive udrullet: den står der, den ser rigtig ud, og ingen husker at rydde
 * op. Spærren ligger derfor i koden og ikke i en huskeseddel.
 *
 * Prøverne her er billige og fanger præcis den fejl: en pladsholder uden
 * mærke, og en filtrering, der holder op med at filtrere.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

describe("udtalelser", () => {
  it("produktion viser kun godkendte citater", () => {
    const foer = process.env.NODE_ENV;
    /* `NODE_ENV` er skrivebeskyttet i TYPERNE og ikke i praksis — og det er
       netop produktionsgrenen, der skal prøves. `defineProperty` afvises af
       `process.env`s egen proxy ("only accepts a configurable, writable and
       enumerable data descriptor"), så værdien sættes som en almindelig
       tildeling gennem en utypet reference. */
    const env = process.env as Record<string, string | undefined>;
    try {
      env.NODE_ENV = "production";
      for (const u of synligeUdtalelser()) {
        expect(u.isPlaceholder, `${u.id} er en pladsholder i produktion`).toBe(
          undefined,
        );
      }
    } finally {
      env.NODE_ENV = foer;
    }
  });

  it("udvikling viser dem, så designet kan vurderes", () => {
    /* Uden dette led kunne filtreringen skrives om til "vis aldrig noget", og
       den første prøve ville stadig bestå — en spærre, der spærrer for alt,
       er ikke prøvet. */
    expect(synligeUdtalelser().length).toBe(UDTALELSER.length);
    expect(UDTALELSER.length).toBeGreaterThan(0);
  });

  it("hvert citat uden mærke er en påstand, nogen har sagt ja til", () => {
    /*
     * Prøven kan ikke vide, om et citat er ægte. Den kan holde fast i, at
     * listen i dag kun rummer pladsholdere — så den dag nogen skriver en
     * udtalelse ind UDEN mærke, fejler den og tvinger et bevidst valg frem
     * for en glidning.
     */
    const godkendte = UDTALELSER.filter((u) => !u.isPlaceholder);
    expect(
      godkendte,
      "en udtalelse uden isPlaceholder skal være et godkendt citat — " +
        "bekræft samtykket og opdatér denne prøve",
    ).toHaveLength(0);
  });

  it("sektionen tegner ingenting, når der ikke er noget at vise", () => {
    const s = kilde("src/components/home/udtalelser.tsx");
    expect(s).toMatch(/if \(udtalelser\.length === 0\) return null/);
  });
});

describe("avataren finder aldrig på et ansigt", () => {
  /*
   * Den farligste fejl her er ikke en bug, men en genvej: en tjeneste, der
   * laver et ansigt ud af et navn, ser hjælpsom ud og er en påstand om et
   * menneske, der ikke findes. Prøven leder efter de sædvanlige adresser.
   */
  const FORBUDTE = [
    "unsplash",
    "pravatar",
    "randomuser",
    "dicebear",
    "gravatar",
    "placeholder.com",
    "thispersondoesnotexist",
  ];

  for (const sti of [
    "src/components/ui/avatar.tsx",
    "src/components/home/udtalelser.tsx",
    "src/components/feedback-list.tsx",
  ]) {
    it(`${sti} henter ikke et menneske udefra`, () => {
      const s = kilde(sti).toLowerCase();
      for (const ord of FORBUDTE) {
        expect(s, `${sti} nævner ${ord}`).not.toContain(ord);
      }
    });
  }

  it("feedbacklisten sender navnet og ikke e-mailen til avataren", () => {
    /* En e-mail ville give bogstaver ud af noget, kunden ikke har valgt at
       vise — og en anonym tilbagemelding ville holde op med at være anonym. */
    const s = kilde("src/components/feedback-list.tsx");
    expect(s).toContain("KundeAvatar");
    expect(s).toMatch(/navn=\{f\.customer_name\}/);
    expect(s, "e-mailen må ikke blive til initialer").not.toMatch(
      /navn=\{f\.customer_email\}/,
    );
  });
});
