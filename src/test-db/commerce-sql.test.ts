import { describe, it, expect, beforeAll } from "vitest";
import type { PGlite } from "@electric-sql/pglite";
import { nyBase } from "./pglite";
import { beregnEligibleSpend } from "@/lib/commerce-api/eligible-spend";
import { pointTarget, stempelTarget } from "@/lib/commerce-api/targets";
import type { CommerceOrder } from "@/lib/commerce-api/types";

/**
 * MIGRATION 0049 KØRT I EN RIGTIG POSTGRES (PGlite).
 *
 * Prøverne kalder de samme SQL-funktioner, som API'et kalder, med de samme
 * targets, som `sync.ts` regner ud af kontraktens egne fixtures. De beviser, at
 * delta-modellen, låsene, de unikke indeks og tilbageførslerne gør det, de
 * skal — i basen og ikke kun i koden.
 *
 * BEGRÆNSNING: PGlite har ÉN forbindelse, så "samtidige" kald kører efter
 * hinanden. Det, der prøves her, er, at gentagelser og ældre tilstande giver
 * det rigtige svar, og at spærrerne (unikke indeks, betingede sætninger,
 * `for update`) står. At to RIGTIGE parallelle transaktioner venter på hinanden,
 * er Postgres' egen `for update`-garanti og kan ikke vises med én forbindelse.
 */


let db: PGlite;

async function en<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T> {
  const r = await db.query(sql, params);
  return r.rows[0] as T;
}
async function alle<T = Record<string, unknown>>(sql: string, params: unknown[] = []): Promise<T[]> {
  const r = await db.query(sql, params);
  return r.rows as T[];
}

async function firma(navn = "Kaffebaren"): Promise<string> {
  return (await en<{ id: string }>("insert into companies (name) values ($1) returning id", [navn])).id;
}

async function pointprogram(company: string, earnValue = 10, provider = "woocommerce", kanal = true) {
  const p = await en<{ id: string }>(
    `insert into loyalty_point_programs (company_id, name, status, earn_model, earn_value)
     values ($1, 'Point', 'active', 'per_amount', $2) returning id`,
    [company, earnValue],
  );
  if (kanal) {
    await db.query(
      `insert into commerce_program_channels (company_id, provider, point_program_id) values ($1, $2, $3)`,
      [company, provider, p.id],
    );
  }
  return p.id;
}

async function stempelkort(company: string, minOrder: number | null = 10000) {
  const p = await en<{ id: string }>(
    `insert into loyalty_programs (company_id, name, status) values ($1, 'Kaffekort', 'active') returning id`,
    [company],
  );
  await db.query(
    `insert into commerce_program_channels (company_id, provider, stamp_program_id, min_order_minor)
     values ($1, 'woocommerce', $2, $3)`,
    [company, p.id, minOrder],
  );
  return p.id;
}

let butikNr = 0;
async function integration(company: string, provider = "woocommerce") {
  butikNr++;
  return (
    await en<{ id: string }>(
      `insert into commerce_integrations (company_id, provider, external_store_id, store_url, currency, secret_ciphertext)
       values ($1, $2, $3, 'https://butik.example.com', 'DKK', 'k1.x.y.z') returning id`,
      [company, provider, `butik-${butikNr}`],
    )
  ).id;
}

async function medlem(company: string, email: string) {
  return (
    await en<{ id: string }>(
      `insert into loyalty_members (company_id, email) values ($1, $2) returning id`,
      [company, email],
    )
  ).id;
}

async function saldo(program: string, member: string): Promise<number> {
  const r = await en<{ balance: number } | undefined>(
    `select balance from loyalty_point_accounts where program_id = $1 and member_id = $2`,
    [program, member],
  );
  return r?.balance ?? 0;
}

interface Bidrag {
  kind: string;
  target: number;
  foer: number;
  efter: number;
  status: string;
  id: string;
}

