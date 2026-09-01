import { describe, it, expect } from "vitest";
import {
  ABONNEMENTS_SLUGS,
  TILSTAND_ETIKET,
  kraeverHandling,
  maanedligOmsaetning,
  maanedspris,
  produktNavn,
  sorterAbonnenter,
  stripeStatusTekst,
  type AbonnentFelter,
} from "./abonnenter";
import { PRODUCTS } from "./constants";

/**
 * Abonnentlisten er en skærm, man træffer beslutninger ud fra: hvem skal der
 * ringes til, og hvad kommer der ind i denne måned. Det, der kan gå galt, er
 * ikke, at siden fejler — det er, at den ser rigtig ud og siger noget forkert.
 * En kunde, der er holdt op med at betale, men står som aktiv, er værre end en
 * side, der ikke virker.
 */

/** En række med det mindste, der skal til. Overskriv kun det, prøven handler om. */
function raekke(over: Partial<AbonnentFelter & { name: string }> = {}) {
  return {
    name: "Testbutikken",
    product_slug: "reviewstander-pro",
    stripe_subscription_id: "sub_1",
    stripe_status: "active",
    suspenderet_siden: null,
    ophoert_den: null,
    sletning_udfoeres_den: null,
    ...over,
  };
}

describe("hvem er abonnent", () => {
  /**
   * Listen UDLEDES af katalogets månedspris. Prøven findes, fordi en ny
   * abonnementsvare ellers ville mangle på abonnentsiden uden at noget fejlede
   * — og en vare, ingen kan se, er en vare, ingen opdager ikke bliver betalt.
   */
  it("er præcis de varer, der har en månedspris", () => {
    const medMaanedspris = PRODUCTS.filter((p) => p.monthlyPrice).map((p) => p.slug);
    expect([...ABONNEMENTS_SLUGS].sort()).toEqual([...medMaanedspris].sort());
    expect(ABONNEMENTS_SLUGS.length).toBeGreaterThan(0);
  });

  /**
   * Engangskøbet må ALDRIG med. "Reviewstander" købes uden konto som et trykt
   * skilt, der viderestiller — der er intet at fakturere månedligt, og en
   * plads på abonnentlisten ville få nogen til at lede efter en betaling, der
   * aldrig har eksisteret.
   */
  it("holder engangskøbet ude", () => {
    expect(ABONNEMENTS_SLUGS).not.toContain("reviewstander");
    expect(maanedspris("reviewstander")).toBeNull();
  });

  it("kender månedsprisen på abonnementsvarerne", () => {
    for (const slug of ABONNEMENTS_SLUGS) {
      expect(maanedspris(slug), slug).toBeGreaterThan(0);
    }
  });

  /** En ukendt slug må ikke blive til en tom celle — så ligner det vores fejl. */
  it("skriver en ukendt vare ud frem for at tie", () => {
    expect(produktNavn("noget-der-ikke-findes")).toBe("noget-der-ikke-findes");
    expect(produktNavn(null)).toBe("Intet produkt");
  });
});

describe("kræver handling", () => {
  it("lader en betalende kunde være i fred", () => {
    expect(kraeverHandling(raekke())).toBe(false);
    expect(kraeverHandling(raekke({ stripe_status: "trialing" }))).toBe(false);
  });

  it("fanger den suspenderede og den ophørte", () => {
    expect(
      kraeverHandling(
        raekke({
          stripe_status: "past_due",
          suspenderet_siden: "2026-06-01T00:00:00Z",
        }),
      ),
    ).toBe(true);
    expect(kraeverHandling(raekke({ ophoert_den: "2026-01-01T00:00:00Z" }))).toBe(
      true,
    );
  });

  /**
   * DEN, DER ELLERS SLIPPER IGENNEM. `suspenderet_siden` og `stripe_status`
   * skrives af hver sin webhook-hændelse. Kommer statussen først, står kunden
   * med en fejlet betaling og en tilstand, der stadig siger "aktiv" — og en
   * prøve, der kun så på tilstanden, ville kalde hende rask.
   */
  it("fanger en fejlet betaling, før suspensionen er noteret", () => {
    expect(
      kraeverHandling(raekke({ stripe_status: "past_due", suspenderet_siden: null })),
    ).toBe(true);
  });

  /**
   * Den dyreste af dem alle: sat op i hånden i admin, aldrig faktureret. Der
   * er en abonnementsvare på virksomheden og ingen status hos Stripe — der
   * kommer ingen penge ind, og intet andet i systemet siger fra.
   */
  it("fanger en abonnementsvare, der aldrig er blevet faktureret", () => {
    expect(
      kraeverHandling(
        raekke({ stripe_subscription_id: null, stripe_status: null }),
      ),
    ).toBe(true);
  });
});

