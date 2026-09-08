import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * "INGEN BINDING" MÅ IKKE INDSNÆVRES.
 *
 * Forsiden sagde "Ingen binding på Basic", og produktsiden sagde "Ingen
 * binding ud over løbende måned". Begge dele var en DÅRLIGERE handel end den,
 * vi faktisk tilbyder: handelsbetingelsernes §6 siger ligeud, at der ingen
 * bindingsperiode er, og at man kan opsige når som helst fra dashboardet. Den
 * løbende måned er ikke en binding — det er den periode, kunden allerede har
 * betalt for og beholder adgangen i.
 *
 * Et forbehold, der ikke svarer til vilkårene, koster salg uden at beskytte
 * nogen.
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

/**
 * Ord, der BEGRÆNSER påstanden.
 *
 * Skellet er mellem at begrænse og at uddybe. "Ingen binding på Basic" og
 * "ingen binding ud over løbende måned" tager noget fra kunden — der er altså
 * binding et andet sted. "Ingen binding — du kan opsige når som helst" tager
 * intet: det siger det samme én gang til. Derfor fanges de ord, der
 * indsnævrer, og ikke enhver fortsættelse.
 */
const INDSNAEVRENDE = [
  "på",
  "ud over",
  "udover",
  "kun",
  "dog",
  "bortset",
  "medmindre",
  "med mindre",
  "hvis",
  "mod",
  "efter",
  "ved",
];

describe("påstanden om ingen binding", () => {
  it("indsnævres ikke på nogen salgsside", () => {
    const synder: string[] = [];
    for (const fil of salgsSider()) {
      for (const m of udenKommentarer(fil).matchAll(
        /[Ii]ngen binding[ ]+([^"'<}\n]*)/g,
      )) {
        const efter = m[1].trim().toLowerCase();
        const rammer = INDSNAEVRENDE.some(
          (ord) => efter === ord || efter.startsWith(ord + " "),
        );
        if (rammer) {
          synder.push(
            `${fil.replace(process.cwd(), "")}: "…ingen binding ${m[1]
              .trim()
              .slice(0, 40)}…"`,
          );
        }
      }
    }
    expect(
      synder,
      `Påstanden er blevet indsnævret:\n  ${synder.join("\n  ")}\n` +
        `Vilkårenes §6 siger, at der INGEN bindingsperiode er — uden ` +
        `undtagelser. Hører en detalje hjemme et sted, er det på ` +
        `handelsbetingelserne.`,
    ).toEqual([]);
  });

  /**
   * OG DEN SKAL FAKTISK STÅ DER, hvor et abonnement sælges. Det var pointen
   * med at tilføje den på kampagnesiderne: kundens næste spørgsmål efter
   * prisen er, hvad hun binder sig til.
   */
  it("står på forsiden og begge kampagnesider", () => {
    for (const sti of [
      "src/app/page.tsx",
      "src/app/reviewstander/page.tsx",
      "src/app/stempelkort/page.tsx",
    ]) {
      expect(
        readFileSync(join(process.cwd(), sti), "utf8").toLowerCase(),
        `${sti} nævner ikke, at der ingen binding er`,
      ).toContain("ingen binding");
    }
  });

  /**
   * OG PÅSTANDEN SKAL VÆRE SAND. Står der ikke længere i vilkårene, at der
   * ingen bindingsperiode er, må salgssiderne heller ikke love det.
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
