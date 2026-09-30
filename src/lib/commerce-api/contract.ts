import Ajv2020, { type ValidateFunction } from "ajv/dist/2020";
import addFormats from "ajv-formats";
import common from "./contract/v1/schemas/common.schema.json";
import provider from "./contract/v1/schemas/commerce-provider.schema.json";
import customer from "./contract/v1/schemas/commerce-customer.schema.json";
import customerLink from "./contract/v1/schemas/commerce-customer-link.schema.json";
import money from "./contract/v1/schemas/commerce-money.schema.json";
import orderLine from "./contract/v1/schemas/commerce-order-line.schema.json";
import order from "./contract/v1/schemas/commerce-order.schema.json";
import refund from "./contract/v1/schemas/commerce-refund.schema.json";
import reward from "./contract/v1/schemas/commerce-reward.schema.json";
import reservation from "./contract/v1/schemas/commerce-reward-reservation.schema.json";
import store from "./contract/v1/schemas/commerce-store.schema.json";
import syncResult from "./contract/v1/schemas/commerce-sync-result.schema.json";
import type { CommerceOrder } from "./types";

/**
 * KONTRAKTEN VALIDERES MED KONTRAKTENS EGNE SKEMAER.
 *
 * Skemaerne i `contract/v1/schemas/` er kopieret ORDRET fra
 * `loyalsum-integrations` @ 9aa9906 — de er ikke skrevet af, og
 * `contract-kopi.test.ts` fejler, hvis de driver fra kilden. Adapterne
 * validerer mod de samme filer, så en ordre, pluginet mener er gyldig, er
 * gyldig her, og omvendt.
 *
 * Skemaet kan ikke udtrykke regnestykkerne (summer, refunderinger,
 * `payment_status` ↔ `refunds[]`). De ligger i `orderInvariants()` nedenfor,
 * som er en TypeScript-udgave af kontraktens reference
 * (`scripts/lib/commerce-order-semantics.mjs`). En ordre, der ikke går op,
 * bogføres aldrig — den afvises med 422.
 */

export const CONTRACT_VERSIONS = ["commerce-order/v1"] as const;

const BASE = "https://loyalsum.dk/schemas/commerce/v1/";

const ajv = new Ajv2020({
  strict: true,
  strictRequired: false,
  allErrors: true,
  allowUnionTypes: true,
});
addFormats(ajv);
for (const s of [
  common,
  provider,
  customer,
  customerLink,
  money,
  orderLine,
  order,
  refund,
  reward,
  reservation,
  store,
  syncResult,
]) {
  ajv.addSchema(s as object);
}

function skema(navn: string): ValidateFunction {
  const v = ajv.getSchema(BASE + navn);
  if (!v) throw new Error(`Commerce-kontrakten mangler skemaet ${navn}`);
  return v;
}

/** Anmodningernes kroppe, som `openapi.json` beskriver dem. */
const KROPPE = {
  pair: {
    type: "object",
    additionalProperties: false,
    required: ["pairing_code", "store"],
    properties: {
      pairing_code: { type: "string", minLength: 8, maxLength: 64 },
      store: { $ref: BASE + "commerce-store.schema.json" },
    },
  },
  sync: {
    type: "object",
    additionalProperties: false,
    required: ["order", "observed_at"],
    properties: {
      order: { $ref: BASE + "commerce-order.schema.json" },
      observed_at: { type: "string", format: "date-time" },
    },
  },
  reserve: {
    type: "object",
    additionalProperties: false,
    required: [
      "reward_id",
      "loyalsum_customer_ref",
      "external_cart_ref",
      "cart_items_total_incl_tax",
    ],
    properties: {
      reward_id: { type: "string" },
      loyalsum_customer_ref: { type: "string" },
      external_cart_ref: { type: "string" },
      cart_items_total_incl_tax: { $ref: BASE + "commerce-money.schema.json" },
    },
  },
  release: {
    type: "object",
    additionalProperties: false,
    required: ["reservation_id"],
    properties: { reservation_id: { type: "string" } },
  },
  commit: {
    type: "object",
    additionalProperties: false,
    required: ["reservation_id", "external_order_id"],
    properties: {
      reservation_id: { type: "string" },
      external_order_id: { type: "string" },
    },
  },
} as const;