/** Samme vej som `sync.ts`: targets regnet af ordren, én kaldt funktion. */
async function synk(
  integrationId: string,
  order: CommerceOrder,
  opts: {
    observedAt?: string;
    member?: string | null;
    point?: { id: string; earn_value: number }[];
    stempel?: { id: string; min: number | null }[];
    email?: string;
  } = {},
) {
  const { eligible_spend_minor, earning_qualified } = beregnEligibleSpend(order);
  const targets = [
    ...(opts.point ?? []).map((p) => ({
      kind: "points",
      program_id: p.id,
      target: pointTarget({ earn_model: "per_amount", earn_value: p.earn_value }, eligible_spend_minor, earning_qualified),
    })),
    ...(opts.stempel ?? []).map((s) => ({
      kind: "stamps",
      program_id: s.id,
      target: stempelTarget(eligible_spend_minor, earning_qualified, s.min),
    })),
  ];
  const r = await en<{ svar: { ok: boolean; stale?: boolean; bidrag?: Bidrag[]; member_id?: string; order_id?: string } }>(
    `select public.commerce_synk_ordre($1, $2::jsonb, $3::timestamptz, 'hash', $4, $5, $6, $7, $8::jsonb, gen_random_uuid()) as svar`,
    [
      integrationId,
      JSON.stringify({
        external_order_id: order.external_order_id,
        external_order_number: order.external_order_number,
        order_status: order.order_status,
        payment_status: order.payment_status,
        currency: order.currency,
        created_at: order.created_at,
        updated_at: order.updated_at,
        paid_at: order.paid_at,
        external_customer_id: order.customer.external_customer_id,
        email_norm: opts.email ?? order.customer.email.toLowerCase(),
        amounts: order.amounts,
        refunds: [],
      }),
      opts.observedAt ?? order.updated_at,
      eligible_spend_minor,
      earning_qualified,
      opts.member ?? null,
      opts.member ? "email" : "unknown",
      JSON.stringify(targets),
    ],
  );
  return r.svar;
}

/** En betalt ordre med præcis dette varebeløb (inkl. moms), som kontrakten tillader. */
function ordre(id: string, varerInklMoms: number, over: Partial<CommerceOrder> = {}): CommerceOrder {
  const moms = Math.round(varerInklMoms / 5);
  const ex = varerInklMoms - moms;
  return {
    schema: "commerce-order/v1",
    provider: "woocommerce",
    external_store_id: "x",
    external_order_id: id,
    external_order_number: id,
    order_status: "open",
    payment_status: "paid",
    currency: "DKK",
    created_at: "2026-09-29T09:00:00Z",
    updated_at: "2026-09-29T09:00:00Z",
    paid_at: "2026-09-29T09:00:00Z",
    customer: { external_customer_id: "57", email: "kunde@example.com" },
    amounts: {
      items_subtotal_ex_tax: ex,
      items_discount_ex_tax: 0,
      items_total_ex_tax: ex,
      items_tax: moms,
      shipping_ex_tax: 0,
      shipping_tax: 0,
      fees_incl_tax: 0,
      order_total_incl_tax: varerInklMoms,
    },
    line_items: [
      {
        external_line_id: "1",
        external_product_id: "1",
        external_variant_id: null,
        sku: null,
        quantity: 1,
        subtotal_ex_tax: ex,
        discount_ex_tax: 0,
        total_ex_tax: ex,
        total_tax: moms,
      },
    ],
    refunds: [],
    ...over,
  };
}

/** Samme ordre med en refundering af `refunderet` (inkl. moms) på varelinjen. */
function refunderet(o: CommerceOrder, refunderet: number, opdateret: string): CommerceOrder {
  const moms = Math.round(refunderet / 5);
  const iAlt = o.refunds.reduce((x, r) => x + r.total_incl_tax, 0) + refunderet;
  const fuld = iAlt === o.amounts.order_total_incl_tax;
  return {
    ...o,
    payment_status: fuld ? "refunded" : "partially_refunded",
    updated_at: opdateret,
    refunds: [
      ...o.refunds,
      {
        external_refund_id: `r-${o.refunds.length + 1}`,
        created_at: opdateret,
        total_incl_tax: refunderet,
        line_items: [{ external_line_id: "1", quantity: 0, total_ex_tax: refunderet - moms, total_tax: moms }],
        shipping_ex_tax: 0,
        shipping_tax: 0,
        fees_incl_tax: 0,
      },
    ],
  };
}

beforeAll(async () => {
  db = await nyBase();
}, 120_000);

