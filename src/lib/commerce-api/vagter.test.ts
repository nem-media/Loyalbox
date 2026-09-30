import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * DE REGLER, DER IKKE MÅ GLIDE — læst i kilden UDEN kommentarer.
 *
 * Kommentarerne i modulet citerer med vilje det, de forbyder ("aldrig
 * markedsføring"), så en prøve på den rå tekst ville fejle på forklaringen
 * og bestå, når koden var ændret. Derfor fjernes kommentarerne først.
 */

const udenKommentarer = (s: string) =>
  s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");

function filer(dir: string): string[] {
  return readdirSync(dir).flatMap((f) => {
    const p = join(dir, f);
    if (statSync(p).isDirectory()) return f === "contract" ? [] : filer(p);
    return /\.(ts|tsx)$/.test(f) && !f.endsWith(".test.ts") ? [p] : [];
  });
}

const COMMERCE = [
  ...filer(join(process.cwd(), "src/lib/commerce-api")),
  ...filer(join(process.cwd(), "src/app/api/v1")),
  ...filer(join(process.cwd(), "src/app/webshop")),
  ...filer(join(process.cwd(), "src/app/dashboard/integrationer")),
];

describe("commerce-koden", () => {
  it("findes (prøven læser rigtige filer)", () => {
    expect(COMMERCE.length).toBeGreaterThan(15);
  });

  it("skriver aldrig et markedsføringssamtykke", () => {
    for (const f of COMMERCE) {
      const k = udenKommentarer(readFileSync(f, "utf8"));
      expect(k, f).not.toMatch(/type:\s*["']marketing["']/);
      expect(k, f).not.toMatch(/consent_marketing/);
    }
  });

  it("kender ikke WooCommerce- eller Shopify-objekter, hooks eller webhooks", () => {
    for (const f of COMMERCE) {
      const k = udenKommentarer(readFileSync(f, "utf8"));
      expect(k, f).not.toMatch(/WC_Order|wc_get_order|X-Shopify|shopify-api|@shopify\//);
    }
  });

  it("bruger ikke det gamle produktnavn", () => {
    for (const f of COMMERCE) expect(readFileSync(f, "utf8").toLowerCase(), f).not.toContain("loyalbox");
  });

  it("dashboardet vælger aldrig nøglekolonnen", () => {
    for (const f of COMMERCE.filter((x) => x.includes("integrationer"))) {
      expect(udenKommentarer(readFileSync(f, "utf8")), f).not.toContain("secret_ciphertext");
    }
  });

  it("loglinjen har ingen plads til e-mail, nøgle eller krop", () => {
    const log = udenKommentarer(readFileSync(join(process.cwd(), "src/lib/commerce-api/log.ts"), "utf8"));
    expect(log).not.toMatch(/email|secret|signature|body|krop/i);
  });
});

describe("ingen platform-SDK i LoyalSum core", () => {
  it("package.json", () => {
    const pkg = JSON.parse(readFileSync(join(process.cwd(), "package.json"), "utf8"));
    const alle = Object.keys({ ...pkg.dependencies, ...pkg.devDependencies });
    expect(alle.filter((d) => /woocommerce|shopify/i.test(d))).toEqual([]);
  });
});
