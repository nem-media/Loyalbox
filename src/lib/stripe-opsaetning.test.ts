import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { PRODUCTS } from "./constants";

/**
 * OPSÆTNINGSSCRIPTET SKRIVER I EN RIGTIG STRIPE-KONTO — OGSÅ I LIVE.
 *
 * `scripts/setup-stripe-products.mjs` er det eneste sted, produkter og priser
 * oprettes, og den køres i hånden med en hemmelig nøgle. Den har ingen
 * fortrydelsesknap: et prisobjekt kan ikke redigeres, kun erstattes, og et
 * produkt med priser kan ikke slettes, kun arkiveres. Derfor prøves scriptets
 * regler her frem for at blive opdaget i en konto.
 *
 * Prøven læser KILDEN uden kommentarer — begrundelserne i scriptet citerer med
 * vilje den kode, de forklarer, og en prøve på den rå tekst ville bestå, når
 * koden var slettet og forklaringen stod tilbage.
 */

const kilde = readFileSync("scripts/setup-stripe-products.mjs", "utf8")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .replace(/^\s*\/\/.*$/gm, "");

describe("opsætningsscriptet opretter kun priser, varen har", () => {
  /*
   * EN VARE UDEN ENGANGSPRIS MÅ IKKE FÅ ET PRISOBJEKT PÅ NUL KRONER.
   *
   * Standerlinjen var ubetinget, fordi hver vare havde en stander. LoyalSum
   * Komplet Online har `price: 0`, og Stripe tager glad imod `unit_amount: 0`
   * — så der ville blive oprettet et gyldigt prisobjekt på nul kroner og
   * skrevet ind i constants.ts som varens `priceId`.
   *
   * Det er samme landmine som den, der allerede ligger der: de gemte
   * engangspriser står på 399, mens vi opkræver 499, og
   * `pris-graenseflade.test.ts` findes netop, fordi `price: ids.priceId` ser
   * ud som den naturlige måde at bruge dem på. Et nul ville gøre samme
   * fejltagelse gratis for kunden i stedet for 100 kr. for billig.
   */
  it("standerlinjen er betinget ligesom månedsprisen og opsætningen", () => {
    const linje = /p\.price\s*\?\s*\{\s*label:\s*"engangs \(stander\)"/;
    expect(
      linje.test(kilde),
      "standerprisen skal kun oprettes, når varen har en",
    ).toBe(true);
  });

  it("der findes en vare, reglen faktisk gælder for", () => {
    /* Uden dén er prøven ovenfor en regel uden et tilfælde. */
    const udenEngangspris = PRODUCTS.filter((p) => !p.price);
    expect(udenEngangspris.map((p) => p.slug)).toContain(
      "loyalsum-komplet-online",
    );
    for (const p of udenEngangspris) {
      expect(p.monthlyPrice, `${p.slug} skal have en månedspris i stedet`).toBeTruthy();
    }
  });
});

describe("opsætningsscriptet kan køres to gange", () => {
  /*
   * OPSLAGET MÅ IKKE VÆRE `products/search`.
   *
   * Scriptet kalder sig idempotent, og det holdt, så længe der gik et døgn
   * mellem kørslerne. MÅLT 2026-09-19: to kørsler med 12 sekunders mellemrum
   * gav TO produkter for `loyalsum-komplet-online`, hver med sin egen
   * 399 kr.-månedspris. Stripes search-endpoint indekserer nyoprettede
   * objekter med forsinkelse, så den anden kørsel så et tomt svar.
   *
   * Det er værre end et dobbelt produkt i dashboardet: den anden kørsel
   * udskriver ET ANDET `productId` og `monthlyPriceId` end den første, og
   * bliver de skrevet ind i constants.ts, abonnerer nye kunder på et
   * prisobjekt, der hører til en vare, ingen kigger på.
   *
   * `GET /v1/products` er strongly consistent — det, der lige er skrevet,
   * står der.
   */
  it("slår produkter op med en liste og ikke med search", () => {
    expect(kilde).not.toContain("products/search");
    expect(kilde).toMatch(/products\?limit=\d+&active=true/);
  });

  it("finder produktet på dets eget mærke", () => {
    /* Mærket er båndet mellem kataloget og Stripe; uden det ville en ny
       kørsel ikke kunne kende varen igen og ville oprette den forfra. */
    expect(kilde).toMatch(/metadata\?\.loyalsum_slug === slug/);
  });

  it("tager ikke arkiverede produkter i brug igen", () => {
    /* En vare, der bevidst er taget ud af drift, skal blive ude — ellers
       ville scriptet genoplive den, næste gang det kører. */
    expect(kilde).toContain("active=true");
  });

  it("løber hele listen igennem og ikke kun den første side", () => {
    /* Med `limit=100` og fem varer er det rigeligt i dag. Men en liste, der
       stopper ved side ét, er en tikkende dublet: den dag kontoen har 101
       produkter, holder opslaget op med at finde de ældste, og scriptet
       opretter dem igen — i live. */
    expect(kilde).toContain("has_more");
    expect(kilde).toContain("starting_after");
  });
});
