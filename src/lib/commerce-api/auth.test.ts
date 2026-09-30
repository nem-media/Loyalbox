import { describe, it, expect, vi } from "vitest";
import { godkendAnmodning, type AuthAfhaengigheder } from "./auth";
import { kanoniskStreng, sha256Hex, signer, signaturPasser } from "./hmac";
import type { IntegrationRow } from "./rows";
import { CommerceNoegleFejl } from "./secret";

/**
 * SIKKERHEDEN PÅ HVERT SIGNERET KALD.
 *
 * Testvektoren er kontraktens (docs/security.md) — byte for byte. Resten
 * prøver hvert led i `godkendAnmodning()` for sig: et forkert svar her er et
 * hul, som en webshop, en fremmed eller en lækket nøgle kan gå igennem.
 */

describe("kontraktens testvektor", () => {
  const krop = '{"order":{"external_order_id":"1042"}}';
  it("sha256 af kroppen", () => {
    expect(sha256Hex(krop)).toBe("086da905289855b21d4b1459fcab5c2986baf330688e8116bba31b93171f4c66");
  });
  it("signaturen", () => {
    const k = kanoniskStreng({
      timestamp: "1790000000",
      requestId: "0f8fad5b-d9cb-469f-a165-70867728950e",
      metode: "POST",
      sti: "/api/v1/commerce/orders/sync",
      kropHash: sha256Hex(krop),
    });
    expect(k).toBe(
      "v1\n1790000000\n0f8fad5b-d9cb-469f-a165-70867728950e\nPOST\n/api/v1/commerce/orders/sync\n086da905289855b21d4b1459fcab5c2986baf330688e8116bba31b93171f4c66",
    );
    expect(signer("test-secret-do-not-use", k)).toBe(
      "v1=064b34aa19636aa3b39e943f715a7a64d7e5189ab7c935f54b69b2d3131d48e3",
    );
  });
  it("en tom krop hashes også", () => {
    expect(sha256Hex("")).toBe("e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855");
  });
  it("sammenligningen afviser forkert form og forkert værdi", () => {
    const god = "v1=" + "a".repeat(64);
    expect(signaturPasser(god, god)).toBe(true);
    expect(signaturPasser(god, "v1=" + "b".repeat(64))).toBe(false);
    expect(signaturPasser(god, "v1=" + "A".repeat(64))).toBe(false);
    expect(signaturPasser(god, "a".repeat(64))).toBe(false);
    expect(signaturPasser(god, "")).toBe(false);
  });
});

// ---------------------------------------------------------------------------

const NOEGLE = "test-secret-do-not-use";
const NU = 1_790_000_000;
const A: IntegrationRow = {
  id: "11111111-1111-4111-8111-111111111111",
  company_id: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  provider: "woocommerce",
  external_store_id: "butik-a",
  store_url: "https://a.example",
  store_name: null,
  currency: "DKK",
  adapter_version: "0.1.0",
  platform_version: null,
  status: "active",
  secret_ciphertext: "chiffer-a",
  connected_at: "2026-09-29T00:00:00Z",
  disconnected_at: null,
  last_successful_sync_at: null,
  last_error_at: null,
  last_error_code: null,
};
const B: IntegrationRow = {
  ...A,
  id: "22222222-2222-4222-8222-222222222222",
  company_id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
  external_store_id: "butik-b",
  secret_ciphertext: "chiffer-b",
};

function deps(over: Partial<AuthAfhaengigheder> = {}): AuthAfhaengigheder {
  const brugte = new Set<string>();
  return {
    hentIntegration: async (id) => [A, B].find((x) => x.id === id) ?? null,
    godkend: async (iid, rid) => {
      const k = `${iid}:${rid}`;
      if (brugte.has(k)) return { ok: false, fejl: "replay_detected" };
      brugte.add(k);
      return { ok: true };
    },
    harAdgang: async () => true,
    dekrypter: (c) => (c === "chiffer-a" ? NOEGLE : c === "chiffer-b" ? "noegle-b" : null),
    nuSekunder: () => NU,
    ...over,
  };
}

const STI = "/api/v1/commerce/orders/sync";
const KROP = '{"order":{"external_order_id":"1042"}}';
let tæller = 0;

function anmodning(o: {
  integration?: string;
  noegle?: string;
  ts?: number;
  rid?: string;
  krop?: string;
  signeretKrop?: string;
  metode?: string;
  sti?: string;
  signeretSti?: string;
}) {
  const ts = String(o.ts ?? NU);
  const rid = o.rid ?? `0f8fad5b-d9cb-469f-a165-${String(++tæller).padStart(12, "0")}`;
  const sig = signer(
    o.noegle ?? NOEGLE,
    kanoniskStreng({
      timestamp: ts,
      requestId: rid,
      metode: o.metode ?? "POST",
      sti: o.signeretSti ?? o.sti ?? STI,
      kropHash: sha256Hex(o.signeretKrop ?? o.krop ?? KROP),
    }),
  );
  return {
    metode: o.metode ?? "POST",
    sti: o.sti ?? STI,
    raaKrop: new TextEncoder().encode(o.krop ?? KROP),
    headers: new Headers({
      "x-loyalsum-integration": o.integration ?? A.id,
      "x-loyalsum-timestamp": ts,
      "x-loyalsum-request-id": rid,
      "x-loyalsum-signature": sig,
      "x-loyalsum-api-version": "v1",
    }),
  };
}

async function kode(p: ReturnType<typeof anmodning>, d = deps(), opts = {}) {
  const r = await godkendAnmodning(p, d, opts);
  return r.ok ? "ok" : r.kode;
}

