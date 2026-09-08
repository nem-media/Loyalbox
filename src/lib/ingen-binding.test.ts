import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * "INGEN BINDING" MÅ IKKE HAVE ET FORBEHOLD.
 *
 * Forsiden sagde "Ingen binding på Basic", og produktsiden sagde "Ingen
 * binding ud over løbende måned". Begge dele var en DÅRLIGERE handel end den,
 * vi faktisk tilbyder: handelsbetingelsernes §6 siger ligeud, at der ingen
 * bindingsperiode er, og at man kan opsige når som helst fra dashboardet. Den
 * løbende måned er ikke en binding — det er den periode, kunden allerede har
 * betalt for og beholder adgangen i.
 *
 * Et forbehold, der ikke svarer til vilkårene, koster salg uden at beskytte
 * nogen. Prøven her holder påstanden ren på de sider, en kunde køber fra —
 * og lader med vilje de juridiske sider være, for det er DÉR, detaljen om
 * hvornår en opsigelse træder i kraft, hører hjemme.
 */

/** Siderne en kunde ser før et køb. De juridiske sider er bevidst udeladt. */
const JURIDISKE = ["handelsbetingelser", "privatliv", "databehandleraftale"];

function salgsSider(): string[] {
  const rod = join(process.cwd(), "src/app");
  const fundne: string[] = [];
  const gaa = (sti: string) => {
    for (const navn of readdirSync(sti)) {
      const fuld = join(sti, navn);
      if (statSync(fuld).isDirectory()) {
        // Panelet og admin er ikke salgstekst, og de juridiske sider skal
        // netop have lov at være præcise.
        if (["dashboard", "admin", "api", "personale"].includes(navn)) continue;
        if (JURIDISKE.includes(navn)) continue;
        gaa(fuld);
      } else if (navn.endsWith(".tsx")) {
        fundne.push(fuld);
      }
    }
  };
  gaa(rod);
  return fundne;
}

/** Kilden uden kommentarer — prøven handler om teksten, kunden ser. */
function udenKommentarer(fil: string): string {
  return readFileSync(fil, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("påstanden om ingen binding", () => {
  /**
   * Enhver forekomst skal stå ALENE. Fanger både "på Basic", "ud over løbende
   * måned" og enhver ny variant, nogen måtte finde på.
   */
  it("står uden forbehold på alle salgssider", () => {
    const synder: string[] = [];
    for (const fil of salgsSider()) {
      const src = udenKommentarer(fil);
      for (const m of src.matchAll(/[Ii]ngen binding([^"'<}\n]*)/g)) {
        const hale = m[1].trim();
        // Et efterfølgende skilletegn er fint — et forbehold er ikke.
        if (hale && !/^[·.,!\s]*$/.test(hale)) {
          synder.push(`${fil.replace(process.cwd(), "")}: "Ingen binding${m[1]}"`);
        }
      }
    }
    expect(
      synder,
      `Påstanden har fået et forbehold:\n  ${synder.join("\n  ")}\n` +
        `Vilkårenes §6 siger, at der INGEN bindingsperiode er. ` +
        `Hører detaljen hjemme et sted, er det på handelsbetingelserne.`,
    ).toEqual([]);
  });

  /**
   * OG PÅSTANDEN SKAL VÆRE SAND. Står der ikke længere i vilkårene, at der
   * ingen bindingsperiode er, må forsiden heller ikke sige det.
   */
  it("er dækket af handelsbetingelserne", () => {
    const vilkaar = readFileSync(
      join(process.cwd(), "src/app/handelsbetingelser/page.tsx"),
      "utf8",
    );
    expect(vilkaar).toMatch(/ingen bindingsperiode/i);
    expect(vilkaar).toMatch(/opsige når som helst/i);
  });
});
