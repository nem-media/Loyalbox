import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BETALTE_SESSIONER, sessionErBetalt } from "./commerce";

/**
 * KAMPAGNEKODER — OG HVORFOR DE ER ET NUL-BELØB, IKKE EN RABAT.
 *
 * Ønsket var at kunne give "tre måneder gratis" eller en stander med, uden at
 * røre priserne i KATALOG og uden en udrulning hver gang. Svaret er Stripes
 * egne kuponer plus `allow_promotion_codes: true` på sessionen. Ét ord — men
 * uden det findes feltet slet ikke i betalingsvinduet, og en kode, der er
 * oprettet hos Stripe, kan ikke indløses nogen steder.
 *
 * DEN FARLIGE GRÆNSE ER 100 %. Når rabatten dækker hele beløbet, opfører
 * Stripe sig ANDERLEDES, og det er dér, et køb kan gå tabt i stilhed:
 *
 *  - sessionen svarer `no_payment_required` i stedet for `paid`;
 *  - der oprettes ingen `payment_intent`.
 *
 * Læste webhooken kun efter `paid`, ville en gratis ordre blive stående som
 * `new` — "oprettet, aldrig betalt" — og aldrig blive pakket. Kunden ville
 * have et tilsagn og ingen stander, og INTET ville fejle undervejs: ingen
 * alarm, ingen log, ingen 500. Den slags opdages først, når nogen spørger,
 * hvor pakken blev af.
 *
 * Prøven er derfor en spærre om de led, der bærer gratis-tilfældet: feltet
 * skal findes i BEGGE betalingsflows, og `no_payment_required` skal tælle som
 * betalt.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

/** Begge steder, hvor en checkout-session bliver til. */
const FLOWS = [
  ["med konto", "src/app/api/checkout/route.ts"],
  ["uden konto", "src/app/bestil/uden-konto/actions.ts"],
] as const;

describe("rabatkoder kan indløses", () => {
  for (const [navn, sti] of FLOWS) {
    it(`betalingsvinduet ${navn} har et kampagnekodefelt`, () => {
      expect(
        kilde(sti),
        "uden allow_promotion_codes vises feltet ikke, og koden kan ikke tastes",
      ).toContain("allow_promotion_codes: true");
    });

    /*
     * Stripe afviser sessionen med "You cannot specify both `discounts` and
     * `allow_promotion_codes`". Lægges en fast rabat på i koden, forsvinder
     * kundens felt altså ikke stille — hele betalingen fejler.
     */
    it(`betalingsvinduet ${navn} lægger ikke selv en rabat på`, () => {
      expect(
        kilde(sti),
        "discounts og allow_promotion_codes udelukker hinanden hos Stripe",
      ).not.toMatch(/\bdiscounts\s*:/);
    });
  }
});

describe("et nul-beløb tæller som betalt", () => {
  it("no_payment_required er med blandt de betalte sessioner", () => {
    expect(
      BETALTE_SESSIONER as readonly string[],
      "uden denne ville en 100 %-rabat efterlade ordren ubetalt og upakket",
    ).toContain("no_payment_required");
  });

  it("sessionErBetalt siger ja til en fuldt rabatteret session", () => {
    expect(sessionErBetalt("no_payment_required")).toBe(true);
  });

  it("men stadig nej til en session, der venter på pengene", () => {
    // Klarna og flere bankmetoder svarer først senere. De må ikke pakkes.
    expect(sessionErBetalt("unpaid")).toBe(false);
    expect(sessionErBetalt(null)).toBe(false);
  });
});

/**
 * Betalingens id bruges to steder: som spor i admin, og som ANDET led i
 * `ryd_forladte_designs` (migration 0037). En gratis ordre har ingen — så
 * beskyttelsen af designet hviler dér på FØRSTE led, statussen. Går webhooken
 * over til kun at skrive betalings-id'et, ryger logoet efter syv døgn.
 */
describe("en gratis ordre må ikke tabe sit design", () => {
  const WEBHOOK = kilde("src/app/api/stripe/webhook/route.ts");

  it("webhooken flytter statussen og hænger ikke på betalings-id'et", () => {
    expect(WEBHOOK).toContain('status: "needs_onboarding"');
  });

  it("paymentIntentFor giver null frem for at kaste", () => {
    expect(WEBHOOK).toMatch(/Promise<string \| null>/);
  });
});
