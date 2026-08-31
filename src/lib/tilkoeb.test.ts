import { describe, it, expect } from "vitest";
import {
  KATALOG,
  PRODUCTS,
  getProduct,
  priceFor,
  planForProduct,
  VOLUME_DISCOUNTS,
} from "./constants";
import { canSell } from "./commerce";

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

  it("koster det samme som de øvrige standere, med samme mængderabat", () => {
    // Prisen prøves mod KATALOGETS stander og ikke mod et tal skrevet her.
    // Testen skal fange, at tilkøbet kommer bagud, når prisen ændres — ikke
    // fejle hver gang den ændres.
    const stander = PRODUCTS.find((p) => p.slug === "reviewstander")!;
    expect(ekstra.price).toBe(stander.price);
    expect(priceFor(ekstra, 1).standUnit).toBe(stander.price);

    // Rabatten er den fælles VOLUME_DISCOUNTS og ikke en særregel.
    for (const trin of VOLUME_DISCOUNTS.filter((d) => d.discountPct > 0)) {
      const pris = priceFor(ekstra, trin.minQty);
      expect(pris.discountPct, `${trin.minQty} stk.`).toBe(trin.discountPct);
      expect(pris.standUnit).toBe(
        Math.round(stander.price * (1 - trin.discountPct / 100)),
      );
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

  it("kan sælges i testtilstand", () => {
    const foer = process.env.STRIPE_SECRET_KEY;
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    try {
      expect(canSell(ekstra)).toBe(true);
    } finally {
      process.env.STRIPE_SECRET_KEY = foer;
    }
  });

  it("ligger ikke i et Google Shopping-feed", () => {
    // Et tilkøb uden offentlig side må ikke annonceres — annoncen ville føre
    // til en side, der giver 404.
    for (const p of PRODUCTS.filter((p) => p.addon)) {
      expect(p.shoppable, p.slug).not.toBe(true);
    }
  });
});

/**
 * Et halvfærdigt tilstandsskifte er den fejl, der koster mest og ses mindst:
 * mangler en pris i den tilstand, nøglen peger på, bliver et abonnement til
 * et engangskøb, og mangler momssatsen, opkræves der ingen moms.
 *
 * canSell() spærrer for det ved købet. Denne test spærrer for, at et
 * ufuldstændigt sæt overhovedet når ind i constants.ts.
 */
describe("Stripe-id'er er komplette pr. tilstand", () => {
  it("har baade produkt og pris, hvor en tilstand er sat", () => {
    for (const p of PRODUCTS) {
      for (const [mode, ids] of Object.entries(p.stripe ?? {})) {
        expect(ids.productId, `${p.slug}/${mode}: produkt`).toBeTruthy();
        expect(ids.priceId, `${p.slug}/${mode}: pris`).toBeTruthy();

        // En vare med månedspris SKAL have en månedspris-id i hver tilstand,
        // den overhovedet findes i. Ellers betaler kunden for standeren, får
        // adgang, og trækkes aldrig igen.
        if (p.monthlyPrice) {
          expect(ids.monthlyPriceId, `${p.slug}/${mode}: månedspris`).toBeTruthy();
        } else {
          expect(ids.monthlyPriceId, `${p.slug}/${mode}`).toBeUndefined();
        }
      }
    }
  });

  it("bruger ikke samme pris-id to gange", () => {
    // Et copy-paste mellem to varer ville få den ene til at fakturere den
    // andens beløb, og fakturaen ville se helt rigtig ud.
    const set = new Map();
    for (const p of PRODUCTS) {
      for (const [mode, ids] of Object.entries(p.stripe ?? {})) {
        for (const id of [ids.priceId, ids.monthlyPriceId]) {
          if (!id) continue;
          const noegle = `${mode}:${id}`;
          expect(set.get(noegle), `${id} bruges både af ${set.get(noegle)} og ${p.slug}`)
            .toBeUndefined();
          set.set(noegle, p.slug);
        }
      }
    }
  });
});