const validators = {
  pair: ajv.compile(KROPPE.pair),
  sync: ajv.compile(KROPPE.sync),
  reserve: ajv.compile(KROPPE.reserve),
  release: ajv.compile(KROPPE.release),
  commit: ajv.compile(KROPPE.commit),
  customer: skema("commerce-customer.schema.json"),
  order: skema("commerce-order.schema.json"),
  reward: skema("commerce-reward.schema.json"),
  reservation: skema("commerce-reward-reservation.schema.json"),
  syncResult: skema("commerce-sync-result.schema.json"),
  customerLink: skema("commerce-customer-link.schema.json"),
  store: skema("commerce-store.schema.json"),
};

export type Krop = keyof typeof validators;

export type Validering =
  | { ok: true }
  | { ok: false; fejl: string[] };

/**
 * Validerer en krop mod kontrakten. Fejlene er maskinlæsbare stier, så
 * adapteren kan vise, HVILKET felt der er galt — aldrig kundens data.
 */
export function valider(hvad: Krop, data: unknown): Validering {
  const v = validators[hvad];
  if (v(data)) return { ok: true };
  return {
    ok: false,
    fejl: (v.errors ?? [])
      .slice(0, 20)
      .map((e) => `${e.instancePath || "/"} ${e.message ?? "er ugyldig"}`),
  };
}

// ---------------------------------------------------------------------------
// De økonomiske invarianter — kontraktens `orderInvariants()`.
// ---------------------------------------------------------------------------

export const PAID_STATES = new Set(["paid", "partially_refunded", "refunded"]);
export const EARNING_STATES = new Set(["paid", "partially_refunded"]);

type Refundering = CommerceOrder["refunds"][number];

const big = (n: number) => BigInt(n);
const sumBig = <T>(xs: T[], f: (x: T) => number) =>
  xs.reduce((a, x) => a + big(f(x)), BigInt(0));

/** Den del af en refundering, der er knyttet til varer, fragt og gebyrer. */
function allokeret(r: Refundering): bigint {
  return (
    sumBig(r.line_items, (l) => l.total_ex_tax + l.total_tax) +
    big(r.shipping_ex_tax) +
    big(r.shipping_tax) +
    big(r.fees_incl_tax)
  );
}

export interface RefunderingsTotaler {
  total_incl_tax: bigint;
  items_ex_tax: bigint;
  items_tax: bigint;
  shipping_ex_tax: bigint;
  shipping_tax: bigint;
  fees_incl_tax: bigint;
  unallocated: bigint;
}

/** Summen af alle refunderinger, opdelt. Hver refundering tælles præcis én gang. */
export function refunderingsTotaler(o: CommerceOrder): RefunderingsTotaler {
  const t: RefunderingsTotaler = {
    total_incl_tax: BigInt(0),
    items_ex_tax: BigInt(0),
    items_tax: BigInt(0),
    shipping_ex_tax: BigInt(0),
    shipping_tax: BigInt(0),
    fees_incl_tax: BigInt(0),
    unallocated: BigInt(0),
  };
  for (const r of o.refunds) {
    t.total_incl_tax += big(r.total_incl_tax);
    t.items_ex_tax += sumBig(r.line_items, (l) => l.total_ex_tax);
    t.items_tax += sumBig(r.line_items, (l) => l.total_tax);
    t.shipping_ex_tax += big(r.shipping_ex_tax);
    t.shipping_tax += big(r.shipping_tax);
    t.fees_incl_tax += big(r.fees_incl_tax);
    t.unallocated += big(r.total_incl_tax) - allokeret(r);
  }
  return t;
}

/**
 * Regnestykkerne, JSON Schema ikke kan udtrykke. Tom liste = ordren går op.
 * Samme regler som kontraktens `orderInvariants()` — i heltal (BigInt), så
 * summer over mange linjer ikke kan miste præcision.
 */
