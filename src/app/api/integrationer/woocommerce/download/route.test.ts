import { describe, it, expect, vi, beforeEach } from "vitest";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * DOWNLOAD AF WOOCOMMERCE-PLUGINET — KUN KOMPLET OG KOMPLET ONLINE.
 *
 * Kun databasen og lageret er attrapper. Selve adgangen kører HELE den
 * rigtige kæde: `kanHenteWooCommercePlugin()` → `commerceIPlan()` →
 * `stempelkortIPlan()` → `abonnementTilstand()` + `hasLoyaltyAccess()`, så
 * prøverne fejler, hvis nogen en dag giver download sin egen, løsere regel.
 */

// Samme tekst som i release-mocken nedenfor (den hejses og kan ikke låne den).
const ZIP = new TextEncoder().encode("PK\u0003\u0004 attrap-zip til prøverne");

const tilstand = vi.hoisted(() => ({
  access: null as null | { companyId: string; role: "owner" | "employee" },
  firmaer: {} as Record<string, Record<string, unknown>>,
  firmaOpslag: [] as string[],
  download: [] as { spand: string; sti: string }[],
  lager: null as null | { data: Blob | null; error: unknown },
}));

vi.mock("@/lib/loyalty/access", () => ({
  getCompanyAccess: async () =>
    tilstand.access ? { ...tilstand.access, actorUserId: "bruger-1", employeeId: null } : null,
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (tabel: string) => {
      if (tabel !== "companies") throw new Error(`uventet tabel ${tabel}`);
      return {
        select: () => ({
          eq: (kolonne: string, id: string) => {
            if (kolonne !== "id") throw new Error(`uventet kolonne ${kolonne}`);
            tilstand.firmaOpslag.push(id);
            return { maybeSingle: async () => ({ data: tilstand.firmaer[id] ?? null, error: null }) };
          },
        }),
      };
    },
    storage: {
      from: (spand: string) => ({
        download: async (sti: string) => {
          tilstand.download.push({ spand, sti });
          return tilstand.lager ?? { data: new Blob([ZIP]), error: null };
        },
      }),
    },
  }),
}));

// Den rigtige release-metadata — kun hashen peger på attrap-filen.
vi.mock("@/lib/woocommerce-plugin/release", async (orig) => {
  // vi.mock hejses over konstanterne ovenfor; hashen regnes derfor ud her.
  const { createHash: hash } = await import("node:crypto");
  const sha = hash("sha256").update(new TextEncoder().encode("PK\u0003\u0004 attrap-zip til prøverne")).digest("hex");
  const ægte = await orig<typeof import("@/lib/woocommerce-plugin/release")>();
  return { ...ægte, WOOCOMMERCE_PLUGIN: { ...ægte.WOOCOMMERCE_PLUGIN, sha256: sha } };
});

import { GET } from "./route";
import { PRODUCTS, hasLoyaltyAccess } from "@/lib/constants";

// Den UMOCKEDE metadata — til prøverne af den officielle udgave og spanden.
const ÆgteRelease = await vi.importActual<typeof import("@/lib/woocommerce-plugin/release")>(
  "@/lib/woocommerce-plugin/release",
);

const A = "aaaaaaaa-0000-4000-8000-00000000000a";
const B = "bbbbbbbb-0000-4000-8000-00000000000b";

function firma(product_slug: string | null, ekstra: Record<string, unknown> = {}) {
  return {
    product_slug,
    stripe_subscription_id: "sub_test",
    stripe_status: "active",
    suspenderet_siden: null,
    ophoert_den: null,
    sletning_udfoeres_den: null,
    ...ekstra,
  };
}

async function hent(url = "https://loyalsum.dk/api/integrationer/woocommerce/download") {
  // Ruten tager ingen parametre — et forsøg på at sende et andet firma skal intet betyde.
  const res = await (GET as unknown as (r: Request) => Promise<Response>)(new Request(url));
  return { res, body: res.headers.get("Content-Type")?.includes("json") ? await res.json() : null };
}

beforeEach(() => {
  tilstand.access = { companyId: A, role: "owner" };
  tilstand.firmaer = {};
  tilstand.firmaOpslag = [];
  tilstand.download = [];
  tilstand.lager = null;
});

