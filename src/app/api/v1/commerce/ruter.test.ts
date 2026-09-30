import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { kanoniskStreng, sha256Hex, signer } from "@/lib/commerce-api/hmac";

/**
 * DE RIGTIGE ROUTE-HANDLERE, MED EN SIGNERET ANMODNING.
 *
 * Databasen er skiftet ud (Supabase kan ikke køres lokalt, og udvikling deler
 * base med produktion), men alt andet er det, der kører i drift: Next'
 * `NextRequest`, `signeret()`, `godkendAnmodning()` og kontraktvalideringen.
 * Det beviser, at signaturen regnes over den RÅ krop og stien MED query, og at
 * svarene har kontraktens form.
 */

const INTEGRATION = {
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
  secret_ciphertext: "chiffer",
  connected_at: "2026-09-29T00:00:00Z",
  disconnected_at: null,
  last_successful_sync_at: null,
  last_error_at: null,
  last_error_code: null,
};
const NOEGLE = "test-secret-do-not-use";
const brugte = new Set<string>();
const noterFejl = vi.fn(async () => {});
let adgang = true;

vi.mock("@/lib/commerce-api/secret", async (orig) => ({
  ...(await orig<typeof import("@/lib/commerce-api/secret")>()),
  dekrypter: (c: string) => (c === "chiffer" ? NOEGLE : null),
}));
vi.mock("@/lib/commerce-api/service", () => ({
  authAfhaengigheder: () => ({
    hentIntegration: async (id: string) => (id === INTEGRATION.id ? INTEGRATION : null),
    godkend: async (_i: string, r: string) => {
      if (brugte.has(r)) return { ok: false, fejl: "replay_detected" };
      brugte.add(r);
      return { ok: true };
    },
    harAdgang: async () => adgang,
  }),
  noterIntegrationsfejl: (...a: unknown[]) => noterFejl(...(a as [])),
  synkAfhaengigheder: () => ({
    bekraeftetMedlem: async () => null,
    medlemmerMedEmail: async () => ["m1"],
    hentProgrammer: async () => ({ point: [{ id: "p", earn_model: "per_amount", earn_value: 10 }], stempel: [] }),
    synk: async (p: { targets: { kind: string; program_id: string; target: number }[] }) => ({
      ok: true,
      stale: false,
      bidrag: p.targets.map((t) => ({ id: "b", ...t, foer: 0, efter: t.target, status: "applied" })),
    }),
    anvendStempel: async () => null,
  }),
}));
vi.mock("@/lib/commerce-api/beloenninger", () => ({
  hentBekraeftetKobling: async (_i: unknown, ref: string | null) => (ref === "lc_" + "a".repeat(32) ? { member_id: "m", customer_ref: ref } : null),
  kundensLoyalitet: async () => ({ loyalsum_customer_ref: "lc_" + "a".repeat(32), points: 620, spendable_points: 120, reserved_points: 500, stamp_cards: [] }),
}));

let n = 0;
function signeret(metode: string, sti: string, krop = "", over: Record<string, string> = {}) {
  const ts = String(Math.floor(Date.now() / 1000));
  const rid = `0f8fad5b-d9cb-469f-a165-${String(++n).padStart(12, "0")}`;
  const sig = signer(NOEGLE, kanoniskStreng({ timestamp: ts, requestId: rid, metode, sti, kropHash: sha256Hex(krop) }));
  return new NextRequest(`http://localhost:3000${sti}`, {
    method: metode,
    body: metode === "GET" ? undefined : krop,
    headers: {
      "content-type": "application/json",
      "x-loyalsum-integration": INTEGRATION.id,
      "x-loyalsum-timestamp": ts,
      "x-loyalsum-request-id": rid,
      "x-loyalsum-signature": sig,
      ...over,
    },
  });
}

import { readFileSync } from "node:fs";
import { join } from "node:path";
const ordre = readFileSync(join(process.cwd(), "src/lib/commerce-api/contract/v1/examples/woocommerce-paid-order.json"), "utf8");

beforeEach(() => {
  adgang = true;
  noterFejl.mockClear();
});

describe("GET /integrations/health", () => {
  it("svarer med status, versioner og abonnement — og aldrig nøglen", async () => {
    const { GET } = await import("./integrations/health/route");
    const svar = await GET(signeret("GET", "/api/v1/commerce/integrations/health"));
    expect(svar.status).toBe(200);
    const k = await svar.json();
    expect(k).toMatchObject({ status: "active", integration_id: INTEGRATION.id, contract_versions: ["commerce-order/v1"], entitlement: "active" });
    expect(JSON.stringify(k)).not.toContain("chiffer");
    expect(svar.headers.get("cache-control")).toBe("no-store");
  });
  it("siger det, når abonnementet mangler, i stedet for at fejle", async () => {
    adgang = false;
    const { GET } = await import("./integrations/health/route");
    const k = await (await GET(signeret("GET", "/api/v1/commerce/integrations/health"))).json();
    expect(k.entitlement).toBe("missing");
  });
});

