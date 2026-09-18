import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { abonnementsSkifteSpaerre } from "./commerce";
import { abonnementsRang, getProduct, KATALOG } from "./constants";

/**
 * OPAD JA, NEDAD NEJ.
 *
 * En Pro-kunde må gå op til Komplet med et klik — det er en ren udvidelse.
 * Den anden vej tager et menneske: stempelkortet, medlemmerne, belønningerne
 * og opslagene hører til Komplet og forsvinder i samme sekund, og butikkens
 * kunder står med kort, der ikke virker.
 *
 * Og en vare, kunden ALLEREDE abonnerer på, er slet ikke et skifte: købet
 * ville lave abonnement nummer to på samme virksomhed, og der er kun ét
 * `stripe_subscription_id` at gemme det i. Det andet bliver usynligt og
 * trækker videre. Præcis dét skete på et rigtigt køb 14. september 2026.
 */

const PRO = getProduct("reviewstander-pro")!;
const KOMPLET = getProduct("loyalsum-komplet")!;
const BASIC = getProduct("reviewstander")!;
const TILKOEB = getProduct("ekstra-stander")!;

/** En kunde, der betaler for `slug` lige nu. */
const betaler = (slug: string) => ({
  product_slug: slug,
  stripe_status: "active",
});

describe("rangordenen", () => {
  it("følger månedsprisen: Komplet over Pro over ingenting", () => {
    expect(abonnementsRang(KOMPLET)).toBeGreaterThan(abonnementsRang(PRO));
    expect(abonnementsRang(PRO)).toBeGreaterThan(abonnementsRang(BASIC));
    expect(abonnementsRang(BASIC)).toBe(0);
  });

  /**
   * DET ER PRISEN, DER ER STIGEN. Kommer der en vare til, som koster mere uden
   * at indeholde mere, holder reglen op med at passe — og så skal rangen have
   * sin egen liste i stedet for at blive udledt. Prøven fanger dagen, det sker.
   *
   * TO VARER MÅ DELE EN PLADS, NÅR DE INDEHOLDER DET SAMME. LoyalSum Komplet
   * og LoyalSum Komplet Online har nøjagtig samme software til nøjagtig samme
   * månedspris; forskellen er en fysisk stander, som ikke er et trin på
   * softwarestigen. Det, der IKKE må ske, er to varer med FORSKELLIGT indhold
   * på samme trin — for så kan et skifte hverken være op eller ned.
   */
  it("giver hver softwarepakke sin egen plads", () => {
    const abonnementer = KATALOG.filter((p) => p.monthlyPrice);
    const prPlads = new Map<number, string[]>();
    for (const p of abonnementer) {
      const r = abonnementsRang(p);
      prPlads.set(r, [...(prPlads.get(r) ?? []), p.slug]);
    }

    for (const [r, slugs] of prPlads) {
      if (slugs.length === 1) continue;
      // Deler de plads, skal de indeholde det samme software.
      const software = new Set(
        slugs.map((s) =>
          JSON.stringify(
            Boolean(KATALOG.find((p) => p.slug === s)?.includesLoyalSum),
          ),
        ),
      );
      expect(
        software.size,
        `varer med forskelligt indhold deler plads ${r}: ${slugs.join(", ")}`,
      ).toBe(1);
    }
  });

  /*
   * OG ET SKIFTE MELLEM TO VARER PÅ SAMME TRIN ER SPÆRRET.
   *
   * Ikke fordi det ville være en nedgradering, men fordi et køb ville lave
   * ABONNEMENT NUMMER TO på samme virksomhed — og der er kun ét
   * `stripe_subscription_id` at gemme det i, så det andet ville trække penge
   * uden at kunne ses. En kunde, der vil skifte mellem Komplet og Komplet
   * Online, skal igennem os; en Online-kunde, der vil have et fysisk skilt,
   * køber tilkøbet i stedet og beholder sit abonnement.
   */
  it("spærrer et skifte mellem to varer på samme trin", () => {
    const paaSammeTrin = KATALOG.filter(
      (p) => abonnementsRang(p) === abonnementsRang(KOMPLET),
    );
    for (const p of paaSammeTrin) {
      if (p.slug === KOMPLET.slug) continue;
      expect(
        abonnementsSkifteSpaerre(betaler("loyalsum-komplet"), p),
        p.slug,
      ).not.toBeNull();
    }
  });
});

