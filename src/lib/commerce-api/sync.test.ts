import { describe, it, expect, vi } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { synkroniserOrdre, type SynkAfhaengigheder, type BidragSvar } from "./sync";
import { valider } from "./contract";
import type { IntegrationRow } from "./rows";
import type { CommerceOrder } from "./types";

/**
 * ORKESTRERINGEN AF `POST /orders/sync` — uden database.
 *
 * Basens del (lås, ældre tilstand, bogføring) prøves i
 * `src/test-db/commerce-sql.test.ts`. Her prøves det, der sker FØR og EFTER:
 * at en ordre bindes til sin butik og platform, at valutaen afvises, at
 * target regnes af programmets regler, og at svaret følger CommerceSyncResult.
 */

const FIX = join(process.cwd(), "src/lib/commerce-api/contract/v1/examples");
const laes = (f: string) => JSON.parse(readFileSync(join(FIX, f), "utf8")) as CommerceOrder;

const WOO: IntegrationRow = {
  id: "11111111-1111-4111-8111-111111111111",
  company_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  provider: "woocommerce",
  external_store_id: "3f1c2d4e-8b7a-4c61-9d2e-5a6b7c8d9e01",
  store_url: "https://butik.example.com",
  store_name: null,
  currency: "DKK",
  adapter_version: "0.1.0",
  platform_version: null,
  status: "active",
  secret_ciphertext: "x",
  connected_at: "",
  disconnected_at: null,
  last_successful_sync_at: null,
  last_error_at: null,
  last_error_code: null,
};

const PROGRAM = "pppppppp-pppp-4ppp-8ppp-pppppppppppp";

function deps(over: Partial<SynkAfhaengigheder> = {}, anvendt = 0): SynkAfhaengigheder {
  return {
    bekraeftetMedlem: async () => null,
    medlemmerMedEmail: async () => ["m1"],
    hentProgrammer: async () => ({
      point: [{ id: PROGRAM, earn_model: "per_amount", earn_value: 10 }],
      stempel: [],
    }),
    synk: async (p) => ({
      ok: true,
      stale: false,
      bidrag: p.targets.map(
        (t): BidragSvar => ({
          id: "b1",
          kind: t.kind,
          program_id: t.program_id,
          target: t.target,
          foer: anvendt,
          efter: p.memberId ? t.target : anvendt,
          status: p.memberId ? "applied" : "awaiting_customer",
        }),
      ),
    }),
    anvendStempel: async () => null,
    nu: () => new Date("2026-09-30T08:41:12.345Z"),
    ...over,
  };
}

const krop = (order: CommerceOrder, observed_at = "2026-09-29T09:13:41Z") => ({ order, observed_at });