describe("pointbidraget: target − applied = delta", () => {
  it("750 kr. → 75 point, dublet → 0, delvis refundering til 450 → −30", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "kunde@example.com");
    const o = ordre("1001", 75000);

    const a = await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(a.bidrag![0]).toMatchObject({ target: 75, foer: 0, efter: 75, status: "applied" });
    expect(await saldo(p, m)).toBe(75);

    const b = await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(b.bidrag![0]).toMatchObject({ target: 75, foer: 75, efter: 75 });
    expect(await saldo(p, m)).toBe(75);

    const r = refunderet(o, 30000, "2026-09-30T10:00:00Z");
    const d = await synk(i, r, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(d.bidrag![0]).toMatchObject({ target: 45, foer: 75, efter: 45 });
    expect(await saldo(p, m)).toBe(45);

    // Ledgeren er sandheden: +75 og −30, intet slettet.
    const linjer = await alle<{ type: string; points: number; reference: string }>(
      `select type, points, reference from loyalty_point_transactions where member_id = $1 order by created_at`,
      [m],
    );
    expect(linjer.map((l) => [l.type, l.points])).toEqual([
      ["earn", 75],
      ["adjust_remove", -30],
    ]);
    expect(linjer.every((l) => l.reference.startsWith("commerce:"))).toBe(true);
  });

  it("en ÆLDRE tilstand efter en nyere ændrer intet", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "t2@example.com");
    const o = ordre("2001", 75000);
    const nyere = refunderet(o, 30000, "2026-09-30T10:00:00Z");

    await synk(i, nyere, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(await saldo(p, m)).toBe(45);

    const gammel = await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }], observedAt: "2026-09-29T09:00:01Z" });
    expect(gammel.stale).toBe(true);
    expect(await saldo(p, m)).toBe(45);
    const gemt = await en<{ payment_status: string }>(
      `select payment_status from commerce_orders where integration_id = $1 and external_order_id = '2001'`,
      [i],
    );
    expect(gemt.payment_status).toBe("partially_refunded");
  });

  it("ubetalt ordre giver 0 — og samme ordre betalt giver bagefter point", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "u@example.com");
    const ubetalt = ordre("3001", 50000, { payment_status: "unpaid", paid_at: null });
    const a = await synk(i, ubetalt, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(a.bidrag![0]).toMatchObject({ target: 0, efter: 0 });
    const betalt = ordre("3001", 50000, { updated_at: "2026-09-29T10:00:00Z" });
    const b = await synk(i, betalt, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(b.bidrag![0]).toMatchObject({ target: 50, foer: 0, efter: 50 });
  });

  it("fuld refundering: target 0, hele bidraget trækkes tilbage — én gang", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "f@example.com");
    const o = ordre("4001", 40000);
    await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] });
    const fuld = refunderet(o, 40000, "2026-09-30T10:00:00Z");
    await synk(i, fuld, { member: m, point: [{ id: p, earn_value: 10 }] });
    await synk(i, fuld, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(await saldo(p, m)).toBe(0);
    const n = await en<{ n: number }>(`select count(*)::int as n from loyalty_point_transactions where member_id = $1`, [m]);
    expect(n.n).toBe(2);
  });

  it("har kunden brugt pointene, trækkes kun det, der er — saldoen går aldrig i minus", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "brugt@example.com");
    const o = ordre("5001", 50000);
    await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] });
    await db.query(
      `select public.point_giv($1, $2, $3, -40, 'adjust_remove', null, 'test-forbrug', null, null, 'test')`,
      [c, p, m],
    );
    const fuld = refunderet(o, 50000, "2026-09-30T10:00:00Z");
    const r = await synk(i, fuld, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(await saldo(p, m)).toBe(0);
    expect(r.bidrag![0]).toMatchObject({ target: 0, foer: 50, efter: 40, status: "blocked" });
  });

  it("et pauset program giver ingen point — bidraget venter", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    await db.query(`update loyalty_point_programs set status = 'paused' where id = $1`, [p]);
    const i = await integration(c);
    const m = await medlem(c, "pause@example.com");
    const r = await synk(i, ordre("5501", 30000), { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(r.bidrag![0]).toMatchObject({ target: 30, efter: 0, status: "blocked" });
    expect(await saldo(p, m)).toBe(0);
  });
});

