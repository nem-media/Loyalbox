import { describe, it, expect } from "vitest";
import { qrAdresseFor, standensDestination } from "./qr-adresse";
import { reviewUrl } from "./site";

/**
 * Hvad står der i QR-koden?
 *
 * DET ER DEN ENE TING PÅ SKILTET, DER SKAL VIRKE. Stjerner, man ikke kan se,
 * er en skønhedsfejl; en kode, der fører det forkerte sted hen, bliver trykt
 * og opdaget af en kunde, der står og scanner — og kan kun rettes med et nyt
 * tryk.
 *
 * Reglen er ikke en detalje ved trykfilen, men en produktgrænse: et
 * abonnement er en side hos os, et engangskøb er et skilt, kunden ejer.
 */

const basis = {
  destination_type: "google" as const,
  google_review_url: "https://g.page/r/CQm9xk1Fs2wQEBM/review",
  trustpilot_url: null,
  facebook_url: null,
  custom_url: null,
};

describe("qrAdresseFor", () => {
  /**
   * MED ABONNEMENT gennem os: butikken har en side, adressen kan pege et nyt
   * sted hen uden et nyt tryk, og det er dét, abonnementet betaler for.
   */
  it("sender en abonnents skilt gennem LoyalSum", () => {
    expect(
      qrAdresseFor({ ...basis, slug: "abc12345", kun_viderestilling: false }),
    ).toBe(reviewUrl("abc12345"));
  });

  /**
   * UDEN ABONNEMENT direkte til butikkens eget link. Går koden gennem os, har
   * vi påtaget os at holde en viderestilling kørende i al fremtid for en vare,
   * der blev betalt én gang — og skiltet dør den dag, vi ikke gør.
   */
  it("sender et engangskøb direkte til butikkens eget link", () => {
    const adresse = qrAdresseFor({
      ...basis,
      slug: "abc12345",
      kun_viderestilling: true,
    });
    expect(adresse).toBe(basis.google_review_url);
    expect(adresse).not.toContain("loyalsum.dk");
  });

  /**
   * Ingen destination betyder ingen kode. Pladsholderen bliver stående, og
   * admin må spørge kunden — det er ærligere end at trykke et gæt.
   */
  it("giver null, når der ikke er noget at pege på", () => {
    expect(
      qrAdresseFor({
        ...basis,
        google_review_url: null,
        slug: "abc12345",
        kun_viderestilling: true,
      }),
    ).toBeNull();
  });

  it("regner tomme mellemrum som ingen destination", () => {
    expect(
      qrAdresseFor({
        ...basis,
        google_review_url: "   ",
        slug: "abc12345",
        kun_viderestilling: true,
      }),
    ).toBeNull();
  });
});

describe("standensDestination", () => {
  /**
   * TYPEN AFGØR KOLONNEN. En butik, der er skiftet fra Google til Trustpilot,
   * har begge kolonner udfyldt — uden typen ville rækkefølgen i koden
   * bestemme, hvor skiltet førte hen.
   */
  it("læser den kolonne, typen peger på — også når flere er udfyldt", () => {
    const begge = {
      ...basis,
      destination_type: "trustpilot" as const,
      trustpilot_url: "https://dk.trustpilot.com/evaluate/butik.dk",
    };
    expect(standensDestination(begge)).toBe(begge.trustpilot_url);
  });

  it("falder tilbage til det frie felt, når typen ikke er en platform", () => {
    expect(
      standensDestination({
        destination_type: "custom",
        google_review_url: null,
        trustpilot_url: null,
        facebook_url: null,
        custom_url: "https://butik.dk/anmeld",
      }),
    ).toBe("https://butik.dk/anmeld");
  });
});