describe("månedlig omsætning", () => {
  /**
   * KUN DEM, DER FAKTISK BETALER. En suspenderet kunde er stadig kunde, og
   * hendes data er urørte — men pengene kommer ikke ind, og et tal, der lover
   * dem, er et forkert grundlag at planlægge efter.
   */
  it("tæller ikke en suspenderet kunde med", () => {
    const pro = maanedspris("reviewstander-pro")!;
    const raekker = [
      raekke(),
      raekke({ stripe_status: "past_due", suspenderet_siden: "2026-06-01T00:00:00Z" }),
    ];
    expect(maanedligOmsaetning(raekker)).toBe(pro);
  });

  /** Prøveperioder tæller med: de bliver til penge, medmindre kunden siger fra. */
  it("tæller en prøveperiode med", () => {
    const pro = maanedspris("reviewstander-pro")!;
    expect(maanedligOmsaetning([raekke({ stripe_status: "trialing" })])).toBe(pro);
  });

  it("lægger de to abonnementsvarer sammen", () => {
    const sum = ABONNEMENTS_SLUGS.reduce((s, slug) => s + maanedspris(slug)!, 0);
    expect(
      maanedligOmsaetning(ABONNEMENTS_SLUGS.map((slug) => raekke({ product_slug: slug }))),
    ).toBe(sum);
  });

  it("er nul, når ingen betaler", () => {
    expect(maanedligOmsaetning([])).toBe(0);
    expect(maanedligOmsaetning([raekke({ stripe_status: "canceled" })])).toBe(0);
  });
});

describe("rækkefølgen", () => {
  /**
   * SIDENS POINTE. Det, der kræver noget, står øverst — ellers er listen en
   * rapport, man skal læse hele vejen igennem for at finde ud af, om der er
   * noget galt.
   */
  it("sætter dem, der kræver handling, øverst", () => {
    const sorteret = sorterAbonnenter([
      raekke({ name: "Anna" }),
      raekke({ name: "Bo", stripe_status: "past_due" }),
      raekke({ name: "Carl" }),
    ]);
    expect(sorteret.map((r) => r.name)).toEqual(["Bo", "Anna", "Carl"]);
  });

  /**
   * DANSK SORTERING, IKKE ENGELSK. Æ, Ø og Å står EFTER Z i det danske
   * alfabet. Med den engelske sortering lander Ø oppe ved O, og en, der leder
   * alfabetisk efter Østergaard, finder ikke butikken.
   */
  it("lægger ÆØÅ efter Z og ikke ved deres latinske slægtninge", () => {
    const sorteret = sorterAbonnenter([
      raekke({ name: "Ødegaard" }),
      raekke({ name: "Zeuthen" }),
    ]);
    expect(sorteret.map((r) => r.name)).toEqual(["Zeuthen", "Ødegaard"]);
  });

  /**
   * OG "AA" LÆSES SOM "Å" — altså også efter Z. Det er overraskende nok til at
   * ligne en fejl: "Aarhus" ser ud til at høre til i toppen og lander i
   * bunden. Prøven står her, så ingen "retter" sorteringen til noget, der
   * føles rigtigt og er forkert dansk.
   */
  it("læser Aa som Å og sætter det sidst", () => {
    const sorteret = sorterAbonnenter([
      raekke({ name: "Aarhus" }),
      raekke({ name: "Ødegaard" }),
      raekke({ name: "Bagerens" }),
    ]);
    expect(sorteret.map((r) => r.name)).toEqual([
      "Bagerens",
      "Ødegaard",
      "Aarhus",
    ]);
  });

  /** Rækkerne tælles også med af siden. En sortering på stedet ville flytte dem under den. */
  it("rører ikke listen, den fik", () => {
    const original = [raekke({ name: "B" }), raekke({ name: "A" })];
    const kopi = [...original];
    sorterAbonnenter(original);
    expect(original).toEqual(kopi);
  });
});

describe("statusteksten", () => {
  it("oversætter de statusser, Stripe faktisk sender", () => {
    expect(stripeStatusTekst("active")).toMatch(/normalt/i);
    // Forskellen på de to er, om Stripe stadig prøver — og det afgør, om der
    // skal ringes til kunden nu eller om der kan ventes.
    expect(stripeStatusTekst("past_due")).toMatch(/prøver igen/i);
    expect(stripeStatusTekst("unpaid")).toMatch(/opgivet/i);
  });

  /**
   * EN UKENDT STATUS SKRIVES UD RÅT. Stripe tilføjer statusser; den dag det
   * sker, skal der stå noget, man kan slå op, i stedet for et tomt felt, der
   * ligner en fejl i vores egen kode.
   */
  it("skriver en ukendt status ud i stedet for at skjule den", () => {
    expect(stripeStatusTekst("noget_helt_nyt")).toContain("noget_helt_nyt");
  });

  it("siger det ligeud, når der slet ikke er et abonnement", () => {
    expect(stripeStatusTekst(null)).toMatch(/intet abonnement/i);
  });
});

describe("etiketterne", () => {
  /** Alle tre tilstande skal have en etiket — en manglende ville give undefined på skærmen. */
  it("dækker alle tre tilstande med hver sin tone", () => {
    const toner = Object.values(TILSTAND_ETIKET).map((e) => e.tone);
    expect(Object.keys(TILSTAND_ETIKET).sort()).toEqual([
      "aktiv",
      "ophoert",
      "suspenderet",
    ]);
    expect(new Set(toner).size).toBe(3);
    for (const e of Object.values(TILSTAND_ETIKET)) {
      expect(e.label.length).toBeGreaterThan(0);
    }
  });
});
