import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { KATALOG } from "./constants";

/**
 * DEN KØBEKLARE SKAL IKKE LEDE.
 *
 * MÅLT før striben fandtes: på forsiden lå det første købslink **2434 px
 * nede — 2,7 skærme**. På de fire landingssider var der ganske vist et link i
 * hero, men kun til ÉN vare, så man ikke kunne sammenligne uden først at gå
 * til kataloget.
 *
 * DERFOR IKKE KATALOGGITTERET. Det er MÅLT til 935 px på desktop og 3699 px
 * på mobil — fire fulde telefonskærme. Lagt efter hver hero ville en, der
 * lander på /stempelkort fra en søgning, scrolle gennem fire skærme
 * produktkort, før siden sagde ét ord om stempelkort. Striben er 240 px og
 * 444 px og bærer de samme fire varer med pris.
 *
 * Prøven passer på PLACERINGEN, fordi det er dét, kravet handler om: striben
 * skal stå umiddelbart efter hero — ikke et sted længere nede, hvor den lige
 * så godt kunne være væk.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Siderne med en hero, hvor den købeklare kan lande. */
const SIDER = [
  "src/app/page.tsx",
  "src/app/stempelkort/page.tsx",
  "src/app/reviewstander/page.tsx",
  "src/app/loyalitetsprogram/page.tsx",
  "src/app/loyalsum-komplet-online/page.tsx",
];

describe("produkterne står lige efter hero", () => {
  for (const sti of SIDER) {
    it(`${sti} har striben`, () => {
      expect(kilde(sti)).toContain("<ProduktStribe");
    });

    it(`${sti} har den EFTER hero og ikke længere nede`, () => {
      const s = kilde(sti);
      const stribe = s.indexOf("<ProduktStribe");
      expect(stribe, "striben findes").toBeGreaterThan(-1);

      /*
       * Hero er den første sektion i <main>. Står striben umiddelbart efter
       * den, er der præcis ÉN `</section>` foran den. Er der to eller flere,
       * er den gledet ned bag en sektion mere — og så er kravet brudt, uden
       * at noget andet ville sige fra.
       */
      const foran = s.slice(s.indexOf("<main"), stribe);
      const lukkede = (foran.match(/<\/section>/g) ?? []).length;
      expect(lukkede, `${lukkede} sektioner lukket før striben`).toBe(1);
    });
  }

  it("striben viser HELE kataloget og filtrerer ikke", () => {
    const k = kilde("src/components/produkt-stribe.tsx");
    expect(k).toMatch(/KATALOG\.map/);
    expect(k.includes("KATALOG.filter")).toBe(false);
    /* Fire varer i dag; kommer der en femte, skal gitteret tages op igen. */
    expect(KATALOG).toHaveLength(4);
  });

  it("striben bærer en pris på hver vare", () => {
    /* Uden prisen er den kun en menu mere, og den købeklare skal stadig
       klikke for at finde ud af, hvad tingene koster. */
    const k = kilde("src/components/produkt-stribe.tsx");
    expect(k).toContain("formatCurrency");
    expect(k).toContain("ex moms");
  });

  it("en vare uden engangspris står ikke med et nul", () => {
    /* Femte gang samme fælde: `price: 0` er sandt for LoyalSum Komplet
       Online, men det er ikke en pris, der skal skrives ud. */
    const k = kilde("src/components/produkt-stribe.tsx");
    expect(k).toContain("harFysiskSkilt(p)");
  });

  it("striben linker videre til sammenligningen", () => {
    /* Den svarer på "hvad koster de?", ikke på "hvad er forskellen?".
       Kataloget er stedet, hvor man sammenligner på indhold. */
    expect(kilde("src/components/produkt-stribe.tsx")).toContain('href="/produkter"');
  });
});
