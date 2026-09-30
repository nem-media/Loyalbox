import { describe, it, expect, vi, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { valider, orderInvariants } from "./contract";
import { beregnEligibleSpend } from "./eligible-spend";
import { pointTarget, stempelTarget } from "./targets";
import { STANDARD_VALUTA, UNDERSTOETTEDE_VALUTAER, erUnderstoettetValuta } from "./valuta";
import { brugbarSaldo, beloenningStatus, pointReserveretTekst } from "@/lib/loyalty/point";
import type { CommerceOrder } from "./types";

/**
 * HÆRDNINGEN FØR MERGE — de regler, der ikke må glide tilbage.
 */

vi.mock("@/lib/loyalty/plan", () => ({ commerceIPlan: async () => true }));

const FIX = join(process.cwd(), "src/lib/commerce-api/contract/v1/examples");
const laes = (f: string) => JSON.parse(readFileSync(join(FIX, f), "utf8")) as CommerceOrder;
const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

afterEach(() => vi.unstubAllEnvs());

describe("krypteringsnøglen mangler: parringen fejler lukket og rører intet", () => {
  it("svarer commerce_unavailable, før basen spørges", async () => {
    vi.stubEnv("LOYALSUM_COMMERCE_ENCRYPTION_KEY", "");
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "en-gyldig-service-role-noegle-der-ikke-maa-bruges");
    const { parButik } = await import("./pairing");
    const basen = new Proxy({}, { get: () => { throw new Error("basen må ikke røres"); } });
    const r = await parButik(
      { pairing_code: "K7QM-4XWD-9RTB", store: JSON.parse(readFileSync(join(FIX, "store.json"), "utf8")) },
      basen as never,
    );
    expect(r).toMatchObject({ ok: false, kode: "commerce_unavailable" });
  });
});