describe("abonnementsSkifteSpaerre", () => {
  it("lukker en Pro-kunde op til Komplet", () => {
    expect(abonnementsSkifteSpaerre(betaler("reviewstander-pro"), KOMPLET))
      .toBeNull();
  });

  it("afviser en Komplet-kunde på vej ned til Pro", () => {
    expect(
      abonnementsSkifteSpaerre(betaler("loyalsum-komplet"), PRO),
    ).toBe("nedgradering");
  });

  it("afviser den vare, kunden allerede betaler for", () => {
    for (const vare of [PRO, KOMPLET]) {
      expect(
        abonnementsSkifteSpaerre(betaler(vare.slug), vare),
        vare.slug,
      ).toBe("har-den-allerede");
    }
  });

  /**
   * ET ENGANGSKØB RØRER ALDRIG ET BESTÅENDE KUNDEFORHOLD — det er webhookens
   * regel, og spærren må ikke sige noget andet. Ellers ville en Komplet-kunde
   * ikke kunne købe et skilt mere.
   */
  it("rører ikke engangskøb og tilkøb", () => {
    expect(abonnementsSkifteSpaerre(betaler("loyalsum-komplet"), BASIC))
      .toBeNull();
    expect(abonnementsSkifteSpaerre(betaler("loyalsum-komplet"), TILKOEB))
      .toBeNull();
  });

  it("lader enhver uden abonnement købe frit", () => {
    expect(abonnementsSkifteSpaerre(null, KOMPLET)).toBeNull();
    expect(abonnementsSkifteSpaerre({}, KOMPLET)).toBeNull();
    // Basic ER en kunde, men uden abonnement — alt er en start for dem.
    expect(abonnementsSkifteSpaerre(betaler("reviewstander"), PRO)).toBeNull();
  });

  /**
   * ER ABONNEMENTET HOLDT OP MED AT BETALE, er der intet at beskytte — og en
   * genoptagelse skal kunne købes. Spærrede vi her, ville en opsagt
   * Komplet-kunde hverken kunne komme tilbage eller vælge noget mindre.
   */
  it("slipper alt igennem, når abonnementet ikke længere betaler", () => {
    for (const status of [
      "canceled",
      "past_due",
      "unpaid",
      "paused",
      "incomplete",
      null,
    ]) {
      const firma = { product_slug: "loyalsum-komplet", stripe_status: status };
      expect(abonnementsSkifteSpaerre(firma, PRO), String(status)).toBeNull();
      expect(abonnementsSkifteSpaerre(firma, KOMPLET), String(status)).toBeNull();
    }
  });

  it("regner en prøveperiode som betalende", () => {
    expect(
      abonnementsSkifteSpaerre(
        { product_slug: "loyalsum-komplet", stripe_status: "trialing" },
        PRO,
      ),
    ).toBe("nedgradering");
  });
});

/**
 * KNAPPEN OG BETALINGEN SKAL SVARE ENS.
 *
 * En knap kan skjules; en POST kan sendes alligevel. Ruten er derfor stedet,
 * det afgøres — men begge SKAL spørge den samme funktion, ellers viser sitet
 * en knap, ruten afviser. Det er hele grunden til, at `koebSpaerre()` findes.
 */
describe("ruten håndhæver det samme som knappen", () => {
  const RUTE = readFileSync(
    join(process.cwd(), "src/app/api/checkout/route.ts"),
    "utf8",
  );

  it("spørger spærren", () => {
    expect(RUTE).toMatch(/abonnementsSkifteSpaerre\(company, product\)/);
  });

  /**
   * GENOPTAGELSE ER UNDTAGET og skal være det: dér er abonnementet netop
   * ikke betalende, og kunden køber sin egen vare tilbage. Uden undtagelsen
   * ville en opsagt kunde ikke kunne komme ind igen.
   */
  it("lader en genoptagelse gå fri", () => {
    expect(RUTE).toMatch(/genoptag\s*\?\s*null/);
  });
});