describe("godkendAnmodning", () => {
  it("gyldig HMAC", async () => {
    expect(await kode(anmodning({}))).toBe("ok");
  });
  it("forkert nøgle", async () => {
    expect(await kode(anmodning({ noegle: "gaet" }))).toBe("invalid_signature");
  });
  it("kroppen ændret efter signering", async () => {
    expect(
      await kode(anmodning({ signeretKrop: KROP, krop: '{"order":{"external_order_id":"9999"}}' })),
    ).toBe("invalid_signature");
  });
  it("stien ændret efter signering (et andet endpoint)", async () => {
    expect(await kode(anmodning({ signeretSti: STI, sti: "/api/v1/commerce/rewards/commit" }))).toBe("invalid_signature");
  });
  it("udløbet tidsstempel", async () => {
    expect(await kode(anmodning({ ts: NU - 301 }))).toBe("request_expired");
    expect(await kode(anmodning({ ts: NU - 300 }))).toBe("ok");
  });
  it("tidsstempel for langt ude i fremtiden", async () => {
    expect(await kode(anmodning({ ts: NU + 301 }))).toBe("request_expired");
  });
  it("genbrugt request-id", async () => {
    const d = deps();
    const rid = "0f8fad5b-d9cb-469f-a165-70867728950e";
    expect(await kode(anmodning({ rid }), d)).toBe("ok");
    expect(await kode(anmodning({ rid }), d)).toBe("replay_detected");
  });
  it("ukendt integration", async () => {
    expect(await kode(anmodning({ integration: "33333333-3333-4333-8333-333333333333" }))).toBe("unknown_integration");
    expect(await kode(anmodning({ integration: "ikke-et-uuid" }))).toBe("unknown_integration");
  });
  it("inaktiv (afbrudt) integration", async () => {
    const d = deps({
      hentIntegration: async () => ({ ...A, status: "revoked", secret_ciphertext: null }),
    });
    expect(await kode(anmodning({}), d)).toBe("integration_inactive");
  });
  it("tværs af virksomheder: B's id med A's nøgle afvises", async () => {
    expect(await kode(anmodning({ integration: B.id, noegle: NOEGLE }))).toBe("invalid_signature");
  });
  it("manglende abonnement", async () => {
    const d = deps({ harAdgang: async () => false });
    expect(await kode(anmodning({}), d)).toBe("entitlement_required");
    // health spørger uden at kræve det, så pluginet kan sige det til ejeren
    expect(await kode(anmodning({ metode: "GET", krop: "" }), deps({ harAdgang: async () => false }), { kraevAdgang: false })).toBe("ok");
  });
  it("hastighedsgrænse", async () => {
    const d = deps({ godkend: async () => ({ ok: false, fejl: "rate_limited", retryAfter: 17 }) });
    const r = await godkendAnmodning(anmodning({}), d);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kode).toBe("rate_limited");
      expect(r.svar.status).toBe(429);
      expect(r.svar.headers.get("retry-after")).toBe("17");
      const k = await r.svar.json();
      expect(k).toMatchObject({ error: "rate_limited", retryable: true, classification: "transient" });
    }
  });
  it("signaturen tjekkes FØR gentagelsestabellen røres", async () => {
    const godkend = vi.fn(async () => ({ ok: true }) as const);
    await kode(anmodning({ noegle: "forkert" }), deps({ godkend }));
    expect(godkend).not.toHaveBeenCalled();
  });
  it("en fremmed API-version afvises tydeligt", async () => {
    const p = anmodning({});
    p.headers.set("x-loyalsum-api-version", "v2");
    expect(await kode(p)).toBe("contract_version_unsupported");
  });
  it("fejlsvaret følger kontraktens form og lækker intet", async () => {
    const r = await godkendAnmodning(anmodning({ noegle: "forkert" }), deps());
    expect(r.ok).toBe(false);
    if (!r.ok) {
      const k = await r.svar.json();
      expect(Object.keys(k).sort()).toEqual(["classification", "error", "message", "retryable"]);
      expect(k.error).toBe("invalid_signature");
      expect(JSON.stringify(k)).not.toContain(NOEGLE);
    }
  });
});

describe("krypteringsnøglen på serveren", () => {
  it("mangler nøglen, svares commerce_unavailable (503, kan prøves igen) — ikke en signaturfejl", async () => {
    const d = deps({
      dekrypter: () => {
        throw new CommerceNoegleFejl("LOYALSUM_COMMERCE_ENCRYPTION_KEY mangler");
      },
    });
    const r = await godkendAnmodning(anmodning({}), d);
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.kode).toBe("commerce_unavailable");
      expect(r.svar.status).toBe(503);
      const k = await r.svar.json();
      expect(k).toMatchObject({ retryable: true, classification: "transient" });
      expect(JSON.stringify(k)).not.toContain("LOYALSUM_COMMERCE_ENCRYPTION_KEY");
    }
  });

  it("en nøgle låst med en tidligere krypteringsnøgle krypteres om — kun efter et godkendt kald", async () => {
    const genkrypter = vi.fn(async () => {});
    expect(await kode(anmodning({}), deps({ genkrypter }))).toBe("ok");
    expect(genkrypter).toHaveBeenCalledWith(A, NOEGLE);
    genkrypter.mockClear();
    await kode(anmodning({ noegle: "forkert" }), deps({ genkrypter }));
    expect(genkrypter).not.toHaveBeenCalled();
  });
});
