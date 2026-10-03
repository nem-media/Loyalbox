import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { PRODUCTS, KORT_PUNKTER, KOMPLET_FUNKTIONER, getProduct, hasLoyaltyAccess } from "./constants";
import { PLATFORM_VALG } from "./reviewstander-valg";

/**
 * WOOCOMMERCE PÅ LOYALSUM.DK — RIGTIG VÆGT PÅ RIGTIG SIDE.
 *
 *   CENTRALT:  Komplet Online og /woocommerce-loyalitetsprogram
 *   SEKUNDÆRT: Komplet og pointprogrammet
 *   DISKRET:   forsiden, oversigter, sammenligning
 *   ALDRIG:    Reviewstander og Reviewstander Pro (de har ikke integrationen)
 *
 * Integrationen følger loyaliteten (`kanHenteWooCommercePlugin()` =
 * `commerceIPlan()`), så hvad markedsføringen siger, skal passe med
 * `hasLoyaltyAccess()`.
 */

const kode = (sti: string) => readFileSync(join(process.cwd(), sti), "utf8");
/** Synlig tekst ≈ koden uden kommentarer. */
const udenKommentarer = (t: string) => t.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
const tael = (t: string, ord: RegExp) => (t.match(ord) ?? []).length;

const SEO = "src/app/woocommerce-loyalitetsprogram/page.tsx";

describe("pakkerne: kun Komplet og Komplet Online har WooCommerce", () => {
  it("sammenligningstabellen svarer det samme som adgangen", () => {
    for (const v of PLATFORM_VALG) {
      const med = hasLoyaltyAccess(v.slug);
      expect(v.woocommerce, v.slug).toBe(med ? "Inkluderet" : "Nej");
    }
    expect(PLATFORM_VALG.find((v) => v.slug === "reviewstander")?.woocommerce).toBe("Nej");
    expect(PLATFORM_VALG.find((v) => v.slug === "reviewstander-pro")?.woocommerce).toBe("Nej");
  });

  it("tabellen har en WooCommerce-kolonne med samme vægt som de andre", () => {
    const side = kode("src/app/reviewstander/page.tsx");
    expect(side).toMatch(/<th scope="col" className="etiket px-4 py-3">\s*WooCommerce\s*<\/th>/);
    expect(side).toContain("{v.woocommerce}");
  });

  it("Reviewstander og Reviewstander Pro lover den ingen steder", () => {
    for (const slug of ["reviewstander", "reviewstander-pro"]) {
      const p = getProduct(slug)!;
      const tekst = [p.description, p.tagline, p.metaDescription ?? "", ...p.features, ...(KORT_PUNKTER[slug] ?? [])].join(" ");
      expect(tekst, slug).not.toMatch(/woocommerce/i);
    }
  });

  it("Komplet: med, men sekundær — sidst i listen og ikke i titel eller beskrivelse", () => {
    const k = getProduct("loyalsum-komplet")!;
    const i = k.features.findIndex((f) => /woocommerce/i.test(f));
    expect(i, "Komplet nævner integrationen").toBeGreaterThan(-1);
    expect(i, "men ikke først").toBe(k.features.length - 1);
    expect(`${k.metaTitle} ${k.tagline} ${k.metaDescription}`).not.toMatch(/woocommerce/i);
  });

  it("Komplet Online: central — tidligt i listen, i beskrivelsen og i meta", () => {
    const o = getProduct("loyalsum-komplet-online")!;
    const i = o.features.findIndex((f) => /woocommerce/i.test(f));
    expect(i).toBeGreaterThan(-1);
    expect(i, "blandt de to første").toBeLessThanOrEqual(1);
    expect(o.description).toMatch(/WooCommerce/);
    expect(o.metaDescription).toMatch(/WooCommerce/);
    expect(KORT_PUNKTER["loyalsum-komplet-online"].slice(0, 2).join(" ")).toMatch(/WooCommerce/);
  });

  it("Komplet Online-siden fremhæver WooCommerce stærkere end Komplet", () => {
    const online = udenKommentarer(kode("src/app/loyalsum-komplet-online/page.tsx"));
    expect(online).toMatch(/<h2[^>]*>\s*Bruger du WooCommerce\?/);
    expect(tael(online, /q: "[^"]*WooCommerce[^"]*"/g), "WooCommerce-spørgsmål i FAQ").toBeGreaterThanOrEqual(2);
    expect(online).toContain('href="/woocommerce-loyalitetsprogram"');
    // De gamle, nu forkerte svar er væk.
    expect(online).not.toMatch(/Der er ingen integration med Shopify, WooCommerce/);
    expect(online).not.toMatch(/Et køb i en webshop registreres ikke automatisk/);
  });

  it("funktionslisten bruger det præcise navn", () => {
    expect(KOMPLET_FUNKTIONER.some((f) => f.label === "Integration med WooCommerce")).toBe(true);
  });
});

