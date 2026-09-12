import { describe, expect, it } from "vitest";
import {
  FOTO_FARVETEKST,
  KATALOG,
  KORT_PUNKTER,
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

  it("Basic og Pro deler foto — Komplet har sit eget", () => {
    // De to første er den samme akryl med det samme tryk, og forskellen
    // mellem dem kan et foto ikke vise; tre miljøer fik dem til at ligne tre
    // produkter. Komplet KAN ses: klistermærket sidder på skiltet.
    const uden = KATALOG.filter((p) => !p.includesLoyalSum).map(
      (p) => PRODUKT_FOTO[p.slug],
    );
    expect(new Set(uden).size).toBe(1);
    expect(uden).not.toContain(PRODUKT_FOTO["loyalsum-komplet"]);
  });

  it("KUN Komplet har klistermærke-fotoet", () => {
    // Mærket siger "Indeholder stempelkort", og det er præcis dét, der skiller
    // Komplet fra Pro. Havnede det på Pro, lovede fotoet en funktion, kunden
    // ikke har købt.
    for (const p of KATALOG) {
      const harMaerke = PRODUKT_FOTO[p.slug].includes("-komplet");
      expect(harMaerke, `${p.slug} har forkert foto`).toBe(
        Boolean(p.includesLoyalSum),
      );
    }
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

  it("hver vare har korte punkter til kortet", () => {
    for (const p of KATALOG) {
      const punkter = KORT_PUNKTER[p.slug];
      expect(punkter, `punkter mangler for ${p.slug}`).toBeTruthy();
      expect(punkter.length).toBeGreaterThanOrEqual(3);
      // Et kort skal kunne skimmes. Et punkt, der wrapper til tre linjer på en
      // telefon, er en sætning og hører hjemme i `features` på produktsiden.
      for (const linje of punkter) {
        expect(linje.length, `for langt punkt: "${linje}"`).toBeLessThanOrEqual(
          46,
        );
      }
    }
  });

  it("opslag står KUN på Komplet, og loves ikke som automatiske", () => {
    // Spærringen sidder i src/app/dashboard/opslag/layout.tsx og spørger om
    // PRODUKTET (hasLoyaltyAccess), ikke om plan — Pro og Komplet er samme
    // niveau. Et opslags-punkt på Pro ville altså love en side, der afviser
    // kunden. Og opslag laves ikke af sig selv: kunden vælger tekst og
    // baggrund, henter billedet og deler det selv.
    for (const p of KATALOG) {
      const punkter = KORT_PUNKTER[p.slug].join(" ").toLowerCase();
      if (!p.includesLoyalSum) expect(punkter).not.toContain("opslag");
      expect(punkter).not.toMatch(/automatisk/);
    }
    expect(KORT_PUNKTER["loyalsum-komplet"].join(" ")).toMatch(/Opslag/);
  });

  it("statistik står på abonnementsvarerne og ikke på engangskøbet", () => {
    // Statistik følger NIVEAUET (TIER_CAPABILITIES.pro). Basic har intet
    // dashboard overhovedet, så punktet ville være et løfte uden en side.
    for (const p of KATALOG) {
      const punkter = KORT_PUNKTER[p.slug].join(" ").toLowerCase();
      expect(punkter.includes("statistik")).toBe(Boolean(p.monthlyPrice));
    }
  });

  it("ingen salgstekst nævner klistermærket", () => {
    /*
      Mærket "Indeholder stempelkort" FØLGER MED i kassen til Komplet, og
      derfor må det gerne ses på produktfotoet. Men det må ikke skrives ind
      som en funktion nogen steder.

      Grunden er den samme som til, at Komplet ikke får sit eget TRYKTE skilt:
      mærket kan sættes på og tages af igen, og butikken bestemmer selv, om og
      hvornår stempelkortet kommer op at køre. Et løfte i en salgstekst står
      derimod fast fra købsøjeblikket — også hos en kunde, der aldrig kommer i
      gang. Se AGENTS.md.
    */
    const forbudt = /klisterm|mærkat|sticker/i;
    for (const p of KATALOG) {
      const tekster = [
        p.tagline,
        p.description,
        ...p.features,
        ...(KORT_PUNKTER[p.slug] ?? []),
        PRODUKT_FOTO_TEKST[p.slug] ?? "",
      ];
      for (const t of tekster) {
        expect(t, `nævner klistermærket: "${t}"`).not.toMatch(forbudt);
      }
    }
    expect(FOTO_FARVETEKST).not.toMatch(forbudt);
  });

  it("farveteksten lover kun stjernerne — ikke rammen om logoet", () => {
    // Samme regel som ACCENT_TEKSTER: rammen skæres væk sammen med
    // logofeltet, så snart der ligger et logo, og når derfor aldrig trykket.
    expect(FOTO_FARVETEKST).toMatch(/stjerne/i);
    expect(FOTO_FARVETEKST).not.toMatch(/ramme|logofelt/i);
  });
});
