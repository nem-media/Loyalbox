import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { KATALOG, PRODUKT_FOTO } from "./constants";

/**
 * HVER SIDE, DER VISER VARER SOM KORT, SKAL VISE FOTOET — OG ALLE TRE VARER.
 *
 * `/reviewstander` gjorde ingen af delene. Sektionen "To måder at få standeren
 * på" viste Reviewstander og Pro, mens Komplet — den vare, der er mærket
 * `featured` i kataloget — kun blev nævnt i en sætning UNDER kortene. Og hvert
 * kort tegnede `StanderPlaceholder`, stregtegningen, der findes for varer UDEN
 * foto, selv om alle tre har et i `PRODUKT_FOTO`. Forsiden og kataloget viste
 * samtidig det rigtige foto, så siden var alene om det.
 *
 * DET ER DEN STILLE SLAGS. Pladsholderen er tegnet til at ligne en stander, så
 * der stod aldrig et hul i layoutet — siden så bare billigere ud end resten,
 * og den vare, der tjener mest, manglede. Meldt af brugeren 2026-09-18.
 *
 * Prøven læser KILDEN og ikke en gengivelse: den slags fejl er et valg i
 * koden, ikke en fejl, der kan opstå ved kørsel.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

/** Siderne, hvor en vare vises som et kort med billede. */
const SIDER = [
  ["reviewstander", "src/app/reviewstander/page.tsx"],
  ["kataloget", "src/app/produkter/page.tsx"],
  ["prissektionen", "src/components/pricing.tsx"],
] as const;

describe("varekortene viser fotoet", () => {
  for (const [navn, sti] of SIDER) {
    it(`${navn} bruger PRODUKT_FOTO`, () => {
      expect(
        kilde(sti),
        "uden det tegnes pladsholderen, og siden viser en stregtegning",
      ).toContain("PRODUKT_FOTO[p.slug]");
    });

    /*
     * FALDET TILBAGE SKAL BLIVE. Mangler en vare et foto en dag, skal kortet
     * stadig kunne tegnes — et tomt felt er værre end en tegning.
     */
    it(`${navn} beholder pladsholderen som reserve`, () => {
      expect(kilde(sti)).toContain("StanderPlaceholder");
    });
  }

  /*
   * 4:5 OG IKKE 16:9. Fotoene er 1000 × 1250. Med et 16:9-udsnit skærer
   * `object-cover` knap to tredjedele af højden væk — altså standeren selv.
   * Det stod i koden som `aspect-[16/9]` sammen med pladsholderen.
   */
  it("reviewstander-kortene bruger fotoets eget sideforhold", () => {
    const SIDE = kilde("src/app/reviewstander/page.tsx");
    expect(SIDE).not.toContain('aspect-[16/9]"');
  });
});

describe("alle tre varer vises", () => {
  it("prissektionen på /reviewstander har alle tre", () => {
    const SIDE = kilde("src/app/reviewstander/page.tsx");
    expect(SIDE).toContain("{[basis, pro, komplet].map");
    expect(SIDE).toContain('getProduct("loyalsum-komplet")');
  });

  /*
   * OVERSKRIFTEN SKAL FØLGE ANTALLET. Stod der "To måder" over tre kort, ville
   * teksten være forkert — og det er den slags, ingen retter, fordi det ikke
   * fejler.
   */
  it("overskriften siger tre og ikke to", () => {
    const SIDE = kilde("src/app/reviewstander/page.tsx");
    expect(SIDE).toContain("Tre måder at få standeren på");
    expect(SIDE).not.toContain("To måder at få standeren på");
  });

  /**
   * KATALOGET ER SANDHEDEN OM, HVOR MANGE DER ER.
   *
   * Listen står her, så en ny vare ikke kan glide ind, uden at nogen tager
   * stilling til, om den hører til på de sider, der viser varer som kort.
   * LoyalSum Komplet Online gør IKKE: de sider handler om standeren, og
   * Online har ingen. Derfor står den i kataloget og ikke i afsnittet "Tre
   * måder at få standeren på".
   */
  it("kataloget har præcis de fire, siderne regner med", () => {
    expect(KATALOG.map((p) => p.slug).sort()).toEqual([
      "loyalsum-komplet",
      "loyalsum-komplet-online",
      "reviewstander",
      "reviewstander-pro",
    ]);
    // Fotoet kræves kun af de varer, der HAR en fysisk ting at fotografere.
    for (const p of KATALOG) {
      expect(PRODUKT_FOTO[p.slug], p.slug).toBeTruthy();
    }
  });
});
