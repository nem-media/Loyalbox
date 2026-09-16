import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * TILGÆNGELIGHED — DE TO TING, EN MÅLING FANDT.
 *
 * Gennemgået i browseren 2026-09-16. Det meste var i orden: `lang="da"`, ét
 * `h1` pr. side uden overspringne niveauer, alle fire landemærker, alt-tekst
 * på hvert billede, intet positivt `tabindex`, synligt fokus, og **ingen
 * kontrastfejl** (måleren blev afprøvet med en kontrolprøve på 1,67, så nul
 * fund betyder noget).
 *
 * To ting var galt, og begge var systemiske:
 *
 * 1. **`Field` bandt ikke etiket til felt.** `<Label>` og feltet var
 *    søskende, uden `htmlFor` og uden omslutning. På tilmeldingssiden — den
 *    formular hver eneste slutkunde møder — havde `name` og `email` kun en
 *    `placeholder` at give en skærmlæser, og **`phone` havde ingenting**.
 *    Det ramte alle 90 `Field` i tyve filer, og det ramte også dem, der ser:
 *    et klik på etiketten satte ikke markøren i feltet, og etiketten er et
 *    større trykmål end feltet på en telefon.
 *
 * 2. **Intet springlink.** Første tabstop var menupunktet "Platform", så en
 *    tastaturbruger skulle igennem hele menuen på HVER side.
 */

function filer(mappe: string): string[] {
  const ud: string[] = [];
  for (const navn of readdirSync(mappe)) {
    const sti = join(mappe, navn);
    if (statSync(sti).isDirectory()) ud.push(...filer(sti));
    else if (/\.tsx$/.test(navn) && !navn.includes(".test.")) ud.push(sti);
  }
  return ud;
}

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/\{\/\*[\s\S]*?\*\/\}/g, "");

