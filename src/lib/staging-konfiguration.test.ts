import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * PRODUKTION OG STAGING ER SAMME KODE MED FORSKELLIGE VÆRDIER.
 *
 * Webshopintegrationen skal testes mod en SEPARAT Supabase (docs/
 * commerce-staging.md). Det kræver, at intet i koden peger på et bestemt
 * projekt: forbindelsen skal komme fra `NEXT_PUBLIC_SUPABASE_URL`,
 * `NEXT_PUBLIC_SUPABASE_ANON_KEY` og `SUPABASE_SERVICE_ROLE_KEY`, og en
 * staging-deployment skal kunne sætte andre værdier uden en kodeændring.
 * Ingen rigtig forbindelse åbnes her.
 */

const kald: unknown[][] = [];
vi.mock("@supabase/supabase-js", () => ({
  createClient: (...a: unknown[]) => {
    kald.push(a);
    return {};
  },
}));

const PROD = { url: "https://produktion.example.supabase.co", noegle: "prod-service-role" };
const STAGING = { url: "https://staging.example.supabase.co", noegle: "staging-service-role" };

beforeEach(() => {
  kald.length = 0;
});
afterEach(() => {
  vi.unstubAllEnvs();
});

describe("Supabase-forbindelsen kommer fra miljøet", () => {
  for (const [navn, fil] of [
    ["commerceDb", "@/lib/commerce-api/db"],
    ["createAdminClient", "@/lib/supabase/admin"],
  ] as const) {
    it(`${navn} bruger de værdier, deploymentet har — produktion og staging uden kodeændring`, async () => {
      const m = (await import(fil)) as Record<string, () => unknown>;
      for (const miljoe of [PROD, STAGING]) {
        vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", miljoe.url);
        vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", miljoe.noegle);
        m[navn]();
        expect(kald.at(-1)?.slice(0, 2)).toEqual([miljoe.url, miljoe.noegle]);
      }
    });
  }
});

describe("intet projekt er skrevet ind i koden", () => {
  function filer(dir: string): string[] {
    return readdirSync(dir).flatMap((f) => {
      const p = join(dir, f);
      if (statSync(p).isDirectory()) return f === "node_modules" || f === "contract" ? [] : filer(p);
      return /\.(ts|tsx|mjs|js|json)$/.test(f) && !/\.test\./.test(f) ? [p] : [];
    });
  }

  it("ingen *.supabase.co-adresse i src, scripts eller konfigurationen", () => {
    const steder = [
      ...filer(join(process.cwd(), "src")),
      ...filer(join(process.cwd(), "scripts")),
      join(process.cwd(), "next.config.ts"),
      join(process.cwd(), "vercel.json"),
    ];
    const fund = steder.filter((f) => /[a-z0-9]{20}\.supabase\.co/.test(readFileSync(f, "utf8")));
    expect(fund).toEqual([]);
  });

  it("webshopkoden læser ingen Supabase-variabel uden for db-klienten", () => {
    const commerce = filer(join(process.cwd(), "src/lib/commerce-api")).filter((f) => !f.endsWith("db.ts"));
    for (const f of commerce) {
      const k = readFileSync(f, "utf8").replace(/\/\*[\s\S]*?\*\//g, "").replace(/\/\/.*$/gm, "");
      expect(k, f).not.toMatch(/process\.env\.(NEXT_PUBLIC_)?SUPABASE/);
    }
  });

  it("staging-vejledningen findes og nævner de tre Supabase-variabler og krypteringsnøglen", () => {
    const doc = readFileSync(join(process.cwd(), "docs/commerce-staging.md"), "utf8");
    for (const v of [
      "NEXT_PUBLIC_SUPABASE_URL",
      "NEXT_PUBLIC_SUPABASE_ANON_KEY",
      "SUPABASE_SERVICE_ROLE_KEY",
      "LOYALSUM_COMMERCE_ENCRYPTION_KEY",
    ]) {
      expect(doc).toContain(v);
    }
    expect(doc).toMatch(/0001 → 0049/);
    // Ingen hemmeligheder i vejledningen.
    expect(doc).not.toMatch(/eyJ[A-Za-z0-9_-]{20,}/);
    expect(doc).not.toMatch(/sk_(live|test)_[A-Za-z0-9]{10,}/);
  });
});