describe("adgang: kun LoyalSum Komplet og LoyalSum Komplet Online", () => {
  it("A. Komplet, aktiv ejer: får præcis den udgivne fil", async () => {
    tilstand.firmaer[A] = firma("loyalsum-komplet");
    const { res } = await hent();
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/zip");
    expect(res.headers.get("Content-Disposition")).toBe('attachment; filename="loyalsum-for-woocommerce-1.0.0.zip"');
    expect(res.headers.get("Cache-Control")).toBe("private, no-store");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(ZIP);
    expect(tilstand.download).toEqual([
      { spand: "loyalsum-releases", sti: "woocommerce/1.0.0/loyalsum-for-woocommerce-1.0.0.zip" },
    ]);
  });

  it("B. Komplet Online, aktiv ejer: får filen", async () => {
    tilstand.firmaer[A] = firma("loyalsum-komplet-online");
    const { res } = await hent();
    expect(res.status).toBe(200);
  });

  it.each([
    ["C. Reviewstander", "reviewstander"],
    ["D. Reviewstander Pro", "reviewstander-pro"],
    ["E. stempelkort alene (findes ikke som pakke)", "stempelkort"],
    ["E. pointprogram alene (findes ikke som pakke)", "pointprogram"],
    ["tilkøbet ekstra stander", "ekstra-stander"],
    ["F. intet produkt", null],
  ])("%s: 403 woocommerce_plugin_not_in_plan og ingen fil", async (_navn, slug) => {
    tilstand.firmaer[A] = firma(slug as string | null);
    const { res, body } = await hent();
    expect(res.status).toBe(403);
    expect(body.error).toBe("woocommerce_plugin_not_in_plan");
    expect(tilstand.download).toEqual([]);
  });

  it("F. virksomheden findes ikke: 403 og ingen fil", async () => {
    const { res, body } = await hent();
    expect(res.status).toBe(403);
    expect(body.error).toBe("woocommerce_plugin_not_in_plan");
    expect(tilstand.download).toEqual([]);
  });

  it("G. suspenderet Komplet uden betaling: afvist efter de eksisterende regler", async () => {
    tilstand.firmaer[A] = firma("loyalsum-komplet", { suspenderet_siden: "2026-09-01T00:00:00Z", stripe_status: "past_due" });
    const { res, body } = await hent();
    expect(res.status).toBe(403);
    expect(body.error).toBe("woocommerce_plugin_not_in_plan");
    expect(tilstand.download).toEqual([]);
  });

  it("G. ophørt Komplet: afvist", async () => {
    tilstand.firmaer[A] = firma("loyalsum-komplet", { ophoert_den: "2026-09-30T00:00:00Z" });
    const { res } = await hent();
    expect(res.status).toBe(403);
    expect(tilstand.download).toEqual([]);
  });

  it("H. ikke logget ind: 401 uden opslag i databasen eller lageret", async () => {
    tilstand.access = null;
    const { res, body } = await hent();
    expect(res.status).toBe(401);
    expect(body.error).toBe("unauthenticated");
    expect(tilstand.firmaOpslag).toEqual([]);
    expect(tilstand.download).toEqual([]);
  });

  it("en medarbejder i en Komplet-virksomhed: 403 owner_only (samme regel som parringen)", async () => {
    tilstand.access = { companyId: A, role: "employee" };
    tilstand.firmaer[A] = firma("loyalsum-komplet");
    const { res, body } = await hent();
    expect(res.status).toBe(403);
    expect(body.error).toBe("owner_only");
    expect(tilstand.download).toEqual([]);
  });

  it("J. ejer af A kan ikke hente gennem B's id — kun sessionens virksomhed slås op", async () => {
    tilstand.firmaer[A] = firma("reviewstander");
    tilstand.firmaer[B] = firma("loyalsum-komplet");
    const { res } = await hent(`https://loyalsum.dk/api/integrationer/woocommerce/download?company_id=${B}&company=${B}`);
    expect(res.status).toBe(403);
    expect(tilstand.firmaOpslag).toEqual([A]);
    expect(tilstand.download).toEqual([]);
  });
});

describe("filen", () => {
  it("en anden fil end den udgivne udleveres aldrig (sha256)", async () => {
    tilstand.firmaer[A] = firma("loyalsum-komplet");
    tilstand.lager = { data: new Blob([new TextEncoder().encode("en anden fil")]), error: null };
    const { res, body } = await hent();
    expect(res.status).toBe(503);
    expect(body.error).toBe("plugin_unavailable");
  });

  it("mangler filen i lageret: 503, ingen detaljer om lageret", async () => {
    tilstand.firmaer[A] = firma("loyalsum-komplet");
    tilstand.lager = { data: null, error: { message: "Object not found", statusCode: "404" } };
    const { res, body } = await hent();
    expect(res.status).toBe(503);
    expect(body.error).toBe("plugin_unavailable");
    expect(JSON.stringify(body)).not.toContain("Object not found");
  });

  it("svaret indeholder ingen adresse til filen — hverken Location eller en URL", async () => {
    tilstand.firmaer[A] = firma("loyalsum-komplet");
    const { res } = await hent();
    expect(res.headers.get("Location")).toBeNull();
    expect(res.headers.get("Content-Type")).toBe("application/zip");
  });
});