describe("forsiden: diskret", () => {
  const forside = udenKommentarer(kode("src/app/page.tsx"));

  it("WooCommerce står ikke i H1", () => {
    const h1 = forside.match(/<h1[\s\S]*?<\/h1>/)?.[0] ?? "";
    expect(h1).not.toMatch(/woocommerce/i);
  });

  it("højst én kort omtale med ét link", () => {
    expect(tael(forside, /WooCommerce/g)).toBeLessThanOrEqual(2);
    expect(tael(forside, /href="\/woocommerce-loyalitetsprogram"/g)).toBe(1);
  });
});

describe("SEO-siden /woocommerce-loyalitetsprogram", () => {
  const side = kode(SEO);
  const synlig = udenKommentarer(side);
  const titel = side.match(/const title = "([^"]+)"/)?.[1] ?? "";
  const beskrivelse = side.match(/const description =\s*"([^"]+)"/)?.[1] ?? "";

  it("titel og beskrivelse kan stå i et søgeresultat", () => {
    expect((titel + " — LoyalSum.dk").length, titel).toBeLessThanOrEqual(65);
    expect(titel).toMatch(/WooCommerce/);
    expect(beskrivelse.length, beskrivelse).toBeLessThanOrEqual(160);
    expect(beskrivelse.length).toBeGreaterThan(70);
  });

  it("canonical, H1 og indeksering", () => {
    expect(side).toContain('canonical: "/woocommerce-loyalitetsprogram"');
    expect(synlig).toMatch(/<h1[^>]*>\s*Loyalitetsprogram til WooCommerce/);
    expect(side).not.toMatch(/robots:\s*\{[^}]*index:\s*false/);
    expect(kode("src/app/sitemap.ts")).toContain("/woocommerce-loyalitetsprogram");
  });

  it("primær CTA er Komplet Online, sekundær er Komplet", () => {
    const foersteKnap = synlig.match(/<ButtonLink href="([^"]+)"/)?.[1];
    expect(foersteKnap).toBe("/loyalsum-komplet-online");
    expect(synlig).toContain('href="/produkter/loyalsum-komplet-online"');
    expect(synlig).toContain('href="/produkter/loyalsum-komplet"');
  });

  it("linker videre til pointprogram og stempelkort", () => {
    expect(synlig).toContain('href="/loyalitetsprogram"');
    expect(synlig).toContain('href="/stempelkort"');
  });

  it("FAQ-schemaet er bygget af de synlige spørgsmål", () => {
    expect(side).toContain("mainEntity: FAQ.map((item)");
    expect(side).toContain("{FAQ.map((item) => (");
    expect(side).not.toMatch(/aggregateRating|ratingValue|"@type": "Product"|"@type": "SoftwareApplication"/);
  });

  it("lover kun det, der findes", () => {
    expect(synlig).not.toMatch(/point (optjenes|gives|tildeles) automatisk/i);
    expect(synlig).not.toMatch(/gratis plugin til alle|kan hentes gratis af alle/i);
    expect(synlig).toMatch(/inkluderet i LoyalSum Komplet Online og LoyalSum Komplet/);
    expect(synlig).toMatch(/kun DKK|danske kroner/);
    expect(synlig).toMatch(/inkl\. moms/);
  });
});