describe("POST /orders/sync", () => {
  it("en signeret, gyldig ordre giver et CommerceSyncResult", async () => {
    const { POST } = await import("./orders/sync/route");
    const krop = JSON.stringify({ order: JSON.parse(ordre), observed_at: new Date().toISOString() });
    const svar = await POST(signeret("POST", "/api/v1/commerce/orders/sync", krop));
    expect(svar.status).toBe(200);
    expect(await svar.json()).toMatchObject({ status: "applied", contribution: { expected: { points: 31, stamps: 0 } } });
  });
  it("mellemrum i kroppen ændrer hashen — kroppen signeres rå", async () => {
    const { POST } = await import("./orders/sync/route");
    const krop = JSON.stringify({ order: JSON.parse(ordre), observed_at: new Date().toISOString() });
    const req = signeret("POST", "/api/v1/commerce/orders/sync", krop);
    const aendret = new NextRequest(req.url, { method: "POST", body: krop + " ", headers: req.headers });
    const svar = await POST(aendret);
    expect(svar.status).toBe(401);
    expect((await svar.json()).error).toBe("invalid_signature");
  });
  it("uden abonnement: 403 entitlement_required", async () => {
    adgang = false;
    const { POST } = await import("./orders/sync/route");
    const svar = await POST(signeret("POST", "/api/v1/commerce/orders/sync", "{}"));
    expect(svar.status).toBe(403);
    expect(await svar.json()).toMatchObject({ error: "entitlement_required", retryable: false });
  });
  it("en ordre, der ikke følger kontrakten: 422, og fejlen noteres til dashboardet", async () => {
    const { POST } = await import("./orders/sync/route");
    const svar = await POST(signeret("POST", "/api/v1/commerce/orders/sync", JSON.stringify({ order: { schema: "x" }, observed_at: "2026-09-29T09:00:00Z" })));
    expect(svar.status).toBe(422);
    const k = await svar.json();
    expect(k.error).toBe("invalid_contract");
    expect(Array.isArray(k.details)).toBe(true);
    expect(noterFejl).toHaveBeenCalledWith(INTEGRATION.id, "invalid_contract");
  });
  it("ikke-JSON: 400", async () => {
    const { POST } = await import("./orders/sync/route");
    const svar = await POST(signeret("POST", "/api/v1/commerce/orders/sync", "ikke json"));
    expect(svar.status).toBe(400);
  });
});

describe("GET /customer/loyalty", () => {
  it("query-strengen er en del af signaturen", async () => {
    const { GET } = await import("./customer/loyalty/route");
    const sti = `/api/v1/commerce/customer/loyalty?loyalsum_customer_ref=lc_${"a".repeat(32)}`;
    const ok = await GET(signeret("GET", sti));
    expect(ok.status).toBe(200);
    expect(await ok.json()).toMatchObject({ points: 620, spendable_points: 120 });

    const req = signeret("GET", sti);
    const anden = new NextRequest(`http://localhost:3000/api/v1/commerce/customer/loyalty?loyalsum_customer_ref=lc_${"b".repeat(32)}`, { headers: req.headers });
    expect((await GET(anden)).status).toBe(401);
  });
  it("en ukendt eller ubekræftet reference: 404 customer_not_linked", async () => {
    const { GET } = await import("./customer/loyalty/route");
    const svar = await GET(signeret("GET", "/api/v1/commerce/customer/loyalty?loyalsum_customer_ref=lc_" + "0".repeat(32)));
    expect(svar.status).toBe(404);
    expect((await svar.json()).error).toBe("customer_not_linked");
  });
});

describe("kontraktens endpoints findes alle — ingen stille drift", () => {
  const oa = JSON.parse(readFileSync(join(process.cwd(), "src/lib/commerce-api/contract/v1/openapi.json"), "utf8")) as {
    servers: { url: string }[];
    paths: Record<string, Record<string, unknown>>;
  };
  it("serveradressen er /api/v1/commerce", () => {
    expect(oa.servers.map((s) => new URL(s.url).pathname)).toContain("/api/v1/commerce");
  });
  for (const [sti, metoder] of Object.entries(oa.paths)) {
    for (const metode of Object.keys(metoder)) {
      it(`${metode.toUpperCase()} ${sti}`, () => {
        const fil = join(process.cwd(), "src/app/api/v1/commerce", sti, "route.ts");
        const kilde = readFileSync(fil, "utf8");
        expect(kilde).toContain(`export async function ${metode.toUpperCase()}(`);
      });
    }
  }
  it("præcis ni operationer", () => {
    expect(Object.values(oa.paths).reduce((s, m) => s + Object.keys(m).length, 0)).toBe(9);
  });
});
