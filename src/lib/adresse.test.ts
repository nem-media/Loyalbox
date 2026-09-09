import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  erGyldigtPostnummer,
  harKompletAdresse,
  tilStripeShipping,
  adresseFraOrdre,
} from "./adresse";
import { LEVERINGSLANDE } from "./constants";

describe("postnummer", () => {
  it("tager fire cifre", () => {
    for (const p of ["2630", "0800", "9999"]) {
      expect(erGyldigtPostnummer(p), p).toBe(true);
    }
  });

  it("afviser alt andet", () => {
    for (const p of ["263", "26300", "26a0", "", " ", null, undefined]) {
      expect(erGyldigtPostnummer(p as string), String(p)).toBe(false);
    }
  });

  /** Mellemrum omkring er en indtastning, ikke en fejl. */
  it("er ligeglad med mellemrum omkring", () => {
    expect(erGyldigtPostnummer(" 2630 ")).toBe(true);
  });
});

describe("harKompletAdresse", () => {
  const hel = { address: "Spotorno Allé 4", postnummer: "2630", by: "Høje Taastrup" };

  it("siger ja til en hel adresse", () => {
    expect(harKompletAdresse(hel)).toBe(true);
  });

  /**
   * EN HALV ADRESSE ER VÆRRE END INGEN. Den ser udfyldt ud i profilen og
   * ville blive sendt til Stripe som en mangelfuld forudfyldning, hvor
   * kunden selv skal opdage, hvad der mangler.
   */
  it("kræver alle tre dele", () => {
    expect(harKompletAdresse({ ...hel, address: null })).toBe(false);
    expect(harKompletAdresse({ ...hel, postnummer: null })).toBe(false);
    expect(harKompletAdresse({ ...hel, by: null })).toBe(false);
    expect(harKompletAdresse({ ...hel, address: "   " })).toBe(false);
    expect(harKompletAdresse(null)).toBe(false);
  });

  /** Et ugyldigt postnummer gør ikke adressen komplet, selv om feltet er udfyldt. */
  it("accepterer ikke et forkert postnummer", () => {
    expect(harKompletAdresse({ ...hel, postnummer: "26300" })).toBe(false);
  });
});

describe("tilStripeShipping", () => {
  const hel = { address: "Spotorno Allé 4", postnummer: "2630", by: "Høje Taastrup" };

  it("giver Stripes egen form", () => {
    expect(tilStripeShipping(hel, "Nem Media ApS")).toEqual({
      name: "Nem Media ApS",
      address: {
        line1: "Spotorno Allé 4",
        postal_code: "2630",
        city: "Høje Taastrup",
        country: "DK",
      },
    });
  });

  /** Landet skrives ikke af — vi sender kun dertil, hvor vi siger vi sender. */
  it("bruger leveringslandet fra konstanterne", () => {
    const s = tilStripeShipping(hel, "X");
    expect(s?.address.country).toBe(LEVERINGSLANDE[0]);
  });

  it("giver null, når adressen ikke er hel", () => {
    expect(tilStripeShipping({ ...hel, by: null }, "X")).toBeNull();
    expect(tilStripeShipping(null, "X")).toBeNull();
  });
});

describe("adresseFraOrdre", () => {
  /** Ordrens gemte form er Stripes: line1 / postal_code / city. */
  it("læser en gemt leveringsadresse tilbage", () => {
    expect(
      adresseFraOrdre({
        city: "Høje Taastrup",
        country: "DK",
        line1: "Spotorno Allé 4",
        line2: null,
        postal_code: "2630",
        state: null,
      }),
    ).toEqual({
      address: "Spotorno Allé 4",
      postnummer: "2630",
      by: "Høje Taastrup",
    });
  });

  it("giver null, når ordren ikke har en brugbar adresse", () => {
    expect(adresseFraOrdre(null)).toBeNull();
    expect(adresseFraOrdre({})).toBeNull();
    expect(adresseFraOrdre({ line1: "Vej 1", city: "By" })).toBeNull();
  });
});

/**
 * ADRESSEN SKAL NULSTILLES VED EN SLETNING.
 *
 * `address` har ligget på virksomheden siden 0001 og blev IKKE nulstillet af
 * `slet_virksomhedens_data()` — den overlevede altså en sletning sammen med
 * firmanavnet. For en enkeltmandsvirksomhed er vejnavn og nummer typisk
 * indehaverens privatadresse. Rettet i 0029, hvor de to nye felter kom til.
 *
 * Ordrens `leveringsadresse` er noget andet og BEVARES med vilje: den er
 * bilaget for et køb, og databehandleraftalens § 13 undtager netop det,
 * lovgivningen kræver gemt.
 *
 * Prøves i migrationerne, fordi sletningen sker i DATABASEN — der er ingen
 * TypeScript at kalde. Samme fremgangsmåde som `opbevaring.test.ts`.
 */
describe("sletterutinen", () => {
  const MIGRATIONER = join(process.cwd(), "supabase/migrations");

  /** Den SENESTE definition vinder — funktionen er erstattet seks gange. */
  function senesteSletterutine(): string {
    const filer = readdirSync(MIGRATIONER)
      .filter((f) => f.endsWith(".sql"))
      .sort();

    let nyeste: string | null = null;
    for (const f of filer) {
      const sql = readFileSync(join(MIGRATIONER, f), "utf8");
      const i = sql.indexOf(
        "create or replace function public.slet_virksomhedens_data",
      );
      if (i !== -1) nyeste = sql.slice(i);
    }
    expect(nyeste, "ingen migration definerer slet_virksomhedens_data").not.toBeNull();
    return nyeste!;
  }

  it("nulstiller adressens tre felter", () => {
    const sql = senesteSletterutine();
    for (const kolonne of ["address", "postnummer", "by"]) {
      expect(sql, `${kolonne} nulstilles ikke ved sletning`).toMatch(
        new RegExp(`\\b${kolonne}\\s+=\\s*null`),
      );
    }
  });

  /** Ordren må derimod IKKE tømmes — den er bilaget. */
  it("rører ikke ordrens leveringsadresse", () => {
    expect(senesteSletterutine()).not.toMatch(/leveringsadresse\s*=\s*null/);
  });
});
