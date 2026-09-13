import { describe, it, expect } from "vitest";
import { UPCOMING_MERCH, harPris, PRODUCTS, KATALOG } from "./constants";
import { UPCOMING_ICONS } from "@/components/product-placeholder";

/**
 * Materialer på vej.
 *
 * DET FARLIGE VED LISTEN ER, AT DEN SER UD SOM ET KATALOG. Den står på en
 * offentlig side med navne, formater og — for nogle varer — priser, men
 * ingen af dem kan købes. Prøverne her holder de to ting adskilt: et tal må
 * kun stå, når det er besluttet, og en vare må ikke kunne bestilles, før den
 * er flyttet over i PRODUCTS.
 */

describe("listen over kommende materialer", () => {
  it("har unikke nøgler og et ikon til hver", () => {
    // Nøglen slår ikonet op. Uden et ikon render kortet et tomt felt, og det
    // opdages ikke af typerne: opslaget giver bare `undefined`.
    const noegler = UPCOMING_MERCH.map((m) => m.key);
    expect(new Set(noegler).size).toBe(noegler.length);
    for (const m of UPCOMING_MERCH) {
      expect(UPCOMING_ICONS[m.key], `ikon mangler for ${m.key}`).toBeTruthy();
    }
  });

  it("har mindst én størrelse pr. vare", () => {
    for (const m of UPCOMING_MERCH) {
      expect(m.stoerrelser.length, m.key).toBeGreaterThan(0);
    }
  });

  it("ingen af dem kan bestilles", () => {
    /*
      Det er dét, der gør listen ufarlig at vise med priser: varerne står
      ikke i PRODUCTS, og derfor findes de hverken i kataloget, i sitemappet,
      som produktside eller i checkouten. En pris gør dem ikke købbare.
    */
    const slugs = new Set(PRODUCTS.map((p) => p.slug));
    const katalog = new Set(KATALOG.map((p) => p.slug));
    for (const m of UPCOMING_MERCH) {
      expect(slugs.has(m.key), `${m.key} er havnet i PRODUCTS`).toBe(false);
      expect(katalog.has(m.key), `${m.key} er havnet i KATALOG`).toBe(false);
    }
  });
});

describe("priser på kommende varer", () => {
  it("en pris er et helt, positivt kronebeløb", () => {
    // Et tal her vises til kunder. Et nul eller en ører-værdi ville blive
    // trykt som en rigtig pris, før nogen nåede at opdage det.
    for (const m of UPCOMING_MERCH) {
      for (const st of m.stoerrelser) {
        if (st.pris === undefined) continue;
        expect(Number.isInteger(st.pris), `${m.key} ${st.format}`).toBe(true);
        expect(st.pris).toBeGreaterThan(0);
      }
    }
  });

  it("harPris() svarer ja præcis når mindst ét format har et beløb", () => {
    // Kortet vælger tekst på den: enten formater MED beløb, eller "Planlagt
    // i …" og "Pris annonceres senere". De to må ikke kunne blandes.
    for (const m of UPCOMING_MERCH) {
      const forventet = m.stoerrelser.some((st) => st.pris !== undefined);
      expect(harPris(m), m.key).toBe(forventet);
    }
  });

  it("plakaten koster 139 i A4 og findes ikke i A5", () => {
    // De to eneste fastlagte varer skrives ned, så en omskrivning af listen
    // ikke stille kan ændre en pris, der er meldt ud.
    const plakat = UPCOMING_MERCH.find((m) => m.key === "plakater");
    expect(plakat?.stoerrelser).toEqual([{ format: "A4", pris: 139 }]);
  });

  it("den selvklæbende koster 149 i A4 og 99 i A5", () => {
    const selv = UPCOMING_MERCH.find((m) => m.key === "selvklaebende");
    expect(selv?.stoerrelser).toEqual([
      { format: "A4", pris: 149 },
      { format: "A5", pris: 99 },
    ]);
  });

  it("de varer, der ikke er meldt ud, har INGEN pris", () => {
    // Mærkater og flyers venter stadig på tal. Et gæt må ligge i en
    // kommentar, aldrig i feltet — det ville blive vist som en rigtig pris.
    for (const key of ["maerkater", "flyers"]) {
      const vare = UPCOMING_MERCH.find((m) => m.key === key);
      expect(vare, key).toBeTruthy();
      expect(harPris(vare!), key).toBe(false);
    }
  });
});