describe("programmer og kanaler", () => {
  it("pointprogram og stempelkort får hvert sit bidrag af samme ordre", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const s = await stempelkort(c, 10000);
    const i = await integration(c);
    const m = await medlem(c, "begge@example.com");
    const r = await synk(i, ordre("6001", 75000), {
      member: m,
      point: [{ id: p, earn_value: 10 }],
      stempel: [{ id: s, min: 10000 }],
    });
    const kinds = r.bidrag!.map((b) => [b.kind, b.target]).sort();
    expect(kinds).toEqual([
      ["points", 75],
      ["stamps", 1],
    ]);
    const n = await en<{ n: number }>(`select count(*)::int as n from commerce_order_contributions where external_order_id = '6001'`);
    expect(n.n).toBe(2);
  });

  it("stempeltarget følger minimumsbeløbet: 750 → 1, refunderet til 450 → 1, til 80 → 0", () => {
    const min = 10000;
    const o = ordre("x", 75000);
    const t = (x: CommerceOrder) => {
      const e = beregnEligibleSpend(x);
      return stempelTarget(e.eligible_spend_minor, e.earning_qualified, min);
    };
    expect(t(o)).toBe(1);
    const r1 = refunderet(o, 30000, "2026-09-30T10:00:00Z");
    expect(t(r1)).toBe(1);
    const r2 = refunderet(r1, 37000, "2026-09-30T11:00:00Z");
    expect(beregnEligibleSpend(r2).eligible_spend_minor).toBe(8000);
    expect(t(r2)).toBe(0);
  });

  it("ét pointprogram pr. webshopkanal — et andet kan ikke slås til ved siden af", async () => {
    const c = await firma();
    await pointprogram(c, 10);
    const andet = await en<{ id: string }>(
      `insert into loyalty_point_programs (company_id, name, status) values ($1, 'Andet', 'active') returning id`,
      [c],
    );
    await expect(
      db.query(`insert into commerce_program_channels (company_id, provider, point_program_id) values ($1, 'woocommerce', $2)`, [c, andet.id]),
    ).rejects.toThrow();
  });
});

describe("ukendt kunde, ventende optjening og krav", () => {
  it("en ukendt e-mail giver ingen kunde — optjeningen venter og kan kræves én gang", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const r = await synk(i, ordre("7001", 30000), { point: [{ id: p, earn_value: 10 }], email: "ny@example.com" });
    expect(r.bidrag![0]).toMatchObject({ target: 30, efter: 0, status: "awaiting_customer" });
    const medlemmer = await en<{ n: number }>(`select count(*)::int as n from loyalty_members where company_id = $1`, [c]);
    expect(medlemmer.n).toBe(0);

    const m = await medlem(c, "ny@example.com");
    const krav = await en<{ svar: { ok: boolean; ordrer: number } }>(
      `select public.commerce_goer_krav($1, $2, 'ny@example.com') as svar`,
      [c, m],
    );
    expect(krav.svar).toMatchObject({ ok: true, ordrer: 1 });
    expect(await saldo(p, m)).toBe(30);

    const igen = await en<{ svar: { ordrer: number } }>(`select public.commerce_goer_krav($1, $2, 'ny@example.com') as svar`, [c, m]);
    expect(igen.svar.ordrer).toBe(0);
    expect(await saldo(p, m)).toBe(30);

    const ordre7001 = await en<{ customer_email_norm: string | null }>(
      `select customer_email_norm from commerce_orders where external_order_id = '7001' and integration_id = $1`,
      [i],
    );
    expect(ordre7001.customer_email_norm).toBeNull();
  });

  it("krav gælder kun i SAMME virksomhed", async () => {
    const a = await firma("A");
    const b = await firma("B");
    const pa = await pointprogram(a, 10);
    const ia = await integration(a);
    await synk(ia, ordre("7101", 30000), { point: [{ id: pa, earn_value: 10 }], email: "delt@example.com" });
    const mb = await medlem(b, "delt@example.com");
    const krav = await en<{ svar: { ok: boolean; ordrer?: number } }>(
      `select public.commerce_goer_krav($1, $2, 'delt@example.com') as svar`,
      [b, mb],
    );
    expect(krav.svar.ordrer ?? 0).toBe(0);
    // Og et medlem fra B kan ikke bruges i A's navn.
    const forkert = await en<{ svar: { ok: boolean } }>(`select public.commerce_goer_krav($1, $2, 'delt@example.com') as svar`, [a, mb]);
    expect(forkert.svar.ok).toBe(false);
  });

  it("e-mailen matches uden forskel på store og små bogstaver — og to match er tvetydigt", async () => {
    const c = await firma();
    await medlem(c, "Anna@Example.com");
    const et = await alle(`select public.commerce_find_medlemmer($1, 'anna@example.com')`, [c]);
    expect(et).toHaveLength(1);
    await medlem(c, "anna@example.com");
    const to = await alle(`select public.commerce_find_medlemmer($1, 'anna@example.com')`, [c]);
    expect(to).toHaveLength(2);
  });

  it("intet i commerce-flowet skriver et markedsføringssamtykke", async () => {
    const n = await en<{ n: number }>(`select count(*)::int as n from consent_records where type = 'marketing'`);
    expect(n.n).toBe(0);
  });
});

