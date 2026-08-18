import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { canSell, canStartCheckout, isTestBuyer, stripeMode } from "./commerce";
import { getProduct, STRIPE_TAX_RATES, type Product } from "./constants";

/**
 * Spærren mod et halvfærdigt tilstandsskifte.
 *
 * Test og live er adskilte verdener i Stripe. Skifter man nøgle uden først at
 * køre scripts/setup-stripe-products.mjs, fejler salget på tre måder der ALLE
 * er stille — derfor er de dækket her og ikke overladt til en faktura.
 */

const KOMPLET = getProduct("loyalsum-komplet")!;
const ejer = { email: "test-kunde@loyalbox.test", company: { id: "x" } };

/** Samme vare, men uden id'er i den aktuelle tilstand. */
function udenIds(p: Product): Product {
  return { ...p, stripe: undefined };
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

  it("nægter alt i live, så længe kun test-id'erne findes", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(canSell(KOMPLET)).toBe(false);
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
    expect(canStartCheckout({ email: "test-admin@loyalbox.test", company: null }, KOMPLET)).toBe(false);
    expect(canStartCheckout(null, KOMPLET)).toBe(false);
  });

  it("afviser når ingen vare er valgt", () => {
    expect(canStartCheckout(ejer, undefined)).toBe(false);
  });

  it("holder knappen lukket i live, indtil live-id'erne er lagt ind", () => {
    process.env.STRIPE_SECRET_KEY = "sk_live_abc";
    expect(canStartCheckout({ ...ejer, email: "cafe@eksempel.dk" }, KOMPLET)).toBe(false);
  });
});

describe("isTestBuyer", () => {
  it("kender seed-domænet, uanset store bogstaver", () => {
    expect(isTestBuyer("Test-Kunde@LoyalBox.test")).toBe(true);
    expect(isTestBuyer("cafe@eksempel.dk")).toBe(false);
    expect(isTestBuyer(null)).toBe(false);
  });
});
