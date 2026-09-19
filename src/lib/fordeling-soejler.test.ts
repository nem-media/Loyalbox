import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * DET ENESTE DIAGRAM I PRODUKTET — og de tre ting, der gør det forsvarligt.
 *
 * Et diagram er den nemmeste måde at komme til at vise noget, man ikke har:
 * en tom fordeling bliver til fem grå streger, en farveskala bliver til den
 * eneste bærer af betydningen, og en søjlebredde bliver regnet på en anden
 * nævner, end teksten ved siden af påstår. Prøverne her holder fast i de tre.
 */

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const KOMPONENT = "src/components/ui/fordeling-soejler.tsx";
const CSS = "src/app/globals.css";

describe("fordelingssøjlerne", () => {
  it("tegner ingenting, når der ikke er noget at tegne", () => {
    /* Fem tomme streger ved siden af "0 oplevelser" ligner et diagram, der er
       gået i stykker — og det er dét, en ny butik ville møde. */
    const s = kilde(KOMPONENT);
    expect(s).toMatch(/if \(sum === 0\) return null/);
  });

  it("farven er aldrig den eneste bærer af betydningen", () => {
    /*
     * Skalaen går fra rød til grøn, og rød-grøn er netop den forskel, 8 % af
     * mænd ikke kan se. Hver række SKAL derfor stå med sit antal og sin
     * procent i tal. Prøven leder efter begge udskrivninger.
     */
    const s = kilde(KOMPONENT);
    expect(s, "antallet skrives ud").toMatch(/\{r\.antal\}/);
    expect(s, "procenten skrives ud").toMatch(/\{pct\}/);
    expect(s, "rækken har et navn").toMatch(/\{r\.navn\}/);
  });

  it("søjlen måles mod den største række, og teksten siger andelen", () => {
    /*
     * To forskellige nævnere med vilje: LÆNGDEN er relativ til den største
     * (ellers bliver en typisk fordeling med 80 % femstjernede til én lang
     * søjle og fire streger), mens PROCENTEN er andelen af det hele. Bytter
     * nogen rundt på dem, lyver enten billedet eller tallet.
     */
    const s = kilde(KOMPONENT);
    expect(s, "længden måles mod største").toMatch(/r\.antal \/ stoerst/);
    expect(s, "procenten måles mod summen").toMatch(/r\.antal \/ sum/);
  });

  it("skalaens fem trin findes som tokens og bruges af komponenten", () => {
    const css = readFileSync(CSS, "utf8");
    const s = kilde(KOMPONENT);
    for (const n of [1, 2, 3, 4, 5]) {
      expect(css, `--skala-${n} findes`).toMatch(
        new RegExp(`--skala-${n}:\\s*#[0-9a-fA-F]{6}`),
      );
      expect(s, `trin ${n} bruger sit token`).toContain(`bg-skala-${n}`);
    }
  });

  it("skalaen går fra rød mod grøn og ikke tilfældigt", () => {
    /*
     * Rækkefølgen er hele betydningen: trin 1 skal være mere rød end grøn og
     * trin 5 mere grøn end rød. En skala, hvor to trin bytter plads, ser
     * stadig ud som et diagram og siger noget forkert.
     */
    const css = readFileSync(CSS, "utf8");
    const rgb = (n: number) => {
      const m = new RegExp(`--skala-${n}:\\s*#([0-9a-fA-F]{6})`).exec(css)!;
      const v = m[1];
      return {
        r: parseInt(v.slice(0, 2), 16),
        g: parseInt(v.slice(2, 4), 16),
      };
    };
    const trin = [1, 2, 3, 4, 5].map(rgb);
    expect(trin[0].r, "trin 1 er rødest").toBeGreaterThan(trin[0].g);
    expect(trin[4].g, "trin 5 er grønnest").toBeGreaterThan(trin[4].r);
    /* Og det skal gå ÉN vej: forskellen rød−grøn falder hele vejen. */
    const forskel = trin.map((t) => t.r - t.g);
    for (let i = 1; i < forskel.length; i++) {
      expect(forskel[i], `trin ${i + 1} er grønnere end trin ${i}`).toBeLessThan(
        forskel[i - 1],
      );
    }
  });

  it("fordelingen kommer fra butikkens egne tal og ikke fra et opslag mere", () => {
    /* Tallene blev i forvejen hentet for at regne scoren. Blev de hentet én
       gang til for diagrammets skyld, ville en pæn visning koste en
       forespørgsel på hver sideindlæsning. */
    const data = kilde("src/lib/omdoemme-data.ts");
    /* Præcis to steder bruger udtrykket: dét, der regner scoren, og dét, der
       giver tallene videre til skærmen. Kommer der et tredje, er det enten en
       ekstra hentning eller en anden fordeling end den, scoren bygger på — og
       så ville diagrammet og tallet over det kunne sige hver sit. */
    const brug = data.match(/fordeling: fordeling \?\? TOM_FORDELING/g) ?? [];
    expect(brug, "samme fordeling til scoren og til skærmen").toHaveLength(2);
  });
});
