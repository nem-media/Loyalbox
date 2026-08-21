import { describe, it, expect } from "vitest";
import {
  KATALOG,
  PRODUCTS,
  getProduct,
  priceFor,
  planForProduct,
  VOLUME_DISCOUNTS,
} from "./constants";

/**
 * Reglerne for et tilkøb — en vare, en bestående kunde køber oveni.
 *
 * De findes som test, fordi fejlen de forhindrer er stille: en Pro-kunde, der
 * bestilte et skilt mere, blev sat ned til Basic, fordi varen ingen månedspris
 * har. Det gik ikke i stykker nogen steder; kunden opdagede bare, at
 * dashboardet var lukket dagen efter.
 */
describe("tilkøb", () => {
  const ekstra = getProduct("ekstra-stander")!;

  it("kan slås op, men står ikke i det offentlige katalog", () => {
    // getProduct SKAL finde den — ellers kan der ikke købes.
    expect(ekstra).toBeDefined();
    expect(PRODUCTS).toContain(ekstra);
    expect(KATALOG).not.toContain(ekstra);
  });

  it("holder alle tilkøb ude af kataloget, ikke kun denne ene", () => {
    for (const p of KATALOG) {
      expect(p.addon, `${p.slug} er et tilkøb og hører ikke i kataloget`).not.toBe(
        true,
      );
    }
    expect(KATALOG.length).toBe(PRODUCTS.filter((p) => !p.addon).length);
  });

  it("har ingen månedspris — et tilkøb må aldrig tegne et abonnement", () => {
    for (const p of PRODUCTS.filter((p) => p.addon)) {
      expect(p.monthlyPrice, p.slug).toBeUndefined();
      expect(p.interval, p.slug).toBe("one_time");
    }
  });

  it("koster 399 med mængderabat som de øvrige standere", () => {
    expect(ekstra.price).toBe(399);
    expect(priceFor(ekstra, 1).standUnit).toBe(399);

    // Rabatten er den fælles VOLUME_DISCOUNTS og ikke en særregel.
    for (const trin of VOLUME_DISCOUNTS.filter((d) => d.discountPct > 0)) {
      const pris = priceFor(ekstra, trin.minQty);
      expect(pris.discountPct, `${trin.minQty} stk.`).toBe(trin.discountPct);
      expect(pris.standUnit).toBe(Math.round(399 * (1 - trin.discountPct / 100)));
    }
  });

  it("koster ingenting løbende, uanset antal", () => {
    expect(priceFor(ekstra, 5).monthly).toBe(0);
    expect(priceFor(ekstra, 5).setup).toBe(0);
  });

  it("ville sætte en kunde ned til basic — derfor må webhooken ikke bruge den", () => {
    // Det er præcis fejlen, spærren i webhooken findes for. Testen fastholder,
    // at faren stadig er reel, så ingen fjerner spærren i den tro at den er
    // overflødig: varen HAR ingen månedspris og giver derfor basic.
    expect(planForProduct(ekstra.slug)).toBe("basic");
  });

  it("har et varenummer, så produktionen kan kende den fra de andre", () => {
    expect(ekstra.mpn).toBeTruthy();
    expect(ekstra.mpn).not.toBe(getProduct("reviewstander")!.mpn);
  });

  it("ligger ikke i et Google Shopping-feed", () => {
    // Et tilkøb uden offentlig side må ikke annonceres — annoncen ville føre
    // til en side, der giver 404.
    for (const p of PRODUCTS.filter((p) => p.addon)) {
      expect(p.shoppable, p.slug).not.toBe(true);
    }
  });
});
