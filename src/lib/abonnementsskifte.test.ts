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
   */
  it("giver hver abonnementsvare sin egen plads", () => {
    const abonnementer = KATALOG.filter((p) => p.monthlyPrice);
    const rang = abonnementer.map(abonnementsRang);
    expect(new Set(rang).size, "to varer deler plads på stigen").toBe(
      rang.length,
    );
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