describe("belønninger: reserve → commit/release", () => {
  async function opsaetning(saldoPoint = 620) {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, `r${Math.random()}@example.com`);
    await db.query(`select public.point_giv($1, $2, $3, $4, 'adjust_add', null, null, null, null, 'start')`, [c, p, m, saldoPoint]);
    const bel = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost, type) values ($1, $2, '50 kr. rabat', 500, 'amount_off') returning id`,
      [c, p],
    );
    await db.query(
      `insert into commerce_reward_channels (company_id, provider, point_reward_id, discount_type, amount_minor, currency) values ($1, 'woocommerce', $2, 'fixed_amount', 5000, 'DKK')`,
      [c, bel.id],
    );
    const ref = "lc_" + "a".repeat(24) + String(Math.floor(Math.random() * 1e8)).padStart(8, "0");
    await db.query(
      `insert into commerce_customer_links (company_id, integration_id, external_customer_id, email_norm, member_id, customer_ref, status, link_method, verified_at)
       values ($1, $2, '57', 'x@example.com', $3, $4, 'verified', 'verified_email', now())`,
      [c, i, m, ref],
    );
    return { c, p, i, m, bel: bel.id, ref };
  }

  const reserver = (i: string, ref: string, bel: string, kurv: string, total = 60000, valuta = "DKK") =>
    en<{ svar: { ok: boolean; fejl?: string; reservation_id?: string; gentagelse?: boolean } }>(
      `select public.commerce_reserver($1, $2, $3, $4, $5, $6, 1800) as svar`,
      [i, ref, bel, kurv, total, valuta],
    ).then((r) => r.svar);

  it("brugbar saldo = saldo − aktive reservationer; samme point kan ikke reserveres to gange", async () => {
    const { i, bel, ref, p, m } = await opsaetning(620);
    const a = await reserver(i, ref, bel, "kurv-1");
    expect(a.ok).toBe(true);
    const reserveret = await en<{ n: number }>(`select public.commerce_reserverede_point($1, $2) as n`, [p, m]);
    expect(reserveret.n).toBe(500);
    const b = await reserver(i, ref, bel, "kurv-2");
    expect(b).toMatchObject({ ok: false, fejl: "insufficient_points" });
    expect(await saldo(p, m)).toBe(620);
  });

  it("et gentaget klik på samme kurv giver samme reservation", async () => {
    const { i, bel, ref } = await opsaetning(1200);
    const a = await reserver(i, ref, bel, "kurv-1");
    const b = await reserver(i, ref, bel, "kurv-1");
    expect(b).toMatchObject({ ok: true, gentagelse: true, reservation_id: a.reservation_id });
  });

  it("fast rabat kan ikke overstige kurven; procent regnes i basispoint og rundes ned", async () => {
    const { c, i, bel, ref, p } = await opsaetning(2000);
    const a = await reserver(i, ref, bel, "lille-kurv", 3000);
    const r = await en<{ discount_minor: number }>(`select discount_minor from commerce_reward_reservations where id = $1`, [a.reservation_id]);
    expect(Number(r.discount_minor)).toBe(3000);

    const pct = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, '10 %', 100) returning id`,
      [c, p],
    );
    await db.query(
      `insert into commerce_reward_channels (company_id, provider, point_reward_id, discount_type, percentage_bp) values ($1, 'woocommerce', $2, 'percentage', 1000)`,
      [c, pct.id],
    );
    const b = await reserver(i, ref, pct.id, "kurv-pct", 12345);
    const rb = await en<{ discount_minor: number }>(`select discount_minor from commerce_reward_reservations where id = $1`, [b.reservation_id]);
    expect(Number(rb.discount_minor)).toBe(1234);
  });

  it("en belønning, der ikke er slået til i webshoppen, kan ikke reserveres", async () => {
    const { c, p, i, ref } = await opsaetning(2000);
    const fysisk = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'Gratis kaffe', 100) returning id`,
      [c, p],
    );
    expect(await reserver(i, ref, fysisk.id, "k")).toMatchObject({ ok: false, fejl: "reward_unavailable" });
  });

  it("forkert kunde, ubekræftet kobling og forkert integration afvises", async () => {
    const a = await opsaetning(2000);
    const b = await opsaetning(2000);
    expect(await reserver(a.i, "lc_" + "0".repeat(32), a.bel, "k")).toMatchObject({ ok: false, fejl: "customer_not_linked" });
    // B's kunde gennem A's integration
    expect(await reserver(a.i, b.ref, a.bel, "k")).toMatchObject({ ok: false, fejl: "customer_not_linked" });
    // A's belønning gennem B's integration
    expect(await reserver(b.i, b.ref, a.bel, "k")).toMatchObject({ ok: false, fejl: "reward_unavailable" });
    await db.query(`update commerce_customer_links set status = 'pending' where customer_ref = $1`, [a.ref]);
    expect(await reserver(a.i, a.ref, a.bel, "k")).toMatchObject({ ok: false, fejl: "customer_not_linked" });
  });

  it("frigiv er idempotent; en frigivet reservation kan ikke committes", async () => {
    const { i, bel, ref, p, m } = await opsaetning(620);
    const a = await reserver(i, ref, bel, "k1");
    const f1 = await en<{ s: { ok: boolean; status: string } }>(`select public.commerce_frigiv($1, $2) as s`, [i, a.reservation_id]);
    const f2 = await en<{ s: { ok: boolean; status: string } }>(`select public.commerce_frigiv($1, $2) as s`, [i, a.reservation_id]);
    expect(f1.s).toMatchObject({ ok: true, status: "released" });
    expect(f2.s).toMatchObject({ ok: true, status: "released" });
    const c = await en<{ s: { ok: boolean; fejl: string } }>(`select public.commerce_commit($1, $2, 'o1') as s`, [i, a.reservation_id]);
    expect(c.s).toMatchObject({ ok: false, fejl: "reservation_expired" });
    expect(await saldo(p, m)).toBe(620);
  });

  it("commit trækker pointene som en redeem-linje — og en gentaget commit trækker intet", async () => {
    const { i, bel, ref, p, m } = await opsaetning(620);
    const a = await reserver(i, ref, bel, "k1");
    const c1 = await en<{ s: { ok: boolean } }>(`select public.commerce_commit($1, $2, 'ordre-1') as s`, [i, a.reservation_id]);
    const c2 = await en<{ s: { ok: boolean; gentagelse: boolean } }>(`select public.commerce_commit($1, $2, 'ordre-1') as s`, [i, a.reservation_id]);
    expect(c1.s.ok).toBe(true);
    expect(c2.s).toMatchObject({ ok: true, gentagelse: true });
    expect(await saldo(p, m)).toBe(120);
    const andenOrdre = await en<{ s: { ok: boolean; fejl: string } }>(`select public.commerce_commit($1, $2, 'ordre-2') as s`, [i, a.reservation_id]);
    expect(andenOrdre.s).toMatchObject({ ok: false, fejl: "reservation_state_conflict" });
    const linjer = await alle<{ type: string; points: number; reward_point: number }>(
      `select type, points, reward_point from loyalty_point_transactions where member_id = $1 and type = 'redeem'`,
      [m],
    );
    expect(linjer).toEqual([{ type: "redeem", points: -500, reward_point: 500 }]);
  });

  it("en udløbet reservation giver pointene fri og kan ikke committes", async () => {
    const { i, bel, ref, p, m } = await opsaetning(620);
    const a = await reserver(i, ref, bel, "k1");
    await db.query(`update commerce_reward_reservations set expires_at = now() - interval '1 minute' where id = $1`, [a.reservation_id]);
    const reserveret = await en<{ n: number }>(`select public.commerce_reserverede_point($1, $2) as n`, [p, m]);
    expect(reserveret.n).toBe(0);
    const c = await en<{ s: { ok: boolean; fejl: string } }>(`select public.commerce_commit($1, $2, 'o') as s`, [i, a.reservation_id]);
    expect(c.s).toMatchObject({ ok: false, fejl: "reservation_expired" });
    const r = await en<{ status: string }>(`select status from commerce_reward_reservations where id = $1`, [a.reservation_id]);
    expect(r.status).toBe("expired");
    expect(await saldo(p, m)).toBe(620);
    const oprydning = await en<{ s: { reservationer_udloebet: number } }>(`select public.commerce_oprydning() as s`);
    expect(oprydning.s.reservationer_udloebet).toBeGreaterThanOrEqual(0);
  });

  it("fuld refundering giver belønningens point tilbage ÉN gang; delvis gør ikke", async () => {
    const { i, bel, ref, p, m } = await opsaetning(620);
    const a = await reserver(i, ref, bel, "k1");
    await db.query(`select public.commerce_commit($1, $2, '8001')`, [i, a.reservation_id]);
    expect(await saldo(p, m)).toBe(120);

    const o = ordre("8001", 45000);
    await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(await saldo(p, m)).toBe(165);

    const delvis = refunderet(o, 5000, "2026-09-30T10:00:00Z");
    await synk(i, delvis, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(await saldo(p, m)).toBe(160);
    const r1 = await en<{ refund_reversal_txn_id: string | null }>(`select refund_reversal_txn_id from commerce_reward_reservations where id = $1`, [a.reservation_id]);
    expect(r1.refund_reversal_txn_id).toBeNull();

    const fuld = refunderet(delvis, 40000, "2026-09-30T11:00:00Z");
    await synk(i, fuld, { member: m, point: [{ id: p, earn_value: 10 }] });
    // optjeningen (45) trækkes, belønningen (500) gives tilbage: 120 + 500 = 620
    expect(await saldo(p, m)).toBe(620);
    await synk(i, fuld, { member: m, point: [{ id: p, earn_value: 10 }], observedAt: "2026-09-30T12:00:00Z" });
    expect(await saldo(p, m)).toBe(620);
    const modposter = await en<{ n: number }>(
      `select count(*)::int as n from loyalty_point_transactions where member_id = $1 and type = 'reversal'`,
      [m],
    );
    expect(modposter.n).toBe(1);
  });
});

describe("parring, gentagelser og hastighed", () => {
  it("en kode kan bruges én gang; genparring fra samme virksomhed genopliver integrationen", async () => {
    const c = await firma();
    const kode = (h: string) =>
      db.query(
        `insert into commerce_pairing_codes (company_id, provider, code_hash, expires_at) values ($1, 'woocommerce', $2, now() + interval '15 minutes')`,
        [c, h],
      );
    const par = (h: string, butik = "store-uuid-1") =>
      en<{ s: { ok: boolean; fejl?: string; integration_id?: string } }>(
        `select public.commerce_par($1, 'woocommerce', $2, 'https://b.example', null, 'DKK', '0.1.0', null, 'k1.a.b.c') as s`,
        [h, butik],
      ).then((r) => r.s);
    const h1 = "1".repeat(64);
    await kode(h1);
    const a = await par(h1);
    expect(a.ok).toBe(true);
    expect(await par(h1)).toMatchObject({ ok: false, fejl: "invalid_pairing_code" });

    await db.query(`select public.commerce_afbryd($1, $2)`, [c, a.integration_id]);
    const af = await en<{ status: string; secret_ciphertext: string | null }>(
      `select status, secret_ciphertext from commerce_integrations where id = $1`,
      [a.integration_id],
    );
    expect(af).toEqual({ status: "revoked", secret_ciphertext: null });

    const h2 = "2".repeat(64);
    await kode(h2);
    const b = await par(h2);
    expect(b).toMatchObject({ ok: true, integration_id: a.integration_id });
  });

  it("en butik forbundet til én virksomhed kan ikke tages af en anden — og koden brændes ikke", async () => {
    const a = await firma("A");
    const b = await firma("B");
    const ia = await integration(a);
    const butik = (await en<{ external_store_id: string }>(`select external_store_id from commerce_integrations where id = $1`, [ia])).external_store_id;
    const h = "3".repeat(64);
    await db.query(
      `insert into commerce_pairing_codes (company_id, provider, code_hash, expires_at) values ($1, 'woocommerce', $2, now() + interval '15 minutes')`,
      [b, h],
    );
    const r = await en<{ s: { ok: boolean; fejl: string } }>(
      `select public.commerce_par($1, 'woocommerce', $2, 'https://x', null, 'DKK', '0.1.0', null, 'k1.a.b.c') as s`,
      [h, butik],
    );
    expect(r.s).toMatchObject({ ok: false, fejl: "store_already_paired" });
    const kodeRk = await en<{ used_at: string | null }>(`select used_at from commerce_pairing_codes where code_hash = $1`, [h]);
    expect(kodeRk.used_at).toBeNull();
  });

  it("et udløbet kode virker ikke", async () => {
    const c = await firma();
    const h = "4".repeat(64);
    await db.query(
      `insert into commerce_pairing_codes (company_id, provider, code_hash, expires_at) values ($1, 'woocommerce', $2, now() - interval '1 second')`,
      [c, h],
    );
    const r = await en<{ s: { ok: boolean; fejl: string } }>(
      `select public.commerce_par($1, 'woocommerce', 'ny-butik', 'https://x', null, 'DKK', '0.1.0', null, 'k1.a.b.c') as s`,
      [h],
    );
    expect(r.s.fejl).toBe("invalid_pairing_code");
  });

  it("et request-id kan kun bruges én gang, og grænsen tæller pr. integration", async () => {
    const c = await firma();
    const i = await integration(c);
    const j = await integration(c);
    const rid = "0f8fad5b-d9cb-469f-a165-70867728950e";
    const g = (iid: string, r: string, limit = 3) =>
      en<{ s: { ok: boolean; fejl?: string } }>(`select public.commerce_godkend($1, $2, $3, 60, 660) as s`, [iid, r, limit]).then((x) => x.s);
    expect(await g(i, rid)).toEqual({ ok: true });
    expect(await g(i, rid)).toMatchObject({ ok: false, fejl: "replay_detected" });
    // Samme id på en ANDEN integration er en anden anmodning.
    expect(await g(j, rid)).toEqual({ ok: true });

    const ids = ["1", "2", "3"].map((n) => `00000000-0000-4000-8000-00000000000${n}`);
    expect(await g(j, ids[0])).toEqual({ ok: true });
    expect(await g(j, ids[1])).toEqual({ ok: true });
    expect(await g(j, ids[2])).toMatchObject({ ok: false, fejl: "rate_limited" });
  });
});

describe("sletning og afbrydelse bevarer historikken", () => {
  it("afbrydelse sletter nøglen, men ikke ordrer, bidrag eller point", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "hist@example.com");
    await synk(i, ordre("9001", 30000), { member: m, point: [{ id: p, earn_value: 10 }] });
    await db.query(`select public.commerce_afbryd($1, $2)`, [c, i]);
    expect(await saldo(p, m)).toBe(30);
    const n = await en<{ n: number }>(`select count(*)::int as n from commerce_order_contributions where integration_id = $1`, [i]);
    expect(n.n).toBe(1);
    const r = await synk(i, ordre("9002", 30000), { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(r).toMatchObject({ ok: false });
  });

  it("slet_virksomhedens_data kender alle commerce-tabellerne", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "slet@example.com");
    await synk(i, ordre("9101", 30000), { member: m, point: [{ id: p, earn_value: 10 }] });
    await db.query(`select public.slet_virksomhedens_data($1)`, [c]);
    for (const t of ["commerce_integrations", "commerce_orders", "commerce_order_contributions", "commerce_program_channels"]) {
      const n = await en<{ n: number }>(`select count(*)::int as n from ${t} where company_id = $1`, [c]);
      expect(n.n, t).toBe(0);
    }
  });
});
