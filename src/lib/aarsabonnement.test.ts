import { describe, it, expect } from "vitest";
import {
  PRODUCTS,
  KATALOG,
  aarsPris,
  aarsBesparelse,
  abonnementsRang,
  getProduct,
  MAANEDER_I_AARSPRIS,
} from "./constants";
import { aarsSkifteSpaerre } from "./aarsabonnement";

/**
 * ÅRSBETALING — ELLEVE MÅNEDER FOR TOLV.
 *
 * Tre ting kan gå galt her, og alle tre koster rigtige penge.
 */
describe("årsprisen", () => {
  it("regnes af månedsprisen og skrives aldrig i hånden", () => {
    /* Står tallet både som 399 og som 4.389 i kataloget, kommer de i utakt
       den dag, månedsprisen ændres — og begge ser rigtige ud hver for sig. */
    for (const p of PRODUCTS.filter((v) => v.monthlyPrice)) {
      expect(aarsPris(p), p.slug).toBe(p.monthlyPrice! * MAANEDER_I_AARSPRIS);
    }
  });

  it("er elleve måneder, så besparelsen er præcis én", () => {
    const k = getProduct("loyalsum-komplet")!;
    expect(MAANEDER_I_AARSPRIS).toBe(11);
    expect(aarsPris(k)).toBe(4389);
    expect(aarsBesparelse(k)).toBe(k.monthlyPrice);
    expect(aarsPris(k)! + aarsBesparelse(k)!).toBe(k.monthlyPrice! * 12);
  });

  it("findes ikke på en vare uden månedspris", () => {
    for (const p of PRODUCTS.filter((v) => !v.monthlyPrice)) {
      expect(aarsPris(p), p.slug).toBeNull();
      expect(aarsBesparelse(p), p.slug).toBeNull();
    }
    expect(aarsPris(undefined)).toBeNull();
  });

  /**
   * RANGEN ER MÅNEDSPRISEN — OG DET SKAL DEN BLIVE VED MED AT VÆRE.
   *
   * `abonnementsSkifteSpaerre()` bruger `abonnementsRang()` til at afgøre
   * opad/nedad. Begyndte rangen at bruge årsprisen, ville et Pro-årsabonnement
   * (1.089) rangere OVER et Komplet-månedsabonnement (399) — og så ville
   * systemet tro, at en nedgradering var en opgradering, og lade kunden købe
   * sig NED uden at spærre. Stigen er prisen PR. MÅNED, uanset hvor tit der
   * betales.
   */
  it("rangen påvirkes ikke af årsprisen", () => {
    const pro = getProduct("reviewstander-pro")!;
    const komplet = getProduct("loyalsum-komplet")!;
    expect(abonnementsRang(pro)).toBe(pro.monthlyPrice);
    expect(abonnementsRang(komplet)).toBe(komplet.monthlyPrice);
    expect(abonnementsRang(komplet)).toBeGreaterThan(abonnementsRang(pro));
    /* Og årsprisen må ikke kunne bytte om på dem. */
    expect(aarsPris(pro)!).toBeLessThan(aarsPris(komplet)!);
  });
});

describe("spærren for et skifte til år", () => {
  const grund = { product_slug: "loyalsum-komplet", stripe_subscription_id: "sub_1" };

  it("kræver en virksomhed", () => {
    expect(aarsSkifteSpaerre(null)).toBe("ingen-virksomhed");
  });

  it("kræver et løbende abonnement", () => {
    expect(aarsSkifteSpaerre({ product_slug: "reviewstander" })).toBe(
      "intet-abonnement",
    );
    expect(aarsSkifteSpaerre({ product_slug: "loyalsum-komplet" })).toBe(
      "intet-abonnement",
    );
  });

  /**
   * EN KUNDE I RESTANCE SKAL IKKE SKIFTE. Et skifte fakturerer straks, og en
   * årsregning til et kort, der lige har afvist en månedsregning, hjælper
   * ingen. Genoptagelsen er vejen ud af en suspension — ikke en større regning.
   */
  it("afviser en kunde, der ikke betaler", () => {
    expect(
      aarsSkifteSpaerre({ ...grund, stripe_status: "past_due" }),
    ).not.toBeNull();
    expect(
      aarsSkifteSpaerre({ ...grund, stripe_status: "canceled" }),
    ).not.toBeNull();
  });
});

/**
 * PRISOBJEKTET SKAL FINDES I BEGGE TILSTANDE, FØR ÅRSVEJEN ÅBNES I LIVE.
 *
 * Det er samme regel som for varen uden `stripe`-blok: "en halv opsætning er
 * værre end ingen". Prøven her er ikke et krav om, at live ER sat op — den
 * kræver, at KATALOGET ikke påstår noget andet end det, der findes. Står der
 * et `yearlyPriceId` i live, skal der også stå et i test, og omvendt må test
 * gerne gå forud.
 */
describe("katalogets årspris-id'er", () => {
  it("et live-id kræver også et test-id", () => {
    for (const p of KATALOG) {
      const live = p.stripe?.live?.yearlyPriceId;
      if (!live) continue;
      expect(
        p.stripe?.test?.yearlyPriceId,
        `${p.slug} har årspris i live, men ikke i test`,
      ).toBeTruthy();
    }
  });

  it("et årspris-id hører kun til en vare med månedspris", () => {
    for (const p of PRODUCTS) {
      for (const tilstand of ["test", "live"] as const) {
        if (p.stripe?.[tilstand]?.yearlyPriceId) {
          expect(
            p.monthlyPrice,
            `${p.slug} har en årspris uden en månedspris at regne den af`,
          ).toBeGreaterThan(0);
        }
      }
    }
  });
});