describe("ingen offentlig vej til pluginfilen", () => {
  it("ingen offentlig side linker til downloadruten eller en ZIP", () => {
    const rod = join(process.cwd(), "src/app");
    const fund: string[] = [];
    const gaa = (mappe: string) => {
      for (const n of readdirSync(mappe)) {
        const sti = join(mappe, n);
        if (statSync(sti).isDirectory()) {
          if (["dashboard", "api", "admin"].includes(n)) continue;
          gaa(sti);
        } else if (/\.tsx?$/.test(n) && !/\.test\./.test(n)) {
          const t = readFileSync(sti, "utf8");
          if (/\/api\/integrationer\/woocommerce\/download|loyalsum-for-woocommerce-[\d.]+\.zip/.test(t)) fund.push(sti);
        }
      }
    };
    gaa(rod);
    expect(fund).toEqual([]);
  });

  it("hverken katalog eller produkter peger på en fil", () => {
    for (const p of PRODUCTS) {
      expect(JSON.stringify(p)).not.toMatch(/\.zip|\/api\/integrationer/);
    }
  });
});

describe("billederne af WooCommerce-integrationen", () => {
  const FILER = [
    "loyalsum-woocommerce-dashboard.png",
    "loyalsum-woocommerce-beloenning-kurv.png",
    "loyalsum-woocommerce-integration.png",
  ];
  const side = kode(SEO);

  it("ligger i public med navne, der kan stå i en URL", () => {
    for (const fil of FILER) {
      expect(statSync(join(process.cwd(), "public", fil)).size, fil).toBeGreaterThan(10_000);
      expect(fil).toMatch(/^[a-z0-9-]+\.png$/);
    }
  });

  it("SEO-siden bruger alle tre — med alt-tekst, mål og billedtekst", () => {
    for (const fil of FILER) expect(side, fil).toContain(`/${fil}`);
    const billeder = udenKommentarer(side).match(/<Image[\s\S]*?\/>/g) ?? [];
    expect(billeder).toHaveLength(3);
    for (const b of billeder) {
      expect(b).toMatch(/alt=\{WOO_BILLEDER\.\w+\.alt\}/);
      expect(b).toMatch(/width=\{BREDDE\}/);
      expect(b).toMatch(/height=\{HOEJDE\}/);
      expect(b).toMatch(/sizes="/);
    }
    expect(billeder.filter((b) => /\bpriority\b/.test(b))).toHaveLength(1);
    expect(tael(udenKommentarer(side), /<figcaption[^>]*>\s*Illustration/g)).toBe(3);
  });

  it("alt-teksterne beskriver og lover ikke mere end produktet", () => {
    const alts = [...side.matchAll(/alt: "([^"]+)"/g)].map((m) => m[1]);
    expect(alts).toHaveLength(3);
    for (const a of alts) {
      expect(a.length).toBeGreaterThan(30);
      expect(a).toMatch(/^Illustration/);
      expect(a).not.toMatch(/automatisk|download|gratis/i);
    }
  });

  it("Komplet Online viser integrationen; de diskrete sider gør ikke", () => {
    expect(kode("src/app/loyalsum-komplet-online/page.tsx")).toContain("/loyalsum-woocommerce-integration.png");
    for (const sti of ["src/app/page.tsx", "src/app/loyalitetsprogram/page.tsx", "src/app/stempelkort/page.tsx", "src/app/produkter/[slug]/page.tsx"]) {
      expect(kode(sti), sti).not.toMatch(/loyalsum-woocommerce-(dashboard|beloenning-kurv|integration)\.png/);
    }
  });
});
