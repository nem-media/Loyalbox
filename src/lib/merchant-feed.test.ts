import { describe, it, expect } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { GET } from "../app/merchant-feed.xml/route";
import { KATALOG, getProduct, inklMoms, MOMS_PROCENT } from "./constants";
import { shoppableProducts, toGoogleShoppingItem, toProductJsonLd } from "./commerce";

/**
 * GOOGLE MERCHANT CENTER-FEEDET (28. sep. 2026).
 *
 * Tre ting får Google til at afvise en vare, og de er alle afgjort i koden:
 * prisen skal være INKL. MOMS i Danmark og stå ens i feedet, på siden og i
 * dens strukturerede data; billedet må ikke være en SVG; og fragten skal
 * oplyses. Prøverne holder de tre fast.
 */

const RS = getProduct("reviewstander")!;

async function feed(): Promise<string> {
  return await GET().text();
}

describe("feedet", () => {
  it("rummer præcis de varer, der er markeret til Shopping", async () => {
    const xml = await feed();
    const ider = [...xml.matchAll(/<g:id>([^<]+)<\/g:id>/g)].map((m) => m[1]);
    expect(ider).toEqual(shoppableProducts(KATALOG).map((p) => p.slug));
    expect(ider).toEqual(["reviewstander"]);
  });

  it("prisen er inkl. moms og regnet af inklMoms()", async () => {
    expect(MOMS_PROCENT).toBe(25);
    expect(inklMoms(499)).toBe(623.75);
    expect(await feed()).toContain(`<g:price>${inklMoms(RS.price).toFixed(2)} DKK</g:price>`);
  });

  it("billedet er et rigtigt foto, der findes — aldrig en SVG", () => {
    const item = toGoogleShoppingItem(RS)!;
    expect(item.image_link).not.toMatch(/\.svg$/i);
    const sti = new URL(item.image_link).pathname;
    expect(existsSync(new URL(`../../public${sti}`, import.meta.url))).toBe(true);
  });

  it("oplyser fri fragt i Danmark og leveringstiden fra COMPANY", async () => {
    const xml = await feed();
    expect(xml).toContain("<g:country>DK</g:country>");
    expect(xml).toContain("<g:price>0.00 DKK</g:price>");
    expect(xml).toContain("<g:min_transit_time>3</g:min_transit_time>");
    expect(xml).toContain("<g:max_transit_time>5</g:max_transit_time>");
  });

  it("har mærke og MPN, så Google ikke kræver en stregkode", async () => {
    const xml = await feed();
    expect(xml).toContain("<g:brand>LoyalSum</g:brand>");
    expect(xml).toContain("<g:mpn>LS-REVIEW</g:mpn>");
    expect(xml).toContain("<g:identifier_exists>yes</g:identifier_exists>");
  });

  it("er gyldig XML med Googles navnerum og undslupne tegn", async () => {
    const xml = await feed();
    expect(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>')).toBe(true);
    expect(xml).toContain('xmlns:g="http://base.google.com/ns/1.0"');
    // Ingen rå & uden for en entitet.
    expect(xml).not.toMatch(/&(?!amp;|lt;|gt;|quot;|apos;)/);
  });
});

describe("siden siger det samme som feedet", () => {
  it("de strukturerede data oplyser prisen inkl. moms for varen i feedet", () => {
    const ld = toProductJsonLd(RS) as { offers: Record<string, unknown> };
    expect(ld.offers.price).toBe(inklMoms(RS.price));
    expect(ld.offers.priceSpecification).toMatchObject({
      price: inklMoms(RS.price),
      valueAddedTaxIncluded: true,
    });
  });

  it("varer uden for feedet beholder ex moms som resten af sitet", () => {
    const pro = getProduct("reviewstander-pro")!;
    const ld = toProductJsonLd(pro) as { offers: Record<string, unknown> };
    expect(ld.offers.price).toBe(pro.price);
  });

  it("produktsiden viser beløbet inkl. moms med øre, af inklMoms()", () => {
    const side = readFileSync(
      new URL("../app/produkter/[slug]/page.tsx", import.meta.url),
      "utf8",
    ).replace(/\{\/\*[\s\S]*?\*\/\}/g, "");
    expect(side).toContain("formatCurrencyOere(inklMoms(product.price))");
    expect(side).toMatch(/product\.shoppable && product\.price > 0/);
  });
});
