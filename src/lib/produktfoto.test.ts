import { describe, expect, it } from "vitest";
import {
  FOTO_FARVETEKST,
  KATALOG,
  PRODUKT_FOTO,
  PRODUKT_FOTO_TEKST,
} from "./constants";
import { ACCENT_TEKSTER, FRONT_TEKSTER } from "./stander-tilvalg";

describe("produktfoto og billedtekst", () => {
  it("hver vare i kataloget har både foto og billedtekst", () => {
    // Siderne falder tilbage på en pladsholder og en tom tekst uden at fejle.
    // En ny vare ville derfor stå med et ikon og ingen forklaring, og det
    // ville ingen opdage før en kunde stod på siden.
    for (const p of KATALOG) {
      expect(PRODUKT_FOTO[p.slug], `foto mangler for ${p.slug}`).toBeTruthy();
      expect(
        PRODUKT_FOTO_TEKST[p.slug],
        `billedtekst mangler for ${p.slug}`,
      ).toBeTruthy();
    }
  });

  it("alle tre varer viser det SAMME foto", () => {
    // Det er den samme fysiske stander. Tre miljøer fik varerne til at ligne
    // tre forskellige produkter; forskellen ligger i teksten under billedet.
    const fotos = new Set(KATALOG.map((p) => PRODUKT_FOTO[p.slug]));
    expect(fotos.size).toBe(1);
  });

  it("billedteksterne er forskellige — ellers skiller de ikke varerne ad", () => {
    const tekster = new Set(KATALOG.map((p) => PRODUKT_FOTO_TEKST[p.slug]));
    expect(tekster.size).toBe(KATALOG.length);
  });

  it("Pro-teksten nævner både flere platforme og det egne link", () => {
    // De to ting ER Pro'ens forskel fra Basic. Ryger den ene ud i en
    // omskrivning, står Pro med en tekst, der kunne stå på Basic.
    const pro = PRODUKT_FOTO_TEKST["reviewstander-pro"];
    expect(pro).toMatch(/platforme/i);
    expect(pro).toMatch(/menukort|booking/i);
  });

  it("farveteksten siger BÅDE hvad der er gratis, og hvad der koster", () => {
    // Accenten er uden beregning, baggrundsfarven er et selvstændigt tryk og
    // koster pr. ordre (se stander-tilvalg.ts). Nævnes kun den gratis, læses
    // hele linjen som gratis — og så er prisen en overraskelse i kurven.
    expect(FOTO_FARVETEKST).toContain(ACCENT_TEKSTER.pris);
    expect(FOTO_FARVETEKST).toMatch(/tillæg/i);
    expect(FRONT_TEKSTER.prisNote).toMatch(/pr\. ordre/i);
  });

  it("farveteksten lover kun stjernerne — ikke rammen om logoet", () => {
    // Samme regel som ACCENT_TEKSTER: rammen skæres væk sammen med
    // logofeltet, så snart der ligger et logo, og når derfor aldrig trykket.
    expect(FOTO_FARVETEKST).toMatch(/stjerne/i);
    expect(FOTO_FARVETEKST).not.toMatch(/ramme|logofelt/i);
  });
});
