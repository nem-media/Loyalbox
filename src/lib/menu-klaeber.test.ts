import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * EN KLÆBENDE MENU ER TRE KLASSER, OG TO AF DEM SER OVERFLØDIGE UD.
 *
 * `md:sticky` alene gør ingenting. Sidebjælken er et flex-element i en
 * række, og et flex-element strækker sig til hele rækkens højde — altså
 * hele sidens. Et element, der er lige så højt som det, der rulles, har
 * intet at klæbe med, og `top-0` rammer aldrig. `md:h-screen` er dét, der
 * giver menuen en højde at klæbe inden for.
 *
 * Og så snart højden er bundet til skærmen, kan indholdet være højere end
 * den: ti punkter, to gruppeoverskrifter, logo, genvej og brugerblok er
 * omkring 750 px, og en bærbar med 768 px skærm har cirka 640 px at give af.
 * Uden `md:overflow-y-auto` er Log ud skåret af uden vej til at nå det.
 *
 * DE TRE HØRER SAMMEN, OG DET ER DÉT, PRØVEN HOLDER FAST I. Hver af dem
 * ligner noget, man kan fjerne: højden ser ud som en begrænsning, rulningen
 * som noget, der aldrig bruges (den gør heller ikke på skærmen, man selv
 * sidder ved). Fjernes én, er fejlen tavs og rammer kun nogle skærme.
 */

const SHELL = "src/components/dashboard-shell.tsx";

/** Kildekoden uden kommentarer — ellers tæller forklaringerne som kode. */
const kilde = () =>
  readFileSync(SHELL, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Menuens klasseliste — `<aside>` findes ét sted i panelets skal. */
const asideKlasser = () => {
  const m = kilde().match(/<aside className="([^"]+)"/);
  expect(m, "panelets skal har et <aside>").not.toBeNull();
  return m![1].split(/\s+/);
};

describe("dashboardets menu klæber", () => {
  it("klæber øverst med sin egen højde og sin egen rulning", () => {
    const k = asideKlasser();
    for (const klasse of ["md:sticky", "md:top-0", "md:h-screen", "md:overflow-y-auto"]) {
      expect(
        k,
        `${klasse} mangler — de fire virker kun sammen, se filens hoved`,
      ).toContain(klasse);
    }
  });

  it("klæber ikke på mobil", () => {
    /*
     * På mobil ligger menuen vandret øverst og bærer ALLE punkter i en
     * rulbar stribe. Klæbede den, ville den tage en tredjedel af en
     * telefonskærm på hver eneste side i dashboardet.
     *
     * Fælden er, at `sticky` og `top-0` uden præfiks LIGNER det rigtige og
     * virker fint på den skærm, man selv tester på.
     */
    const k = asideKlasser();
    for (const klasse of ["sticky", "top-0", "h-screen", "overflow-y-auto", "fixed"]) {
      expect(
        k,
        `${klasse} står uden md: — så klæber menuen også på en telefon`,
      ).not.toContain(klasse);
    }
  });

  it("menuens rullepanel er dæmpet", () => {
    /*
     * Rulningen indeni tegner en lodret søjle ned ad en hvid spalte.
     * Standardpanelet i Chrome på Windows er 15 px med en grå bane — den
     * eneste lodrette streg i menuen ud over kanten selv, og bredere end
     * mellemrummet mellem ikon og tekst. Den ville læses som struktur.
     */
    expect(asideKlasser(), "menuen bærer .menu-rul").toContain("menu-rul");
    const css = readFileSync("src/app/globals.css", "utf8");
    expect(css, ".menu-rul er defineret").toMatch(/\.menu-rul\s*\{/);
    expect(
      css,
      "banen er gennemsigtig — menuen og admin står på hver sin grund",
    ).toMatch(/scrollbar-color:\s*var\(--border\)\s+transparent/);
  });
});