describe("I. ingen offentlig vej uden om ruten", () => {
  it("udgivelsen ligger i den private spand, ikke i den offentlige logo-spand", () => {
    expect(ÆgteRelease.WOOCOMMERCE_PLUGIN_SPAND).toBe("loyalsum-releases");
    expect(ÆgteRelease.WOOCOMMERCE_PLUGIN_SPAND).not.toBe("logos");
  });

  it("ingen ZIP under /public", () => {
    const zipper: string[] = [];
    const gaa = (mappe: string) => {
      for (const n of readdirSync(mappe)) {
        const sti = join(mappe, n);
        if (statSync(sti).isDirectory()) gaa(sti);
        else if (/\.zip$/i.test(n)) zipper.push(sti);
      }
    };
    if (existsSync(join(process.cwd(), "public"))) gaa(join(process.cwd(), "public"));
    expect(zipper).toEqual([]);
  });

  it("migration 0050 gør spanden privat og giver ingen læse-policy", () => {
    const sql = readFileSync(join(process.cwd(), "supabase/migrations/0050_loyalsum_releases.sql"), "utf8");
    const kode = sql.replace(/--.*$/gm, "");
    expect(kode).toMatch(/'loyalsum-releases',\s*'loyalsum-releases',\s*false/);
    expect(kode).toMatch(/set public\s*=\s*false/);
    expect(kode).not.toMatch(/create policy/i);
    expect(kode).not.toMatch(/grant /i);
  });

  it("enhver policy på storage.objects i alle migrationer er bundet til logo-spanden", () => {
    const mappe = join(process.cwd(), "supabase/migrations");
    for (const fil of readdirSync(mappe).filter((f) => f.endsWith(".sql"))) {
      const kode = readFileSync(join(mappe, fil), "utf8").replace(/--.*$/gm, "");
      for (const m of kode.matchAll(/create policy[^;]*?on storage\.objects[^;]*;/gi)) {
        expect(m[0], `${fil}: ${m[0].slice(0, 80)}`).toMatch(/bucket_id\s*=\s*'logos'/);
      }
    }
  });
});

describe("pakkerne og metadataen", () => {
  it("præcis Komplet og Komplet Online giver adgang blandt alle produkter", () => {
    const med = PRODUCTS.filter((p) => hasLoyaltyAccess(p.slug)).map((p) => p.slug).sort();
    expect(med).toEqual(["loyalsum-komplet", "loyalsum-komplet-online"]);
  });

  it("den officielle 1.0.0 (GitHub-releasen woocommerce-v1.0.0)", () => {
    expect(ÆgteRelease.WOOCOMMERCE_PLUGIN.version).toBe("1.0.0");
    expect(ÆgteRelease.WOOCOMMERCE_PLUGIN.filnavn).toBe("loyalsum-for-woocommerce-1.0.0.zip");
    expect(ÆgteRelease.WOOCOMMERCE_PLUGIN.sha256).toBe("1519ff90686aa6be04caa89cb01417a841792ebeb979e70ea3e383dfab0c1851");
    expect(ÆgteRelease.woocommercePluginSti()).toBe("woocommerce/1.0.0/loyalsum-for-woocommerce-1.0.0.zip");
    expect(ÆgteRelease.WOOCOMMERCE_PLUGIN.filnavn).toContain(ÆgteRelease.WOOCOMMERCE_PLUGIN.version);
  });

  it("dashboardet regner adgangen ud på serveren og linker kun til ruten", () => {
    const side = readFileSync(join(process.cwd(), "src/app/dashboard/integrationer/page.tsx"), "utf8");
    expect(side).toContain("kanHenteWooCommercePlugin(companyId)");
    const visning = readFileSync(join(process.cwd(), "src/app/dashboard/integrationer/visning.tsx"), "utf8");
    expect(visning).toContain("plugin.downloadUrl");
    expect(visning).not.toMatch(/supabase\.co|storage\/v1|loyalsum-releases|github\.com/);
  });
});
