import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { UDTALELSER, synligeUdtalelser, initialer } from "./testimonials";

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

  /*
   * HER STOD DET MODSATTE INDTIL 22. SEPTEMBER 2026.
   *
   * Prøven krævede, at listen KUN rummede pladsholdere, og fejlede med
   * "bekræft samtykket og opdatér denne prøve" den dag nogen skrev en rigtig
   * udtalelse ind. Det var hele dens formål: at tvinge et bevidst valg frem
   * for en glidning. Samtykket ER bekræftet — seks kunder har sagt ja til at
   * blive citeret anonymt — og prøven er derfor skiftet ud med den egenskab,
   * der gælder herfra.
   *
   * SPÆRREN SELV BLIVER STÅENDE (`synligeUdtalelser()` filtrerer stadig), så
   * den NÆSTE udtalelse kan skrives ind og ses lokalt, før nogen har sagt ja.
   */
  it("der ER godkendte citater, og de er alle sammen med", () => {
    const godkendte = UDTALELSER.filter((u) => !u.isPlaceholder);
    expect(godkendte.length).toBe(6);
  });

  /*
   * AFSENDEREN MÅ IKKE BLIVE EN PERSON.
   *
   * Kunderne er citeret anonymt som branche og landsdel. Kommer der en dag
   * et `navn`, et `virksomhed` eller et billedfelt på typen, er vi tilbage
   * ved personoplysninger, der kræver deres eget samtykke — og ved den
   * fælde, hele filen handler om: et ansigt eller et firmanavn ved siden af
   * et citat er en påstand om nogen. Prøven læser KILDEN, fordi et felt, der
   * ikke bruges endnu, er lige så meget en invitation.
   */
  it("der findes hverken navn, virksomhed eller billede på en udtalelse", () => {
    const s = kilde("src/lib/testimonials.ts");
    for (const felt of ["navn", "virksomhed", "billede", "foto", "avatar"]) {
      expect(
        new RegExp(`^\s*${felt}\??:`, "m").test(s),
        `\`${felt}\`ved siden af et citat er en påstand om et menneske`,
      ).toBe(false);
    }
  });

  /*
   * INITIALERNE UDLEDES, SÅ DE IKKE KAN SIGE NOGET ANDET END TEKSTEN UNDER.
   * Stod bogstaverne som deres eget felt, ville en rettet afsender efterlade
   * en avatar, der passer til den gamle — og dét er ikke til at få øje på.
   */
  it("hver afsender giver brugbare initialer", () => {
    expect(initialer("Bager i København")).toBe("BK");
    expect(initialer("Salon i Trekantsområdet")).toBe("ST");
    /* Ét ord giver ét bogstav — ikke det samme to gange. */
    expect(initialer("Bager")).toBe("B");
    for (const u of UDTALELSER) {
      const i = initialer(u.afsender);
      expect(i.length, `${u.id} giver ingen initialer`).toBeGreaterThan(0);
      expect(i.length, `${u.id} giver for mange initialer`).toBeLessThanOrEqual(2);
    }
  });

  /*
   * CITATET ER SAGT AF ET MENNESKE OG MÅ IKKE REDIGERES.
   * Prøven holder fast i ét af dem ordret. Den fanger ikke enhver
   * omskrivning, men den fanger dén, der sker ved et uheld: et søg-og-erstat
   * hen over filen.
   */
  it("citaterne står, som de er sagt", () => {
    const nr5 = UDTALELSER.find((u) => u.id === "butik-nordsj");
    expect(nr5?.citat.startsWith("Det har fungeret rigtig godt.")).toBe(true);
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
