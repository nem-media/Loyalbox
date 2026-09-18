import { describe, it, expect } from "vitest";
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS, hasLoyaltyAccess, KOMPLET_FUNKTIONER } from "./constants";

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

/*
 * RUTERNE UDLEDES AF `KOMPLET_FUNKTIONER` og skrives ikke i hånden her.
 *
 * Listen er dét, abonnementsoversigten viser kunden som "ikke med i dit
 * abonnement". Står en linje dér uden en spærring bag sig, siger vi nej på
 * skærmen og ja i koden — og det er værre end begge dele hver for sig.
 * Tilføjes en fjerde funktion, fejler prøven, indtil ruten har et layout.
 */
const KOMPLET_RUTER = KOMPLET_FUNKTIONER.map((f) => f.rute);

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

/**
 * MEDARBEJDERE FØLGER STEMPELKORTET — OG SPÆRRINGEN SKAL LIGGE I HANDLINGEN.
 *
 * Personale hang før på `harAbonnement()`, altså "har du købt en løbende
 * vare" — og både Reviewstander Pro (99 kr.) og LoyalSum Komplet (399 kr.)
 * svarer ja på dét. En Pro-kunde kunne derfor invitere ansatte ind til en
 * funktion, de ikke har købt: den ansatte logger ind og møder et panel uden
 * kort at stemple.
 *
 * ET LAYOUT ER IKKE ADGANGSKONTROL. Det tegner en skærm; server-handlingerne
 * kan kaldes direkte. Derfor prøves BEGGE dele.
 */
describe("medarbejdere hører til Komplet", () => {
  const ACTIONS = readFileSync(
    join(process.cwd(), "src/app/dashboard/personale/actions.ts"),
    "utf8",
  );

  it("spærrer de handlinger, der GIVER adgang", () => {
    // `kraevMedarbejderadgang()` spørger både om ejerskab og om planen.
    for (const navn of [
      "addEmployee",
      "updateEmployee",
      "resendEmployeeInvite",
    ]) {
      const i = ACTIONS.indexOf(`export async function ${navn}`);
      expect(i, navn).toBeGreaterThan(-1);
      expect(ACTIONS.slice(i, i + 400), navn).toContain(
        "kraevMedarbejderadgang()",
      );
    }
  });

  /**
   * AT LUKKE EN ADGANG SKAL ALTID KUNNE LADE SIG GØRE. En butik uden
   * medarbejdere i planen kan sagtens have nogle stående fra før, og en
   * spærring må aldrig fange nogen med en adgang, de ikke kan komme af med.
   * Derfor er `removeEmployee` fri, og `setEmployeeActive` spærrer KUN, når
   * der åbnes.
   */
  it("lader butikken fjerne og lukke uanset planen", () => {
    const i = ACTIONS.indexOf("export async function removeEmployee");
    expect(ACTIONS.slice(i, i + 400)).not.toContain("medarbejdereIPlan");

    const j = ACTIONS.indexOf("export async function setEmployeeActive");
    expect(ACTIONS.slice(j, j + 900)).toContain(
      "active && !(await medarbejdereIPlan(",
    );
  });

  /** Reglen ligger ÉT sted, så layoutet og handlingen ikke kan svare forskelligt. */
  it("afgør adgangen på produktet og ikke på plan", () => {
    const plan = readFileSync(
      join(process.cwd(), "src/lib/loyalty/plan.ts"),
      "utf8",
    );
    const i = plan.indexOf("export async function medarbejdereIPlan");
    expect(i).toBeGreaterThan(-1);
    expect(plan.slice(i, i + 300)).toContain("hasLoyaltyAccess");
  });
});

/**
 * OVERSIGTEN SKAL SIGE BÅDE JA OG NEJ.
 *
 * En Pro-kunde skal kunne se på sin abonnementsside, at stempelkort, opslag
 * og medarbejderadgang IKKE er med — ellers opdager de det først den dag, de
 * rammer muren inde i dashboardet.
 */
describe("abonnementsoversigten viser Komplet-funktionerne", () => {
  it("bygger listen på KOMPLET_FUNKTIONER", () => {
    const side = readFileSync(
      join(process.cwd(), "src/app/dashboard/abonnement/page.tsx"),
      "utf8",
    );
    expect(side).toContain("KOMPLET_FUNKTIONER");
    // Flaget er PRODUKTET og ikke niveauet — Pro og Komplet er samme `plan`.
    expect(side).toContain("hasLoyaltyAccess");
  });

  it("lover ikke, at opslag sker af sig selv", () => {
    const opslag = KOMPLET_FUNKTIONER.find((f) => f.rute === "opslag");
    expect(opslag).toBeTruthy();
    // Kunden vælger tekst og baggrund, henter billedet og deler det SELV.
    expect(opslag!.help).toMatch(/selv/i);
    expect(opslag!.help).not.toMatch(/automatisk|af sig selv/i);
  });
});

describe("hasLoyaltyAccess", () => {
  /*
   * BEGGE KOMPLET-VARER — OG KUN DEM.
   *
   * LoyalSum Komplet og LoyalSum Komplet Online er den SAMME software; den
   * ene har en stander med, den anden ikke. Adgangen hænger derfor på
   * `includesLoyalSum` og ikke på et navn, og prøven læser kataloget frem for
   * en håndskrevet liste: kommer der en femte vare med hele platformen, skal
   * den med af sig selv — og kommer der en uden, må den ikke slippe ind.
   */
  it("giver adgang til præcis de varer, der indeholder platformen", () => {
    const medAdgang = PRODUCTS.filter((p) => hasLoyaltyAccess(p.slug))
      .map((p) => p.slug)
      .sort();
    const komplette = PRODUCTS.filter((p) => p.includesLoyalSum)
      .map((p) => p.slug)
      .sort();
    expect(medAdgang).toEqual(komplette);
    expect(medAdgang).toContain("loyalsum-komplet");
    expect(medAdgang).toContain("loyalsum-komplet-online");
  });

  /*
   * OG DE TO HAR NØJAGTIG SAMME SOFTWAREFUNKTIONER.
   *
   * Det er hele produktreglen: Online er ikke en light-udgave. Fordi adgangen
   * afgøres ét sted (`hasLoyaltyAccess`), kan de to ikke komme i utakt — men
   * prøven siger det højt, så en fremtidig undtagelse skal skrives med vilje.
   */
  it("de to Komplet-varer har de samme funktioner", () => {
    const svar = (slug: string) =>
      KOMPLET_FUNKTIONER.map((f) => `${f.rute}:${hasLoyaltyAccess(slug)}`);
    expect(svar("loyalsum-komplet-online")).toEqual(svar("loyalsum-komplet"));
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
