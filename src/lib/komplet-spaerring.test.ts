import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS, hasLoyaltyAccess } from "./constants";

/**
 * Funktionerne, kun LoyalSum Komplet betaler for, SKAL være spærret.
 *
 * HVORFOR EN TEST OG IKKE BARE KODEN: `/dashboard/opslag` var slet ikke
 * spærret. Produktlisten har hele tiden sagt "Opslag af dine bedste
 * anmeldelser" under LoyalSum Komplet, men enhver med et dashboard — også en
 * Reviewstander Pro-kunde — kunne bruge siden. Det blev først opdaget ved en
 * gennemgang af, om forsiden passede med produkterne.
 *
 * Fejlen er TAVS og til kundens fordel: intet går i stykker, ingen klager, og
 * med tiden bliver den en vane, man ikke kan tage tilbage uden at forringe
 * noget, folk har vænnet sig til. Derfor testes der på, at spærringen findes
 * — ikke på at den virker i en bestemt situation.
 *
 * Der læses i FILEN og ikke via en import, fordi et layout er en
 * server-komponent: den kan ikke kaldes her uden hele Next-runtimen. Det, der
 * skal fanges, er heller ikke en forkert beregning, men at spærringen bliver
 * SLETTET — og det ser man i kilden.
 */

const KOMPLET_RUTER = ["loyalitet", "opslag"];

describe("Komplet-spærringer i dashboardet", () => {
  for (const rute of KOMPLET_RUTER) {
    const fil = join(process.cwd(), "src/app/dashboard", rute, "layout.tsx");

    it(`/dashboard/${rute} har et layout`, () => {
      expect(existsSync(fil), `mangler ${fil}`).toBe(true);
    });

    /**
     * `plan` duer IKKE som spærring: både Reviewstander Pro og LoyalSum
     * Komplet er niveau `pro`, så en kontrol på plan ville lukke begge ind.
     * Det er produktet, der skiller dem.
     */
    it(`/dashboard/${rute} spærrer på produktet og ikke på plan`, () => {
      const kilde = readFileSync(fil, "utf8");
      expect(kilde).toContain("hasLoyaltyAccess");
    });

    it(`/dashboard/${rute} siger hvad der skal købes`, () => {
      const kilde = readFileSync(fil, "utf8");
      expect(kilde).toContain("loyalsum-komplet");
    });
  }
});

describe("hasLoyaltyAccess", () => {
  it("giver kun adgang til varen med stempelkort", () => {
    const medAdgang = PRODUCTS.filter((p) => hasLoyaltyAccess(p.slug));
    expect(medAdgang.map((p) => p.slug)).toEqual(["loyalsum-komplet"]);
  });

  it("lukker Reviewstander Pro ude — den er også niveau pro", () => {
    expect(hasLoyaltyAccess("reviewstander-pro")).toBe(false);
  });

  it("svarer nej på ukendt og manglende vare", () => {
    expect(hasLoyaltyAccess(null)).toBe(false);
    expect(hasLoyaltyAccess("findes-ikke")).toBe(false);
  });
});

/**
 * KOMPLET-KUNDEN SKAL VIDE, AT STEMPELKORTET MANGLER.
 *
 * Knappen "Åbn dit stempelkort" på `/r/<slug>` vises kun, når butikken har et
 * `loyalty_programs` med status `active`. En frisk Komplet-kunde har altså
 * betalt for stempelkortet, uden at deres kunder kan se det — og INTET siger
 * fra: siden ser rigtig ud, og der er ingen fejl at opdage. Præcis samme
 * klasse som spærringerne ovenfor: tavs, og til ingens fordel.
 *
 * Læses i kilden, fordi siden er en server-komponent.
 */
describe("standersiden siger fra, når stempelkortet mangler", () => {
  const KILDE = readFileSync(
    join(process.cwd(), "src/app/dashboard/standere/[id]/page.tsx"),
    "utf8",
  );

  it("slår op, om der findes et aktivt program", () => {
    expect(KILDE).toMatch(/loyalty_programs/);
    expect(KILDE).toMatch(/"status",\s*"active"/);
  });

  /**
   * SPØRG OM PRODUKTET OG IKKE OM `plan`. Både Reviewstander Pro og LoyalSum
   * Komplet er niveau `pro`; forskellen ER stempelkortet. Spurgte vi planen,
   * ville en Pro-kunde få at vide, at de mangler noget, de ikke har købt.
   */
  it("spørger om produktet og ikke om planen", () => {
    expect(KILDE).toMatch(/hasLoyaltyAccess\(company\.product_slug\)/);
  });

  it("viser en vej videre og ikke bare en besked", () => {
    expect(KILDE).toMatch(/\/dashboard\/loyalitet\/programmer/);
  });
});
