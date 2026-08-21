import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  canSell,
  canStartCheckout,
  koebSpaerre,
  isTestBuyer,
  stripeMode,
} from "./commerce";
import { getProduct, STRIPE_TAX_RATES, type Product } from "./constants";

/**
 * Spærren mod et halvfærdigt tilstandsskifte.
 *
 * Test og live er adskilte verdener i Stripe. Skifter man nøgle uden først at
 * køre scripts/setup-stripe-products.mjs, fejler salget på tre måder der ALLE
 * er stille — derfor er de dækket her og ikke overladt til en faktura.
 */

const KOMPLET = getProduct("loyalsum-komplet")!;
/** CVR'et er med, fordi købsspærren nu kræver et gyldigt — se koebSpaerre. */
const ejer = {
  email: "komplet@loyalbox.test",
  company: { cvr: "37811769" },
};

/** Samme vare, men uden id'er i nogen tilstand. */
function udenIds(p: Product): Product {
  return { ...p, stripe: undefined };
}

/** Samme vare, men kun oprettet i test — som før live-id'erne blev lagt ind. */
function kunTest(p: Product): Product {
  return { ...p, stripe: { test: p.stripe!.test } };
}

let oprindeligNøgle: string | undefined;
let oprindeligSats: string | undefined;

beforeEach(() => {
  oprindeligNøgle = process.env.STRIPE_SECRET_KEY;
  oprindeligSats = STRIPE_TAX_RATES.test;
});

afterEach(() => {
  if (oprindeligNøgle === undefined) delete process.env.STRIPE_SECRET_KEY;
  else process.env.STRIPE_SECRET_KEY = oprindeligNøgle;
  STRIPE_TAX_RATES.test = oprindeligSats;
});

describe("stripeMode", () => {
  it("afgøres af nøglen — alt andet end sk_live_ er test", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(stripeMode()).toBe("live");
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    expect(stripeMode()).toBe("test");
    delete process.env.STRIPE_SECRET_KEY;
    expect(stripeMode()).toBe("test");
  });
});

describe("canSell", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  });

  it("sælger varen når produkt, månedspris og moms findes", () => {
    expect(canSell(KOMPLET)).toBe(true);
  });

  it("nægter når produktet ikke er oprettet i tilstanden", () => {
    expect(canSell(udenIds(KOMPLET))).toBe(false);
  });

  it("nægter når månedsprisen mangler — ellers blev abonnementet et engangskøb", () => {
    const udenMåned: Product = {
      ...KOMPLET,
      stripe: { test: { ...KOMPLET.stripe!.test!, monthlyPriceId: undefined } },
    };
    expect(canSell(udenMåned)).toBe(false);
  });

  it("nægter når momssatsen mangler — ellers blev der ikke opkrævet moms", () => {
    STRIPE_TAX_RATES.test = undefined;
    expect(canSell(KOMPLET)).toBe(false);
  });

  it("nægter en vare der kun er oprettet i test, når vi kører live", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(canSell(kunTest(KOMPLET))).toBe(false);
  });

  it("sælger i live, når varen er oprettet i live", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(canSell(KOMPLET)).toBe(true);
  });
});

describe("canStartCheckout", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  });

  it("lukker testkonti med virksomhed igennem i testtilstand", () => {
    expect(canStartCheckout(ejer, KOMPLET)).toBe(true);
  });

  it("afviser en rigtig kunde i testtilstand", () => {
    expect(canStartCheckout({ ...ejer, email: "cafe@eksempel.dk" }, KOMPLET)).toBe(false);
  });

  it("afviser uden virksomhed — også admin, der aldrig har en", () => {
    expect(canStartCheckout({ email: "admin@loyalbox.test", company: null }, KOMPLET)).toBe(false);
    expect(canStartCheckout(null, KOMPLET)).toBe(false);
  });

  it("afviser når ingen vare er valgt", () => {
    expect(canStartCheckout(ejer, undefined)).toBe(false);
  });

  it("holder knappen lukket i live for en vare, der kun findes i test", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(
      canStartCheckout({ ...ejer, email: "cafe@eksempel.dk" }, kunTest(KOMPLET)),
    ).toBe(false);
  });

  it("lukker en helt almindelig kunde ind i live", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(
      canStartCheckout({ ...ejer, email: "cafe@eksempel.dk" }, KOMPLET),
    ).toBe(true);
  });

  it("afviser en virksomhed uden gyldigt CVR", () => {
    // Vi sælger kun til virksomheder. Stod kravet kun i /api/checkout, ville
    // knappen blive vist til nogen, ruten afviser.
    for (const cvr of [null, undefined, "", "1234", "37811768"]) {
      expect(
        canStartCheckout({ ...ejer, company: { cvr } }, KOMPLET),
        String(cvr),
      ).toBe(false);
    }
  });
});

describe("koebSpaerre", () => {
  beforeEach(() => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
  });

  it("siger hvad der er i vejen, så beskeden kan blive brugbar", () => {
    expect(koebSpaerre(ejer, KOMPLET)).toBeNull();
    expect(koebSpaerre({ ...ejer, company: null }, KOMPLET)).toBe(
      "ingen-virksomhed",
    );
    expect(koebSpaerre(ejer, undefined)).toBe("ikke-aabnet");
    expect(
      koebSpaerre({ ...ejer, company: { cvr: null } }, KOMPLET),
    ).toBe("cvr-mangler");
  });

  it("nævner ikke CVR i et miljø, hvor der alligevel ikke kan købes", () => {
    // En rigtig besøgende i testtilstand skal ikke sendes ud at finde sit
    // CVR-nummer for derefter at få at vide, at salget ikke er åbnet.
    expect(
      koebSpaerre(
        { email: "cafe@eksempel.dk", company: { cvr: null } },
        KOMPLET,
      ),
    ).toBe("ikke-aabnet");
  });
});

describe("isTestBuyer", () => {
  it("kender seed-domænet, uanset store bogstaver", () => {
    expect(isTestBuyer("Komplet@LoyalBox.test")).toBe(true);
    expect(isTestBuyer("cafe@eksempel.dk")).toBe(false);
    expect(isTestBuyer(null)).toBe(false);
  });
});