describe("etiketten er bundet til sit felt", () => {
  const INPUT = udenKommentarer(
    readFileSync(join(process.cwd(), "src/components/ui/input.tsx"), "utf8"),
  );

  /**
   * En omsluttende `<label>` binder implicit og kræver ingen id'er, der kan
   * komme i utakt. Alternativet — `htmlFor` med et genereret id — ville
   * kræve, at `Field` klonede sit barn.
   */
  it("Field omslutter feltet med en label", () => {
    const i = INPUT.indexOf("export function Field");
    const krop = INPUT.slice(i);
    expect(krop).toMatch(/return \(\s*<label/);
    // Etiketteksten må ikke længere være et selvstændigt <Label> ved siden af.
    expect(krop).not.toMatch(/<Label>\{label\}<\/Label>/);
  });

  it("etiketteksten beholder sit udseende", () => {
    const i = INPUT.indexOf("export function Field");
    expect(INPUT.slice(i)).toMatch(/<span className="mb-1\.5 block text-sm font-medium">/);
  });

  /**
   * FORUDSÆTNINGEN FOR OMSLUTNINGEN: præcis ÉN kontrol pr. `Field`. Med to
   * ville en implicit etiket kun binde til den første, og den anden ville
   * være unavngivet igen — altså den fejl, vi lige har rettet, men sværere at
   * få øje på.
   */
  it("hver Field indeholder præcis én kontrol", () => {
    const synder: string[] = [];
    for (const sti of filer("src")) {
      const s = readFileSync(sti, "utf8");
      for (const m of s.matchAll(/<Field\b[^>]*>([\s\S]*?)<\/Field>/g)) {
        const n = (m[1].match(/<(Input|Textarea|select|input)\b/g) ?? []).length;
        if (n !== 1) synder.push(`${sti} (${n} kontroller)`);
      }
    }
    expect(synder).toEqual([]);
  });
});

describe("springlink", () => {
  const LAYOUT = readFileSync(join(process.cwd(), "src/app/layout.tsx"), "utf8");

  it("findes og peger på indholdet", () => {
    expect(LAYOUT).toMatch(/href="#indhold"/);
    expect(LAYOUT).toMatch(/Spring til indhold/);
  });

  /** Skjult indtil fokus — ellers koster det plads for alle andre. */
  it("er skjult, indtil det får fokus", () => {
    expect(LAYOUT).toMatch(/sr-only[^"]*focus:not-sr-only/);
  });

  it("står som det FØRSTE i body", () => {
    const body = LAYOUT.indexOf("<body");
    const link = LAYOUT.indexOf('href="#indhold"');
    const born = LAYOUT.indexOf("{children}");
    expect(link).toBeGreaterThan(body);
    expect(link).toBeLessThan(born);
  });

  /**
   * MÅLET SKAL FINDES PÅ HVER SIDE. Et springlink, der peger på et id, der
   * ikke er der, sender brugeren ingen steder — og det ses ikke, før nogen
   * prøver med et tastatur.
   */
  /**
   * PRØVEN HAVDE SELV HULLET, DEN SKULLE DÆKKE.
   *
   * Den kontrollerede kun sider, der HAVDE et `<main>` — og bestod derfor
   * tomt for dem, der ingen havde. Målt i produktion bagefter: `/kort/find`,
   * `/kort/tilmeld/[slug]`, `/mine-kort`, `/kort/[token]` og `/r/[slug]`
   * havde intet `<main>` overhovedet, så springlinket pegede på et id, der
   * ikke fandtes — netop på slutkundens egne sider.
   *
   * Dashboardet og admin er dækket af deres skaller (`DashboardShell`), så
   * prøven godtager et `<main>` i en `layout.tsx` eller en shell-komponent
   * på vejen op.
   */
  it("hver side har et skipmål — enten selv eller via sin skal", () => {
    /*
     * En `layout.tsx` giver et skipmål enten ved selv at tegne `<main>` eller
     * ved at bruge en skal, der gør — fx `DashboardShell`. Derfor slås
     * komponenterne op først, og layoutet tælles med, hvis det importerer en
     * af dem.
     */
    const skalFiler = filer("src/components")
      .filter((f) => /<main\b/.test(udenKommentarer(readFileSync(f, "utf8"))))
      .map((f) => f.split(/[\\/]/).pop()!.replace(/\.tsx$/, ""));

    const skaller = filer("src/app")
      .filter((f) => /layout\.tsx$/.test(f))
      .filter((f) => {
        const s = udenKommentarer(readFileSync(f, "utf8"));
        return /<main\b/.test(s) || skalFiler.some((k) => s.includes(k));
      })
      .map((f) => f.replace(/[\\/]layout\.tsx$/, ""));

    const uden: string[] = [];
    for (const sti of filer("src/app").filter((f) => /page\.tsx$/.test(f))) {
      const s = udenKommentarer(readFileSync(sti, "utf8"));
      if (/<main\b/.test(s)) continue;
      // Dækket af en skal længere oppe i træet?
      if (skaller.some((m) => sti.startsWith(m))) continue;
      uden.push(sti);
    }
    expect(
      uden,
      "siden har intet <main id=\"indhold\"> og ingen skal, der giver den et " +
        "— springlinket peger så på ingenting",
    ).toEqual([]);
  });

  it("hver <main> bærer id=\"indhold\"", () => {
    const uden: string[] = [];
    let antal = 0;
    for (const sti of filer("src")) {
      // UDEN KOMMENTARER: springlinkets egen forklaring i layout.tsx nævner
      // `<main>`, og prøven talte den med som en side uden id. Fjerde gang
      // samme fælde på to dage — se AGENTS.md.
      const s = udenKommentarer(readFileSync(sti, "utf8"));
      for (const m of s.matchAll(/<main\b([^>]*)>/g)) {
        antal++;
        if (!/id="indhold"/.test(m[1])) uden.push(sti);
      }
    }
    expect(antal, "der findes ingen <main> længere").toBeGreaterThan(10);
    expect(uden).toEqual([]);
  });
});
