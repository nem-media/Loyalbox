import { describe, it, expect } from "vitest";
import { readFileSync, existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { orderInvariants, valider } from "./contract";
import { beregnEligibleSpend } from "./eligible-spend";
import type { CommerceOrder } from "./types";

/**
 * KONTRAKTENS EGNE FIXTURES, KØRT GENNEM LOYALSUM CORES VALIDERING.
 *
 * `manifest.json` siger, hvilke ordrer der er gyldige, hvilke der skal
 * afvises, og hvilken eligible spend hver gyldig ordre giver. Samme manifest
 * driver kontraktens egen CI — så core og adapterne er enige om præcis de
 * samme tal, og en afvigelse fejler her.
 */

const MAPPE = join(process.cwd(), "src/lib/commerce-api/contract/v1/examples");
const laes = (f: string) => JSON.parse(readFileSync(join(MAPPE, f), "utf8"));
const manifest = laes("manifest.json") as {
  valid: Record<string, string>;
  invalid: Record<string, { schema: string; semantic?: boolean; reason: string }>;
  eligible_spend: Record<string, { earning_qualified: boolean; eligible_spend_minor: number }>;
  equivalent_orders: [string, string][];
};

const ORDRE = "commerce-order.schema.json";
const gyldig = (o: unknown) => valider("order", o).ok && orderInvariants(o as CommerceOrder).length === 0;

describe("gyldige ordrer", () => {
  for (const [fil, skema] of Object.entries(manifest.valid)) {
    if (skema !== ORDRE) continue;
    it(`${fil} valideres og går op`, () => {
      const o = laes(fil);
      expect(valider("order", o)).toEqual({ ok: true });
      expect(orderInvariants(o)).toEqual([]);
    });
  }
});

describe("ugyldige ordrer afvises", () => {
  for (const [fil, { schema, semantic, reason }] of Object.entries(manifest.invalid)) {
    if (schema !== ORDRE) continue;
    it(`${fil} — ${reason}`, () => {
      const o = laes(fil);
      expect(gyldig(o)).toBe(false);
      if (semantic) {
        expect(valider("order", o).ok).toBe(true);
        expect(orderInvariants(o).length).toBeGreaterThan(0);
      }
    });
  }
});

describe("eligible spend — manifestets tal", () => {
  for (const [fil, forventet] of Object.entries(manifest.eligible_spend)) {
    it(fil, () => {
      expect(beregnEligibleSpend(laes(fil))).toEqual(forventet);
    });
  }

  it("WooCommerce og Shopify med samme økonomi giver samme grundlag", () => {
    expect(manifest.equivalent_orders.length).toBeGreaterThan(0);
    for (const [a, b] of manifest.equivalent_orders) {
      const oa = laes(a) as CommerceOrder;
      const ob = laes(b) as CommerceOrder;
      expect(oa.provider).not.toBe(ob.provider);
      expect(beregnEligibleSpend(oa)).toEqual(beregnEligibleSpend(ob));
    }
  });

  it("LoyalSum-belønningen er trukket fra: 500 kr. varer − 50 kr. belønning → 450 kr.", () => {
    const o = laes("woocommerce-loyalsum-reward-order.json") as CommerceOrder;
    expect(beregnEligibleSpend(o).eligible_spend_minor).toBe(45000);
  });

  it("fragt, fragtmoms og gebyrer tæller aldrig — heller ikke når de refunderes", () => {
    const o = laes("woocommerce-paid-order.json") as CommerceOrder;
    const med = {
      ...o,
      amounts: {
        ...o.amounts,
        shipping_ex_tax: o.amounts.shipping_ex_tax + 10000,
        shipping_tax: o.amounts.shipping_tax + 2500,
        fees_incl_tax: 5000,
        order_total_incl_tax: o.amounts.order_total_incl_tax + 17500,
      },
    };
    expect(orderInvariants(med)).toEqual([]);
    expect(beregnEligibleSpend(med)).toEqual(beregnEligibleSpend(o));

    const fragtRefunderet: CommerceOrder = {
      ...med,
      payment_status: "partially_refunded",
      refunds: [
        {
          external_refund_id: "r1",
          created_at: "2026-09-30T10:00:00Z",
          total_incl_tax: 12500,
          line_items: [],
          shipping_ex_tax: 10000,
          shipping_tax: 2500,
          fees_incl_tax: 0,
        },
      ],
    };
    expect(orderInvariants(fragtRefunderet)).toEqual([]);
    expect(beregnEligibleSpend(fragtRefunderet).eligible_spend_minor).toBe(31230);
  });

  it("order_status er aldrig et betalingssignal: open + paid kvalificerer, cancelled + unpaid gør ikke", () => {
    const o = laes("woocommerce-paid-order.json") as CommerceOrder;
    expect(o.order_status).toBe("open");
    expect(beregnEligibleSpend(o).earning_qualified).toBe(true);
    expect(beregnEligibleSpend({ ...o, order_status: "completed" })).toEqual(beregnEligibleSpend(o));
    expect(beregnEligibleSpend({ ...o, order_status: "cancelled" })).toEqual(beregnEligibleSpend(o));
    for (const ps of ["unpaid", "failed", "voided"] as const) {
      expect(beregnEligibleSpend({ ...o, payment_status: ps, paid_at: null })).toEqual({
        earning_qualified: false,
        eligible_spend_minor: 0,
      });
    }
  });

  it("flere refunderinger trækkes hver præcis én gang", () => {
    const o = laes("shopify-partial-refund.json") as CommerceOrder;
    expect(o.refunds).toHaveLength(2);
    expect(beregnEligibleSpend(o).eligible_spend_minor).toBe(70000);
  });

  it("et ikke-allokeret refunderingsbeløb trækkes fra — V1's forsigtige tolkning", () => {
    const o = laes("woocommerce-paid-order.json") as CommerceOrder;
    const r: CommerceOrder = {
      ...o,
      payment_status: "partially_refunded",
      refunds: [
        {
          external_refund_id: "r1",
          created_at: "2026-09-30T10:00:00Z",
          total_incl_tax: 1000,
          line_items: [],
          shipping_ex_tax: 0,
          shipping_tax: 0,
          fees_incl_tax: 0,
        },
      ],
    };
    expect(orderInvariants(r)).toEqual([]);
    expect(beregnEligibleSpend(r).eligible_spend_minor).toBe(31230 - 1000);
  });
});

/**
 * KOPIEN MÅ IKKE DRIVE FRA KILDEN.
 *
 * Skemaerne og eksemplerne er kopieret fra `loyalsum-integrations` @ 9aa9906.
 * Ligger søsterrepoet ved siden af (udviklingsmaskinen), skal filerne være
 * byte for byte ens. I CI og i drift findes det ikke, og der er ingen
 * afhængighed af det: prøven springes da over.
 */
const KILDE = join(process.cwd(), "..", "loyalsum-integrations", "contracts", "commerce", "v1");
describe.skipIf(!existsSync(KILDE))("kopien af kontrakten svarer til kilden", () => {
  const filer = (rod: string, under = ""): string[] =>
    readdirSync(join(rod, under), { withFileTypes: true }).flatMap((d) =>
      d.isDirectory() ? filer(rod, join(under, d.name)) : [join(under, d.name)],
    );
  it("samme filer, samme indhold", () => {
    const lokal = join(process.cwd(), "src/lib/commerce-api/contract/v1");
    const kilde = filer(KILDE).sort();
    expect(filer(lokal).sort()).toEqual(kilde);
    for (const f of kilde) {
      // Linjeskift normaliseres: git (autocrlf) kan give CRLF i en checkout.
      const laes = (p: string) => readFileSync(p, "utf8").split("\r\n").join("\n");
      expect(laes(join(lokal, f)), f).toBe(laes(join(KILDE, f)));
    }
  });
});
