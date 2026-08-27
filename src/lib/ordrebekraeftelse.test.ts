import { describe, it, expect } from "vitest";
import { ordrebekraeftelse } from "./ordrebekraeftelse";
import { ordrevarsel, type Ordredetaljer } from "./ordrevarsel";
import { COMPANY } from "./constants";

/**
 * Ordrebekræftelsen til kunden.
 *
 * FØR DEN FANDTES hørte kunden ingenting efter et køb: Stripes egen kvittering
 * er slået fra i dashboardet, og vi sendte kun et varsel til os selv. En
 * bestilling, man ikke kan se bevis på, føles som en, der ikke gik igennem.
 *
 * Det, der kan gå galt i en bekræftelse, er ikke at den mangler et ord — det
 * er at den siger et forkert BELØB eller lover en levering, vi ikke laver.
 */

const engangs: Ordredetaljer = {
  type: "engangskoeb",
  vare: "Reviewstander",
  antal: 2,
  beloeb: 798,
  maanedligt: null,
  firmanavn: "Café Aurora",
  cvr: "37811769",
  email: "hej@cafeaurora.dk",
  leveringslinjer: ["Café Aurora", "Bredgade 1", "1260 København", "DK"],
  sessionId: "cs_test_123",
};

const abonnement: Ordredetaljer = {
  ...engangs,
  type: "nyt-abonnement",
  vare: "LoyalSum Komplet",
  antal: 1,
  beloeb: 399,
  maanedligt: 399,
};

describe("ordrebekraeftelse", () => {
  it("siger hvad der er købt og hvad der er betalt", () => {
    const { emne, tekst } = ordrebekraeftelse(engangs);
    expect(emne).toContain("Reviewstander");
    expect(tekst).toContain("Reviewstander");
    expect(tekst).toContain("× 2");
    expect(tekst).toContain("798");
  });

  /**
   * MOMSEN ER DEN FARLIGE. Priserne på sitet er uden moms, men beløbet på
   * kortet er MED. Står der kun ét tal uden forklaring, ser bekræftelsen ud
   * til at handle om et andet køb end det, kunden kan se i banken.
   */
  it("forklarer, at beløbet er uden moms", () => {
    const { tekst } = ordrebekraeftelse(engangs);
    expect(tekst).toContain("uden moms");
    expect(tekst).toContain("25 %");
  });

  it("skriver månedsbeløbet, når der er et abonnement", () => {
    expect(ordrebekraeftelse(abonnement).tekst).toContain("pr. måned");
  });

  it("lover ikke et abonnement, når der ikke er et", () => {
    expect(ordrebekraeftelse(engangs).tekst).not.toContain("pr. måned");
  });

  /** Leveringstiden hentes fra COMPANY, så den ikke kan sige noget andet end betingelserne. */
  it("bruger den samme leveringstid som handelsbetingelserne", () => {
    expect(ordrebekraeftelse(engangs).tekst).toContain(COMPANY.deliveryDays);
  });

  it("lover ikke levering, når der ikke sendes noget", () => {
    const uden = { ...engangs, leveringslinjer: [] };
    const { tekst } = ordrebekraeftelse(uden);
    expect(tekst).not.toContain(COMPANY.deliveryDays);
    expect(tekst).not.toContain("Sendes til");
  });

  it("viser adressen, kunden faktisk har opgivet", () => {
    const { tekst } = ordrebekraeftelse(engangs);
    for (const l of engangs.leveringslinjer) expect(tekst).toContain(l);
  });

  it("kan skrives uden firmanavn uden at se i stykker ud", () => {
    const { tekst } = ordrebekraeftelse({ ...engangs, firmanavn: null });
    expect(tekst.startsWith("Hej\n")).toBe(true);
    expect(tekst).not.toContain("null");
  });

  it("siger hvor man kan spørge", () => {
    expect(ordrebekraeftelse(engangs).tekst).toContain(COMPANY.email);
  });
});

describe("de to mails om samme køb", () => {
  /**
   * Varslet til os og bekræftelsen til kunden bygges på SAMME Ordredetaljer.
   * Testen findes for at fastholde det: laver nogen en parallel datastruktur
   * til den ene, kan de to komme til at sige forskellige ting om det samme
   * køb — og det er kundens udgave, der bliver troet på.
   */
  it("nævner samme vare og samme beløb", () => {
    const kunde = ordrebekraeftelse(engangs);
    const intern = ordrevarsel(engangs);
    expect(kunde.tekst).toContain(engangs.vare);
    expect(intern.tekst).toContain(engangs.vare);
    expect(kunde.tekst).toContain("798");
    expect(intern.tekst).toContain("798");
  });

  /** Emnerne skal kunne kendes fra hinanden i en indbakke. */
  it("har hver sit emne", () => {
    expect(ordrebekraeftelse(engangs).emne).not.toBe(ordrevarsel(engangs).emne);
    expect(ordrebekraeftelse(engangs).emne).toContain("Tak for din bestilling");
  });
});