describe("DKK er V1 — ét sted", () => {
  it("kun DKK er understøttet", () => {
    expect([...UNDERSTOETTEDE_VALUTAER]).toEqual(["DKK"]);
    expect(STANDARD_VALUTA).toBe("DKK");
    for (const v of ["EUR", "SEK", "NOK", "GBP"]) expect(erUnderstoettetValuta(v)).toBe(false);
  });

  it("ingen anden webshopfil skriver valutakoden ud", () => {
    const filer = (dir: string): string[] =>
      readdirSync(dir).flatMap((f) => {
        const p = join(dir, f);
        if (statSync(p).isDirectory()) return f === "contract" ? [] : filer(p);
        return /\.(ts|tsx)$/.test(f) && !f.includes(".test.") && !f.endsWith("valuta.ts") ? [p] : [];
      });
    const alle = [
      ...filer(join(process.cwd(), "src/lib/commerce-api")),
      ...filer(join(process.cwd(), "src/app/api/v1")),
      ...filer(join(process.cwd(), "src/app/dashboard/integrationer")),
    ];
    for (const f of alle) expect(udenKommentarer(readFileSync(f, "utf8")), f).not.toMatch(/["']DKK["']/);
  });
});

describe("order_status styrer aldrig loyalitet", () => {
  const maal = (o: CommerceOrder) => {
    const e = beregnEligibleSpend(o);
    return {
      e,
      point: pointTarget({ earn_model: "per_amount", earn_value: 10 }, e.eligible_spend_minor, e.earning_qualified),
      stempel: stempelTarget(e.eligible_spend_minor, e.earning_qualified, 10000),
    };
  };

  it("WooCommerce refunded = cancelled + refunded giver det samme som enhver anden livsstatus", () => {
    const fuld = laes("woocommerce-full-refund.json");
    expect(fuld.order_status).toBe("cancelled");
    expect(fuld.payment_status).toBe("refunded");
    for (const os of ["open", "completed", "cancelled"] as const) {
      expect(maal({ ...fuld, order_status: os })).toEqual({ e: { earning_qualified: false, eligible_spend_minor: 0 }, point: 0, stempel: 0 });
    }
  });

  it("en betalt ordre, der er annulleret uden refundering, optjener stadig — pengene er ikke givet tilbage", () => {
    const o = laes("woocommerce-paid-order.json");
    expect(maal({ ...o, order_status: "cancelled" })).toEqual(maal(o));
    expect(maal(o).point).toBe(31);
  });

  it("en delvis refundering regnes ens, uanset livsstatus", () => {
    const o = laes("woocommerce-partial-refund.json");
    const set = new Set((["open", "completed", "cancelled"] as const).map((os) => JSON.stringify(maal({ ...o, order_status: os }))));
    expect(set.size).toBe(1);
  });
});

describe("negative gebyrer findes ikke i kontrakten", () => {
  it("et negativt gebyr afvises af skemaet — core regner det aldrig om", () => {
    const o = laes("woocommerce-paid-order.json");
    const med = { ...o, amounts: { ...o.amounts, fees_incl_tax: -500, order_total_incl_tax: o.amounts.order_total_incl_tax - 500 } };
    expect(valider("order", med).ok).toBe(false);
  });
  it("heller ikke skjult i en linjerabat, der ikke går op", () => {
    const o = laes("woocommerce-paid-order.json");
    const l = o.line_items[0];
    const skjult = { ...o, line_items: [{ ...l, discount_ex_tax: l.discount_ex_tax + 400 }, ...o.line_items.slice(1)] };
    expect(orderInvariants(skjult).length).toBeGreaterThan(0);
  });
});

describe("brugbar saldo til visning", () => {
  it("saldo minus reserveret, aldrig under nul", () => {
    expect(brugbarSaldo(620, 500)).toBe(120);
    expect(brugbarSaldo(520, 500)).toBe(20);
    expect(brugbarSaldo(100, 500)).toBe(0);
    expect(brugbarSaldo(100)).toBe(100);
  });
  it("status ved disken regnes af den brugbare saldo", () => {
    expect(beloenningStatus(brugbarSaldo(620, 500), 500)).toEqual({ kanIndloeses: false, mangler: 380 });
    expect(beloenningStatus(brugbarSaldo(620, 500), 100).kanIndloeses).toBe(true);
  });
});

describe("indløsningen ved disken — seneste definition af point_indloes", () => {
  const seneste = (navn: string) => {
    let fundet = "";
    for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) {
      const t = readFileSync(`supabase/migrations/${f}`, "utf8");
      const i = t.indexOf(`create or replace function public.${navn}(`);
      if (i !== -1) fundet = t.slice(i, t.indexOf("$$;", i));
    }
    return fundet.replace(/--.*$/gm, "").replace(/\s+/g, " ");
  };
  const ind = seneste("point_indloes");

  it("trækker kun på den brugbare saldo — tællet efter låsen", () => {
    expect(ind).toMatch(/konto := public\.point_konto_laast\(p_company, p_program, p_member\);.*reserveret := public\.point_reserverede\(p_program, p_member\);/);
    expect(ind).toMatch(/and balance - bel\.points_cost >= 0 and balance - bel\.points_cost >= reserveret/);
    expect(ind).toMatch(/'point-reserveret'/);
  });

  it("beholder 0044's sikkerhed: pris fra basen, ejerskab, aktivt program, aftryk, idempotens", () => {
    expect(ind).not.toMatch(/p_points|p_pris|p_cost/);
    expect(ind).toMatch(/where id = p_reward and program_id = p_program and company_id = p_company/);
    expect(ind).toMatch(/where id = p_program and company_id = p_company/);
    expect(ind).toMatch(/if prog\.status <> 'active' then/);
    expect(ind).toMatch(/if bel\.status <> 'active' then/);
    expect(ind).toMatch(/bel\.name, bel\.points_cost/);
    expect(ind).toMatch(/exception when unique_violation then/);
    expect(ind).toMatch(/if ny_saldo is null then return jsonb_build_object\('ok', false/);
  });

  it("reservationen og commit'en bruger samme definition", () => {
    expect(seneste("commerce_reserver")).toMatch(/point_reserverede\(prog\.id, link\.member_id\)/);
    expect(seneste("commerce_commit")).toMatch(/point_reserverede\(res\.point_program_id, res\.member_id\) - res\.points_reserved/);
    expect(seneste("point_reserverede")).toMatch(/status = 'reserved' and expires_at > now\(\)/);
  });
});

describe("alle fradrag går gennem reservationsreglen — seneste definitioner", () => {
  const seneste = (navn: string) => {
    let fundet = "";
    for (const f of readdirSync("supabase/migrations").filter((x) => x.endsWith(".sql")).sort()) {
      const t = readFileSync(`supabase/migrations/${f}`, "utf8");
      const i = t.indexOf(`create or replace function public.${navn}(`);
      if (i !== -1) fundet = t.slice(i, t.indexOf("$$;", i));
    }
    return fundet.replace(/--.*$/gm, "").replace(/\s+/g, " ");
  };

  it("personalets point_giv er point_bevaeg UDEN systemret", () => {
    expect(seneste("point_giv")).toMatch(/return public\.point_bevaeg\(.*p_reason, false\)/);
  });

  it("point_bevaeg afviser et personalefradrag i det reserverede og frigiver ved systemtilbageførsel", () => {
    const b = seneste("point_bevaeg");
    expect(b).toMatch(/if not p_system and konto\.balance \+ p_points >= 0 and konto\.balance \+ p_points < reserveret then/);
    expect(b).toMatch(/'point-reserveret'/);
    expect(b).toMatch(/'maks', greatest\(konto\.balance - reserveret, 0\)/);
    expect(b).toMatch(/status_reason = 'balance_reduced'/);
    expect(b).toMatch(/order by created_at desc, id desc/);
  });

  it("annullering af en optjening respekterer reservationer", () => {
    expect(seneste("point_annuller")).toMatch(/if org\.points > 0 then reserveret := public\.point_reserverede/);
  });

  it("LÅSERÆKKEFØLGE: reservationer før konto i systemtilbageførsel, bidrag, synk og commit", () => {
    expect(seneste("point_bevaeg")).toMatch(/perform public\.point_reservationer_laas\(p_program, p_member\);.*konto := public\.point_konto_laast/);
    expect(seneste("commerce_anvend_pointbidrag")).toMatch(/perform public\.point_reservationer_laas\(c\.point_program_id, c\.member_id\); konto := public\.point_konto_laast/);
    const synk = seneste("commerce_synk_ordre");
    expect(synk.indexOf("where member_id = o.member_id and status = 'reserved' order by id for update")).toBeGreaterThan(-1);
    expect(synk.indexOf("for update;")).toBeLessThan(synk.indexOf("commerce_tilbagefoer_beloenninger"));
    const commit = seneste("commerce_commit");
    expect(commit.indexOf("status = 'committed' order by id for update")).toBeLessThan(commit.indexOf("point_konto_laast"));
  });

  it("webshoppens refundering bruger systemstien", () => {
    expect(seneste("commerce_anvend_pointbidrag")).toMatch(/public\.point_bevaeg\(.*, true \)/);
  });

  it("personalets besked siger, hvor meget der kan trækkes", () => {
    expect(pointReserveretTekst(120)).toBe(
      "Kunden har point reserveret til en igangværende webshopordre. Der kan højst trækkes 120 point lige nu.",
    );
    expect(pointReserveretTekst(-5)).toContain("0 point");
  });
});