export function orderInvariants(o: CommerceOrder): string[] {
  const p: string[] = [];
  const a = o.amounts;

  const linjer = new Map<string, CommerceOrder["line_items"][number]>();
  for (const l of o.line_items) {
    if (linjer.has(l.external_line_id))
      p.push(`to linjer har samme external_line_id ${l.external_line_id}`);
    linjer.set(l.external_line_id, l);
    if (l.total_ex_tax !== l.subtotal_ex_tax - l.discount_ex_tax)
      p.push(`linje ${l.external_line_id}: total_ex_tax ≠ subtotal_ex_tax − discount_ex_tax`);
  }

  if (big(a.items_subtotal_ex_tax) !== sumBig(o.line_items, (l) => l.subtotal_ex_tax))
    p.push("items_subtotal_ex_tax ≠ Σ linjernes subtotal_ex_tax");
  if (big(a.items_discount_ex_tax) !== sumBig(o.line_items, (l) => l.discount_ex_tax))
    p.push("items_discount_ex_tax ≠ Σ linjernes discount_ex_tax");
  if (big(a.items_total_ex_tax) !== sumBig(o.line_items, (l) => l.total_ex_tax))
    p.push("items_total_ex_tax ≠ Σ linjernes total_ex_tax");
  if (big(a.items_total_ex_tax) !== big(a.items_subtotal_ex_tax) - big(a.items_discount_ex_tax))
    p.push("items_total_ex_tax ≠ items_subtotal_ex_tax − items_discount_ex_tax");
  if (big(a.items_tax) !== sumBig(o.line_items, (l) => l.total_tax))
    p.push("items_tax ≠ Σ linjernes total_tax");
  const total =
    big(a.items_total_ex_tax) +
    big(a.items_tax) +
    big(a.shipping_ex_tax) +
    big(a.shipping_tax) +
    big(a.fees_incl_tax);
  if (big(a.order_total_incl_tax) !== total)
    p.push("order_total_incl_tax ≠ varer + moms + fragt + fragtmoms + gebyrer");

  const refIder = new Set<string>();
  const prLinje = new Map<string, { quantity: number; ex: bigint; tax: bigint }>();
  for (const r of o.refunds) {
    if (refIder.has(r.external_refund_id))
      p.push(`to refunderinger har samme external_refund_id ${r.external_refund_id}`);
    refIder.add(r.external_refund_id);
    const rl = new Set<string>();
    for (const l of r.line_items) {
      if (!linjer.has(l.external_line_id))
        p.push(`refundering ${r.external_refund_id}: linje ${l.external_line_id} findes ikke på ordren`);
      if (rl.has(l.external_line_id))
        p.push(`refundering ${r.external_refund_id}: linje ${l.external_line_id} står to gange`);
      rl.add(l.external_line_id);
      const acc = prLinje.get(l.external_line_id) ?? {
        quantity: 0,
        ex: BigInt(0),
        tax: BigInt(0),
      };
      acc.quantity += l.quantity;
      acc.ex += big(l.total_ex_tax);
      acc.tax += big(l.total_tax);
      prLinje.set(l.external_line_id, acc);
    }
    if (allokeret(r) > big(r.total_incl_tax))
      p.push(`refundering ${r.external_refund_id}: varer + fragt + gebyrer > total_incl_tax`);
  }
  for (const [id, acc] of prLinje) {
    const l = linjer.get(id);
    if (!l) continue;
    if (acc.quantity > l.quantity) p.push(`linje ${id}: der er returneret flere stk., end der blev solgt`);
    if (acc.ex > big(l.total_ex_tax)) p.push(`linje ${id}: der er refunderet mere, end linjen kostede ex moms`);
    if (acc.tax > big(l.total_tax)) p.push(`linje ${id}: der er refunderet mere moms, end der blev betalt`);
  }
  const rt = refunderingsTotaler(o);
  if (rt.shipping_ex_tax > big(a.shipping_ex_tax)) p.push("der er refunderet mere fragt, end der blev betalt");
  if (rt.shipping_tax > big(a.shipping_tax)) p.push("der er refunderet mere fragtmoms, end der blev betalt");
  if (rt.fees_incl_tax > big(a.fees_incl_tax)) p.push("der er refunderet flere gebyrer, end der blev betalt");
  if (rt.total_incl_tax > big(a.order_total_incl_tax))
    p.push("der er refunderet mere i alt, end order_total_incl_tax");

  const ps = o.payment_status;
  if (PAID_STATES.has(ps) && o.paid_at === null) p.push(`payment_status ${ps} kræver paid_at`);
  if (!PAID_STATES.has(ps) && o.paid_at !== null)
    p.push(`payment_status ${ps} betyder ubetalt — paid_at skal være null`);
  if (!PAID_STATES.has(ps) && o.refunds.length > 0)
    p.push(`payment_status ${ps}: en ubetalt ordre kan ikke have refunderinger`);
  if (ps === "paid" && rt.total_incl_tax > BigInt(0))
    p.push("payment_status paid, men der er refunderet penge");
  if (
    ps === "partially_refunded" &&
    !(rt.total_incl_tax > BigInt(0) && rt.total_incl_tax < big(a.order_total_incl_tax))
  )
    p.push("payment_status partially_refunded kræver 0 < refunderet < order_total_incl_tax");
  if (
    ps === "refunded" &&
    !(big(a.order_total_incl_tax) > BigInt(0) && rt.total_incl_tax === big(a.order_total_incl_tax))
  )
    p.push("payment_status refunded kræver refunderet = order_total_incl_tax");

  return p;
}
