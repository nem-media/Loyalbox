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
    const reserveret = await en<{ n: number }>(`select public.point_reserverede($1, $2) as n`, [p, m]);
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
    const reserveret = await en<{ n: number }>(`select public.point_reserverede($1, $2) as n`, [p, m]);
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
    const par = (h: string, butik = "store-uuid-1", kandidat = "aaaaaaaa-0000-4000-8000-000000000001") =>
      en<{ s: { ok: boolean; fejl?: string; integration_id?: string } }>(
        `select public.commerce_par($1, 'woocommerce', $2, 'https://b.example', null, 'DKK', '0.1.0', null, 'k1.a.b.c', $3) as s`,
        [h, butik, kandidat],
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
      `select public.commerce_par($1, 'woocommerce', $2, 'https://x', null, 'DKK', '0.1.0', null, 'k1.a.b.c', gen_random_uuid()) as s`,
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
      `select public.commerce_par($1, 'woocommerce', 'ny-butik', 'https://x', null, 'DKK', '0.1.0', null, 'k1.a.b.c', gen_random_uuid()) as s`,
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

// ===========================================================================
// HÆRDNING: global brugbar saldo, ventende identitet (90 dage)
// ===========================================================================

describe("brugbar saldo gælder AL pointforbrug — også ved disken", () => {
  async function kunde(saldoPoint: number) {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, `g${Math.random()}@example.com`);
    await db.query(`select public.point_giv($1, $2, $3, $4, 'adjust_add', null, null, null, null, 'start')`, [c, p, m, saldoPoint]);
    const webshop = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'Webshoprabat', 500) returning id`,
      [c, p],
    );
    await db.query(
      `insert into commerce_reward_channels (company_id, provider, point_reward_id, discount_type, amount_minor, currency) values ($1, 'woocommerce', $2, 'fixed_amount', 5000, 'DKK')`,
      [c, webshop.id],
    );
    const ref = "lc_" + Math.random().toString(16).slice(2).padEnd(32, "0").slice(0, 32);
    await db.query(
      `insert into commerce_customer_links (company_id, integration_id, external_customer_id, email_norm, member_id, customer_ref, status, link_method, verified_at)
       values ($1, $2, '1', 'x@example.com', $3, $4, 'verified', 'verified_email', now())`,
      [c, i, m, ref],
    );
    const fysisk = async (pris: number) =>
      (
        await en<{ id: string }>(
          `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'Ved disken', $3) returning id`,
          [c, p, pris],
        )
      ).id;
    const reserver = async (kurv: string) =>
      (
        await en<{ s: { ok: boolean; fejl?: string; reservation_id?: string } }>(
          `select public.commerce_reserver($1, $2, $3, $4, 100000, 'DKK', 1800) as s`,
          [i, ref, webshop.id, kurv],
        )
      ).s;
    const indloes = async (belId: string) =>
      (await en<{ s: { ok: boolean; fejl?: string } }>(`select public.point_indloes($1, $2, $3, $4) as s`, [c, p, m, belId])).s;
    const brugbar = async () =>
      (await en<{ s: { saldo: number; reserveret: number; brugbar: number } }>(`select public.point_brugbar_saldo($1, $2) as s`, [p, m])).s;
    return { c, p, i, m, reserver, indloes, brugbar, fysisk };
  }

  it("620 point, 500 reserveret i webshoppen: disken kan IKKE indløse 500", async () => {
    const k = await kunde(620);
    expect((await k.reserver("kurv")).ok).toBe(true);
    const r = await k.indloes(await k.fysisk(500));
    expect(r).toMatchObject({ ok: false, fejl: "point-reserveret" });
    expect(await k.brugbar()).toEqual({ saldo: 620, reserveret: 500, brugbar: 120 });
  });

  it("… men KAN indløse 100 — saldo 520, reserveret 500, brugbar 20; og commit slutter på 20", async () => {
    const k = await kunde(620);
    const res = await k.reserver("kurv");
    expect((await k.indloes(await k.fysisk(100))).ok).toBe(true);
    expect(await k.brugbar()).toEqual({ saldo: 520, reserveret: 500, brugbar: 20 });

    const c = await en<{ s: { ok: boolean } }>(`select public.commerce_commit($1, $2, 'o-1') as s`, [k.i, res.reservation_id]);
    expect(c.s.ok).toBe(true);
    expect(await k.brugbar()).toEqual({ saldo: 20, reserveret: 0, brugbar: 20 });
  });

  it("uden reservation er alt som før — for få point er stadig 'for-faa-point'", async () => {
    const k = await kunde(300);
    expect(await k.indloes(await k.fysisk(500))).toMatchObject({ ok: false, fejl: "for-faa-point" });
    expect((await k.indloes(await k.fysisk(300))).ok).toBe(true);
  });

  it("disken først: så kan webshoppen ikke reservere de samme point", async () => {
    const k = await kunde(620);
    expect((await k.indloes(await k.fysisk(500))).ok).toBe(true);
    expect(await k.reserver("kurv")).toMatchObject({ ok: false, fejl: "insufficient_points" });
  });

  it("committed, released og expired tæller ikke — kun reserved", async () => {
    const k = await kunde(2000);
    const a = await k.reserver("a");
    const b = await k.reserver("b");
    const cc = await k.reserver("c");
    expect((await k.brugbar()).reserveret).toBe(1500);
    await db.query(`select public.commerce_commit($1, $2, 'o-a')`, [k.i, a.reservation_id]);
    await db.query(`select public.commerce_frigiv($1, $2)`, [k.i, b.reservation_id]);
    await db.query(`update commerce_reward_reservations set expires_at = now() - interval '1 second' where id = $1`, [cc.reservation_id]);
    expect(await k.brugbar()).toEqual({ saldo: 1500, reserveret: 0, brugbar: 1500 });
  });

  it("en commit bruger sine egne point — og et fradrag kan ikke tage en anden kurvs", async () => {
    const k = await kunde(1000);
    const a = await k.reserver("a");
    await k.reserver("b");
    // Før denne hærdning kunne en manuel rettelse gå ned i de reserverede
    // point, så A's commit måtte afvises for ikke at tage B's. Nu kan
    // fradraget slet ikke ske: alt er reserveret.
    const fradrag = await en<{ s: { ok: boolean; fejl: string; maks: number } }>(
      `select public.point_giv($1, $2, $3, -300, 'adjust_remove', null, null, null, null, 'rettelse') as s`,
      [k.c, k.p, k.m],
    );
    expect(fradrag.s).toMatchObject({ ok: false, fejl: "point-reserveret", maks: 0 });
    const c = await en<{ s: { ok: boolean } }>(`select public.commerce_commit($1, $2, 'o-a') as s`, [k.i, a.reservation_id]);
    expect(c.s.ok).toBe(true);
    expect(await k.brugbar()).toEqual({ saldo: 500, reserveret: 500, brugbar: 0 });
  });

  it("indløsningen ved disken er stadig idempotent", async () => {
    const k = await kunde(1000);
    const bel = await k.fysisk(100);
    const a = await en<{ s: { ok: boolean; gentagelse: boolean } }>(`select public.point_indloes($1, $2, $3, $4, 'ref-1') as s`, [k.c, k.p, k.m, bel]);
    const b = await en<{ s: { ok: boolean; gentagelse: boolean } }>(`select public.point_indloes($1, $2, $3, $4, 'ref-1') as s`, [k.c, k.p, k.m, bel]);
    expect(a.s).toMatchObject({ ok: true, gentagelse: false });
    expect(b.s).toMatchObject({ ok: true, gentagelse: true });
    expect((await k.brugbar()).saldo).toBe(900);
  });
});

describe("ventende webshopidentitet: 90 dage fra seneste aktivitet", () => {
  async function ventende(dageSiden: number, email: string, c?: string) {
    const firmaId = c ?? (await firma());
    const p = c
      ? (await en<{ point_program_id: string }>(
          `select point_program_id from commerce_program_channels where company_id = $1 and point_program_id is not null`,
          [c],
        )).point_program_id
      : await pointprogram(firmaId, 10);
    const i = await integration(firmaId);
    const opd = new Date(Date.now() - dageSiden * 86_400_000).toISOString();
    const o = ordre(`v-${Math.random()}`, 30000, { updated_at: opd, created_at: opd, paid_at: opd });
    await synk(i, o, { point: [{ id: p, earn_value: 10 }], email, observedAt: opd });
    return { c: firmaId, p, i, o };
  }

  it("efter 90 dage fjernes e-mailen; ordren og bidraget bliver uden identitet", async () => {
    const v = await ventende(100, "gammel@example.com");
    await db.query(
      `insert into commerce_customer_links (company_id, integration_id, email_norm, customer_ref, created_at, verification_sent_at)
       values ($1, $2, 'gammel@example.com', $3, now() - interval '100 days', now() - interval '100 days')`,
      [v.c, v.i, "lc_" + "e".repeat(32)],
    );
    const r = await en<{ s: { identiteter_udloebet: number; koblinger_slettet: number } }>(`select public.commerce_oprydning() as s`);
    expect(r.s.identiteter_udloebet).toBeGreaterThanOrEqual(1);
    expect(r.s.koblinger_slettet).toBeGreaterThanOrEqual(1);

    const ordren = await en<{ customer_email_norm: string | null; customer_resolution: string }>(
      `select customer_email_norm, customer_resolution from commerce_orders where integration_id = $1`,
      [v.i],
    );
    expect(ordren).toEqual({ customer_email_norm: null, customer_resolution: "expired" });
    const bidrag = await en<{ status: string; target: number }>(
      `select status, target from commerce_order_contributions where integration_id = $1`,
      [v.i],
    );
    expect(bidrag).toEqual({ status: "identity_expired", target: 30 });
    const links = await en<{ n: number }>(`select count(*)::int as n from commerce_customer_links where email_norm = 'gammel@example.com'`);
    expect(links.n).toBe(0);
  });

  it("en udløbet identitet kan ikke kræves — heller ikke af en kunde med samme e-mail", async () => {
    const v = await ventende(100, "krav@example.com");
    await db.query(`select public.commerce_oprydning()`);
    const m = await medlem(v.c, "krav@example.com");
    const krav = await en<{ s: { ordrer: number } }>(`select public.commerce_goer_krav($1, $2, 'krav@example.com') as s`, [v.c, m]);
    expect(krav.s.ordrer).toBe(0);
    expect(await saldo(v.p, m)).toBe(0);
  });

  it("en gensendelse af samme ordre genopliver ikke identiteten — en RIGTIG ændring gør", async () => {
    const v = await ventende(100, "gensend@example.com");
    await db.query(`select public.commerce_oprydning()`);
    const m = await medlem(v.c, "gensend@example.com");

    // Pluginets natlige afstemning sender samme ordre igen, nu MED en kunde.
    const igen = await synk(v.i, v.o, {
      point: [{ id: v.p, earn_value: 10 }],
      member: m,
      email: "gensend@example.com",
      observedAt: new Date().toISOString(),
    });
    expect(igen.member_id ?? null).toBeNull();
    expect(igen.bidrag![0].status).toBe("identity_expired");
    expect(await saldo(v.p, m)).toBe(0);

    // Ordren ændres faktisk på platformen (en refundering): ny aktivitet.
    const aendret = refunderet(v.o, 10000, new Date().toISOString());
    const ny = await synk(v.i, aendret, {
      point: [{ id: v.p, earn_value: 10 }],
      member: m,
      email: "gensend@example.com",
      observedAt: new Date().toISOString(),
    });
    expect(ny.member_id).toBe(m);
    expect(await saldo(v.p, m)).toBe(20);
  });

  it("en nyere ordre med samme e-mail holder ALLE kundens ventende ordrer åbne", async () => {
    const gammel = await ventende(100, "aktiv@example.com");
    await ventende(10, "aktiv@example.com", gammel.c);
    await db.query(`select public.commerce_oprydning()`);
    const r = await alle<{ customer_email_norm: string | null }>(
      `select customer_email_norm from commerce_orders where company_id = $1`,
      [gammel.c],
    );
    expect(r.map((x) => x.customer_email_norm)).toEqual(["aktiv@example.com", "aktiv@example.com"]);
  });

  it("under 90 dage røres intet", async () => {
    const v = await ventende(89, "ung@example.com");
    await db.query(`select public.commerce_oprydning()`);
    const o = await en<{ customer_email_norm: string | null }>(`select customer_email_norm from commerce_orders where integration_id = $1`, [v.i]);
    expect(o.customer_email_norm).toBe("ung@example.com");
  });

  it("markedsføringssamtykket er urørt af krav og oprydning", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    await synk(i, ordre("mk-1", 30000), { point: [{ id: p, earn_value: 10 }], email: "mk@example.com" });
    const m = await medlem(c, "mk@example.com");
    await db.query(
      `insert into consent_records (company_id, member_id, type, granted, channel) values ($1, $2, 'marketing', false, 'self_enroll')`,
      [c, m],
    );
    const foer = await alle(`select type, granted, withdrawn_at from consent_records where member_id = $1 order by granted_at`, [m]);
    await db.query(`select public.commerce_goer_krav($1, $2, 'mk@example.com')`, [c, m]);
    await db.query(`select public.commerce_oprydning()`);
    expect(await alle(`select type, granted, withdrawn_at from consent_records where member_id = $1 order by granted_at`, [m])).toEqual(foer);
    expect(await saldo(p, m)).toBe(30);
  });
});

// ===========================================================================
// FINAL: manuelle fradrag respekterer reservationer; systemtilbageførsel
// frigiver deterministisk
// ===========================================================================

describe("manuelle justeringer og reservationer", () => {
  async function kunde(saldoPoint: number, reservation = 500) {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, `j${Math.random()}@example.com`);
    await db.query(`select public.point_giv($1, $2, $3, $4, 'adjust_add', null, null, null, null, 'start')`, [c, p, m, saldoPoint]);
    const bel = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'Webshoprabat', $3) returning id`,
      [c, p, reservation],
    );
    await db.query(
      `insert into commerce_reward_channels (company_id, provider, point_reward_id, discount_type, amount_minor, currency) values ($1, 'woocommerce', $2, 'fixed_amount', 5000, 'DKK')`,
      [c, bel.id],
    );
    const ref = "lc_" + Math.random().toString(16).slice(2).padEnd(32, "0").slice(0, 32);
    await db.query(
      `insert into commerce_customer_links (company_id, integration_id, external_customer_id, email_norm, member_id, customer_ref, status, link_method, verified_at)
       values ($1, $2, '1', 'x@example.com', $3, $4, 'verified', 'verified_email', now())`,
      [c, i, m, ref],
    );
    const reserver = async (kurv = "kurv") =>
      (
        await en<{ s: { ok: boolean; fejl?: string; reservation_id?: string } }>(
          `select public.commerce_reserver($1, $2, $3, $4, 100000, 'DKK', 1800) as s`,
          [i, ref, bel.id, kurv],
        )
      ).s;
    const juster = async (point: number) =>
      (
        await en<{ s: { ok: boolean; fejl?: string; maks?: number } }>(
          `select public.point_giv($1, $2, $3, $4, $5, null, null, null, null, 'rettelse') as s`,
          [c, p, m, point, point < 0 ? "adjust_remove" : "adjust_add"],
        )
      ).s;
    const brugbar = async () =>
      (await en<{ s: { saldo: number; reserveret: number; brugbar: number } }>(`select public.point_brugbar_saldo($1, $2) as s`, [p, m])).s;
    const commit = async (id: string, ordre = "o-1") =>
      (await en<{ s: { ok: boolean; fejl?: string; grund?: string } }>(`select public.commerce_commit($1, $2, $3) as s`, [i, id, ordre])).s;
    return { c, p, i, m, reserver, juster, brugbar, commit };
  }

  it("A: 620 point, 500 reserveret — et manuelt fradrag på 200 afvises med det, der kan trækkes", async () => {
    const k = await kunde(620);
    await k.reserver();
    expect(await k.juster(-200)).toMatchObject({ ok: false, fejl: "point-reserveret", maks: 120 });
    expect(await k.brugbar()).toEqual({ saldo: 620, reserveret: 500, brugbar: 120 });
  });

  it("B + C: et fradrag på 100 går igennem (520/500/20), og commit af 500 ender på 20", async () => {
    const k = await kunde(620);
    const res = await k.reserver();
    expect((await k.juster(-100)).ok).toBe(true);
    expect(await k.brugbar()).toEqual({ saldo: 520, reserveret: 500, brugbar: 20 });
    expect((await k.commit(res.reservation_id!)).ok).toBe(true);
    expect(await k.brugbar()).toEqual({ saldo: 20, reserveret: 0, brugbar: 20 });
  });

  it("D: et positivt tillæg er upåvirket af reservationer", async () => {
    const k = await kunde(620);
    await k.reserver();
    expect((await k.juster(200)).ok).toBe(true);
    expect(await k.brugbar()).toEqual({ saldo: 820, reserveret: 500, brugbar: 320 });
  });

  it("E: uden reservation er et fradrag som før — også 'for-faa-point' ved for stort", async () => {
    const k = await kunde(300);
    expect((await k.juster(-300)).ok).toBe(true);
    expect(await k.juster(-1)).toMatchObject({ ok: false, fejl: "for-faa-point" });
  });

  it("F: disk, fradrag og reservation deler den samme brugbare saldo", async () => {
    const k = await kunde(1000, 400);
    await k.reserver();
    const disk = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'Disk', 300) returning id`,
      [k.c, k.p],
    );
    expect((await en<{ s: { ok: boolean } }>(`select public.point_indloes($1, $2, $3, $4) as s`, [k.c, k.p, k.m, disk.id])).s.ok).toBe(true);
    // 700 − 400 reserveret = 300 brugbar
    expect(await k.juster(-301)).toMatchObject({ ok: false, fejl: "point-reserveret", maks: 300 });
    expect((await k.juster(-300)).ok).toBe(true);
    expect(await k.reserver("kurv-2")).toMatchObject({ ok: false, fejl: "insufficient_points" });
    expect(await k.brugbar()).toEqual({ saldo: 400, reserveret: 400, brugbar: 0 });
  });

  it("annullering af en optjening ved personalet respekterer også reservationer", async () => {
    const k = await kunde(0);
    const earn = await en<{ s: { txn: string } }>(`select public.point_giv($1, $2, $3, 600, 'earn') as s`, [k.c, k.p, k.m]);
    await k.reserver();
    const r = await en<{ s: { ok: boolean; fejl: string; maks: number } }>(`select public.point_annuller($1, $2) as s`, [k.c, earn.s.txn]);
    expect(r.s).toMatchObject({ ok: false, fejl: "point-reserveret" });
    expect((await k.brugbar()).saldo).toBe(600);
  });
});

describe("systemtilbageførsel: regnskabet vinder, og reservationen frigives deterministisk", () => {
  it("en refundering af en optjening, der går ned i det reserverede, frigiver reservationen med grunden 'balance_reduced'", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "refunder@example.com");
    const o = ordre("sys-1", 60000);
    await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] }); // +60
    await db.query(`select public.point_giv($1, $2, $3, 500, 'adjust_add')`, [c, p, m]); // 560
    const bel = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'R', 540) returning id`,
      [c, p],
    );
    await db.query(
      `insert into commerce_reward_channels (company_id, provider, point_reward_id, discount_type, amount_minor, currency) values ($1, 'woocommerce', $2, 'fixed_amount', 5000, 'DKK')`,
      [c, bel.id],
    );
    const ref = "lc_" + "c".repeat(32);
    await db.query(
      `insert into commerce_customer_links (company_id, integration_id, external_customer_id, email_norm, member_id, customer_ref, status, link_method, verified_at)
       values ($1, $2, '1', 'refunder@example.com', $3, $4, 'verified', 'verified_email', now())`,
      [c, i, m, ref],
    );
    const res = await en<{ s: { ok: boolean; reservation_id: string } }>(
      `select public.commerce_reserver($1, $2, $3, 'kurv', 100000, 'DKK', 1800) as s`,
      [i, ref, bel.id],
    );
    expect(res.s.ok).toBe(true);

    // Ordren refunderes helt: 60 point skal tilbage, selv om 540 af 560 er reserveret.
    const fuld = refunderet(o, 60000, "2026-09-30T10:00:00Z");
    const r = await synk(i, fuld, { member: m, point: [{ id: p, earn_value: 10 }] });
    expect(r.bidrag![0]).toMatchObject({ target: 0, foer: 60, efter: 0, status: "applied" });

    const efter = await en<{ status: string; status_reason: string }>(
      `select status, status_reason from commerce_reward_reservations where id = $1`,
      [res.s.reservation_id],
    );
    expect(efter).toEqual({ status: "released", status_reason: "balance_reduced" });
    const s = await en<{ s: { saldo: number; reserveret: number } }>(`select public.point_brugbar_saldo($1, $2) as s`, [p, m]);
    expect(s.s).toMatchObject({ saldo: 500, reserveret: 0 });

    const commit = await en<{ s: { ok: boolean; fejl: string; grund: string } }>(
      `select public.commerce_commit($1, $2, 'sys-1-ny') as s`,
      [i, res.s.reservation_id],
    );
    expect(commit.s).toEqual({ ok: false, fejl: "reservation_expired", grund: "balance_reduced" });
  });

  it("dækker saldoen stadig reservationerne, frigives intet", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "daekket@example.com");
    const o = ordre("sys-2", 30000);
    await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] }); // 30
    await db.query(`select public.point_giv($1, $2, $3, 1000, 'adjust_add')`, [c, p, m]); // 1030
    const bel = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'R', 500) returning id`,
      [c, p],
    );
    await db.query(
      `insert into commerce_reward_channels (company_id, provider, point_reward_id, discount_type, amount_minor, currency) values ($1, 'woocommerce', $2, 'fixed_amount', 5000, 'DKK')`,
      [c, bel.id],
    );
    await db.query(
      `insert into commerce_customer_links (company_id, integration_id, external_customer_id, email_norm, member_id, customer_ref, status, link_method, verified_at)
       values ($1, $2, '1', 'd@example.com', $3, $4, 'verified', 'verified_email', now())`,
      [c, i, m, "lc_" + "d".repeat(32)],
    );
    const res = await en<{ s: { reservation_id: string } }>(
      `select public.commerce_reserver($1, $2, $3, 'kurv', 100000, 'DKK', 1800) as s`,
      [i, "lc_" + "d".repeat(32), bel.id],
    );
    await synk(i, refunderet(o, 30000, "2026-09-30T10:00:00Z"), { member: m, point: [{ id: p, earn_value: 10 }] });
    const efter = await en<{ status: string }>(`select status from commerce_reward_reservations where id = $1`, [res.s.reservation_id]);
    expect(efter.status).toBe("reserved");
  });

  it("regression: optjening, delvis og fuld refundering bogføres som før (ingen reservationer)", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const i = await integration(c);
    const m = await medlem(c, "reg@example.com");
    const o = ordre("reg-1", 75000);
    await synk(i, o, { member: m, point: [{ id: p, earn_value: 10 }] });
    const delvis = refunderet(o, 30000, "2026-09-30T10:00:00Z");
    await synk(i, delvis, { member: m, point: [{ id: p, earn_value: 10 }] });
    await synk(i, refunderet(delvis, 45000, "2026-09-30T11:00:00Z"), { member: m, point: [{ id: p, earn_value: 10 }] });
    const linjer = await alle<{ type: string; points: number }>(
      `select type, points from loyalty_point_transactions where member_id = $1 order by created_at`,
      [m],
    );
    expect(linjer).toEqual([
      { type: "earn", points: 75 },
      { type: "adjust_remove", points: -30 },
      { type: "adjust_remove", points: -45 },
    ]);
  });

  it("regression: personalets annullering af en optjening og af en indløsning virker uden reservationer", async () => {
    const c = await firma();
    const p = await pointprogram(c, 10);
    const m = await medlem(c, "ann@example.com");
    const earn = await en<{ s: { txn: string } }>(`select public.point_giv($1, $2, $3, 300, 'earn') as s`, [c, p, m]);
    const bel = await en<{ id: string }>(
      `insert into loyalty_point_rewards (company_id, program_id, name, points_cost) values ($1, $2, 'Kaffe', 100) returning id`,
      [c, p],
    );
    const ind = await en<{ s: { txn: string } }>(`select public.point_indloes($1, $2, $3, $4) as s`, [c, p, m, bel.id]);
    expect((await en<{ s: { ok: boolean } }>(`select public.point_annuller($1, $2) as s`, [c, ind.s.txn])).s.ok).toBe(true);
    expect(await saldo(p, m)).toBe(300);
    expect((await en<{ s: { ok: boolean } }>(`select public.point_annuller($1, $2) as s`, [c, earn.s.txn])).s.ok).toBe(true);
    expect(await saldo(p, m)).toBe(0);
  });
});

describe("parring med nøgle bundet til integrationen", () => {
  it("genforbindelse med et nyt kandidat-id svarer med den eksisterende integration — uden at bruge koden", async () => {
    const c = await firma();
    const h1 = "5".repeat(64);
    const h2 = "6".repeat(64);
    for (const h of [h1, h2]) {
      await db.query(
        `insert into commerce_pairing_codes (company_id, provider, code_hash, expires_at) values ($1, 'woocommerce', $2, now() + interval '15 minutes')`,
        [c, h],
      );
    }
    const par = (h: string, kandidat: string) =>
      en<{ s: { ok: boolean; fejl?: string; integration_id?: string } }>(
        `select public.commerce_par($1, 'woocommerce', 'kandidat-butik', 'https://k.example', null, 'DKK', '0.1.0', null, 'k1.a.b.c', $2) as s`,
        [h, kandidat],
      ).then((r) => r.s);
    const foerste = "cccccccc-0000-4000-8000-000000000001";
    expect(await par(h1, foerste)).toMatchObject({ ok: true, integration_id: foerste });

    const anden = "cccccccc-0000-4000-8000-000000000002";
    expect(await par(h2, anden)).toEqual({ ok: false, fejl: "ny_noegle_kraeves", integration_id: foerste });
    const kode = await en<{ used_at: string | null }>(`select used_at from commerce_pairing_codes where code_hash = $1`, [h2]);
    expect(kode.used_at).toBeNull();
    expect(await par(h2, foerste)).toMatchObject({ ok: true, integration_id: foerste });
  });
});
