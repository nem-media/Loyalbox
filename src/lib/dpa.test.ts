import { describe, it, expect } from "vitest";
import {
  requiresDpa,
  dpaIsCurrent,
  DPA_VERSION,
  DPA_SECTIONS,
  SUBPROCESSORS,
} from "./dpa";
import { PRODUCTS } from "./constants";

describe("requiresDpa", () => {
  it("kræver aftale for alle varer, vi sælger i dag", () => {
    // Hver vare indeholder en stander, og standeren tager imod feedback med
    // navn, e-mail og fritekst fra butikkens kunder. Skulle nogen komme til at
    // markere en vare som datafri, fanges det her.
    for (const p of PRODUCTS) {
      expect(requiresDpa(p), p.slug).toBe(true);
    }
  });

  it("undtager kun en vare, der udtrykkeligt er markeret datafri", () => {
    expect(requiresDpa({ noPersonalData: true })).toBe(false);
  });
});

describe("dpaIsCurrent", () => {
  it("genkender den gældende version", () => {
    expect(dpaIsCurrent(DPA_VERSION)).toBe(true);
  });

  it("afviser en ældre eller manglende accept", () => {
    // En kunde, der accepterede version 0.9, har ikke sagt ja til den nye
    // tekst — og må ikke se ud som om de har.
    expect(dpaIsCurrent("0.9")).toBe(false);
    expect(dpaIsCurrent(null)).toBe(false);
    expect(dpaIsCurrent(undefined)).toBe(false);
  });
});

describe("aftalens indhold", () => {
  it("dækker de punkter en databehandleraftale skal indeholde", () => {
    // Artikel 28 kræver bl.a. instruks, fortrolighed, sikkerhed,
    // underdatabehandlere, bistand, brud, tilsyn og sletning. Fjernes et
    // afsnit ved et uheld, er aftalen mangelfuld — uden at noget fejler.
    const paakraevet = [
      "instruks",
      "fortrolighed",
      "sikkerhed",
      "underdatabehandlere",
      "tredjelande",
      "bistand",
      "brud",
      "revision",
      "sletning",
    ];
    const ider = DPA_SECTIONS.map((s) => s.id);
    for (const id of paakraevet) {
      expect(ider, `mangler afsnittet: ${id}`).toContain(id);
    }
  });

  it("har unikke afsnits-id'er og indhold i hvert afsnit", () => {
    expect(new Set(DPA_SECTIONS.map((s) => s.id)).size).toBe(
      DPA_SECTIONS.length,
    );
    for (const s of DPA_SECTIONS) {
      expect(s.title.length, s.id).toBeGreaterThan(0);
      expect(s.paragraphs.length, s.id).toBeGreaterThan(0);
    }
  });

  it("oplyser formål og placering for hver underdatabehandler", () => {
    expect(SUBPROCESSORS.length).toBeGreaterThan(0);
    for (const sp of SUBPROCESSORS) {
      expect(sp.purpose.length, sp.name).toBeGreaterThan(0);
      expect(sp.location.length, sp.name).toBeGreaterThan(0);
    }
  });
});