describe("synkroniserOrdre", () => {
  it("en betalt WooCommerce-ordre giver point efter programmets regel og et gyldigt svar", async () => {
    const o = laes("woocommerce-paid-order.json");
    const r = await synkroniserOrdre(WOO, krop(o), "rid", deps());
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.http).toBe(200);
    expect(r.krop).toEqual({
      status: "applied",
      external_order_id: o.external_order_id,
      received_at: "2026-09-30T08:41:12Z",
      contribution: {
        expected: { points: 31, stamps: 0 },
        already_applied: { points: 0, stamps: 0 },
        delta: { points: 31, stamps: 0 },
      },
    });
    expect(valider("syncResult", r.krop)).toEqual({ ok: true });
  });

  it("en dublet svarer unchanged med delta 0", async () => {
    const o = laes("woocommerce-paid-order.json");
    const r = await synkroniserOrdre(WOO, krop(o), "rid", deps({}, 31));
    expect(r.ok && r.krop.status).toBe("unchanged");
    expect(r.ok && r.krop.contribution.delta).toEqual({ points: 0, stamps: 0 });
  });

  it("en ældre tilstand svarer unchanged og ændrer intet", async () => {
    const o = laes("woocommerce-paid-order.json");
    const r = await synkroniserOrdre(
      WOO,
      krop(o),
      "rid",
      deps({
        synk: async () => ({
          ok: true,
          stale: true,
          bidrag: [{ id: "b", kind: "points", program_id: PROGRAM, target: 26, foer: 26, efter: 26, status: "applied" }],
        }),
      }),
    );
    expect(r.ok && r.krop.status).toBe("unchanged");
    expect(r.ok && r.krop.contribution.delta).toEqual({ points: 0, stamps: 0 });
  });

  it("en ukendt kunde giver 202 deferred med customer_not_linked", async () => {
    const o = laes("woocommerce-paid-order.json");
    const r = await synkroniserOrdre(WOO, krop(o), "rid", deps({ medlemmerMedEmail: async () => [] }));
    expect(r.ok && r.http).toBe(202);
    expect(r.ok && r.krop).toMatchObject({ status: "deferred", reason: "customer_not_linked" });
  });

  it("en tvetydig e-mail gættes ikke: ingen kunde sendes til basen", async () => {
    const synk = vi.fn(deps().synk);
    const o = laes("woocommerce-paid-order.json");
    await synkroniserOrdre(WOO, krop(o), "rid", deps({ medlemmerMedEmail: async () => ["m1", "m2"], synk }));
    expect(synk.mock.calls[0][0]).toMatchObject({ memberId: null, resolution: "ambiguous" });
  });

  it("en bekræftet kobling vinder over e-mailen", async () => {
    const synk = vi.fn(deps().synk);
    const o = laes("woocommerce-paid-order.json");
    await synkroniserOrdre(WOO, krop(o), "rid", deps({ bekraeftetMedlem: async () => "linket", synk }));
    expect(synk.mock.calls[0][0]).toMatchObject({ memberId: "linket", resolution: "link" });
  });

  it("e-mailen normaliseres, før der slås op", async () => {
    const medlemmerMedEmail = vi.fn(async () => ["m1"]);
    const o = laes("woocommerce-paid-order.json");
    o.customer.email = "Kunde@Example.COM";
    await synkroniserOrdre(WOO, krop(o), "rid", deps({ medlemmerMedEmail }));
    expect(medlemmerMedEmail).toHaveBeenCalledWith(WOO.company_id, "kunde@example.com");
  });

  it("en ubetalt ordre gemmes, men giver target 0", async () => {
    const synk = vi.fn(deps().synk);
    const r = await synkroniserOrdre(WOO, krop(laes("woocommerce-pending-order.json")), "rid", deps({ synk }));
    expect(synk.mock.calls[0][0].targets).toEqual([{ kind: "points", program_id: PROGRAM, target: 0 }]);
    expect(r.ok && r.krop.status).toBe("unchanged");
  });

  it("et program, der ikke er slået til, får intet bidrag", async () => {
    const synk = vi.fn(deps().synk);
    await synkroniserOrdre(
      WOO,
      krop(laes("woocommerce-paid-order.json")),
      "rid",
      deps({ hentProgrammer: async () => ({ point: [], stempel: [] }), synk }),
    );
    expect(synk.mock.calls[0][0].targets).toEqual([]);
  });

  it("stemplet går gennem stempelmotoren og tæller i svaret", async () => {
    const anvendStempel = vi.fn(async () => ({ id: "s", target: 1, foer: 0, efter: 1, status: "applied" as const, grund: null }));
    const r = await synkroniserOrdre(
      WOO,
      krop(laes("woocommerce-paid-order.json")),
      "rid",
      deps({
        hentProgrammer: async () => ({
          point: [{ id: PROGRAM, earn_model: "per_amount", earn_value: 10 }],
          stempel: [{ id: "st", min_order_minor: 10000 }],
        }),
        anvendStempel,
      }),
    );
    expect(anvendStempel).toHaveBeenCalledOnce();
    expect(r.ok && r.krop.contribution).toEqual({
      expected: { points: 31, stamps: 1 },
      already_applied: { points: 0, stamps: 0 },
      delta: { points: 31, stamps: 1 },
    });
  });

  describe("afvisninger — intet sendes til basen", () => {
    const tjek = async (k: unknown, integration = WOO) => {
      const synk = vi.fn(deps().synk);
      const r = await synkroniserOrdre(integration, k, "rid", deps({ synk }));
      expect(synk).not.toHaveBeenCalled();
      return r.ok ? "ok" : r.kode;
    };

    it("ordre fra en anden platform (provider-spoofing)", async () => {
      expect(await tjek(krop(laes("shopify-paid-order.json")))).toBe("provider_mismatch");
    });
    it("ordre fra en anden butik (store-spoofing)", async () => {
      const o = laes("woocommerce-paid-order.json");
      o.external_store_id = "en-anden-butik";
      expect(await tjek(krop(o))).toBe("store_mismatch");
    });
    it("valuta, butikken ikke har", async () => {
      const o = laes("woocommerce-paid-order.json");
      o.currency = "EUR";
      expect(await tjek(krop(o))).toBe("unsupported_currency");
    });
    it("en valuta, V1 ikke understøtter, selv om butikken er sat til den", async () => {
      const o = laes("woocommerce-paid-order.json");
      o.currency = "EUR";
      expect(await tjek(krop(o), { ...WOO, currency: "EUR" })).toBe("unsupported_currency");
    });
    it("ordrer, der ikke går op, og ugyldige kroppe", async () => {
      expect(await tjek(krop(JSON.parse(readFileSync(join(FIX, "invalid/order-totals-do-not-add-up.json"), "utf8"))))).toBe("invalid_contract");
      expect(await tjek(krop(JSON.parse(readFileSync(join(FIX, "invalid/order-with-float-amount.json"), "utf8"))))).toBe("invalid_contract");
      expect(await tjek({ order: laes("woocommerce-paid-order.json") })).toBe("invalid_contract");
      expect(await tjek({ ...krop(laes("woocommerce-paid-order.json")), points: 1000 })).toBe("invalid_contract");
      expect(await tjek(null)).toBe("invalid_contract");
    });
  });

  it("afviser at sende provider_metadata eller kundens e-mail i klartekst til basen", async () => {
    const synk = vi.fn(deps().synk);
    await synkroniserOrdre(WOO, krop(laes("woocommerce-paid-order.json")), "rid", deps({ synk }));
    const sendt = JSON.stringify(synk.mock.calls[0][0].order);
    expect(sendt).not.toContain("wc_status");
    expect(sendt).not.toContain("Kaffebønner");
  });
});

describe("tidsstempler fra fremtiden", () => {
  it("en observed_at langt ude i fremtiden afvises, så den ikke kan fryse ordren", async () => {
    const synk = vi.fn(deps().synk);
    const o = laes("woocommerce-paid-order.json");
    const r = await synkroniserOrdre(WOO, { order: o, observed_at: "2027-01-01T00:00:00Z" }, "rid", deps({ synk, nu: () => new Date("2026-09-30T08:00:00Z") }));
    expect(r.ok ? "ok" : r.kode).toBe("invalid_contract");
    expect(synk).not.toHaveBeenCalled();
  });
  it("et ur, der går lidt foran, accepteres", async () => {
    const o = laes("woocommerce-paid-order.json");
    const r = await synkroniserOrdre(WOO, { order: o, observed_at: "2026-09-30T08:04:00Z" }, "rid", deps({ nu: () => new Date("2026-09-30T08:00:00Z") }));
    expect(r.ok).toBe(true);
  });
});
