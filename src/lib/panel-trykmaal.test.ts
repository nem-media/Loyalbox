import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * PANELETS TRYKMÅL OG NØGLETALLENES FLUGT.
 *
 * To ting, som blev fundet ved at MÅLE panelet på 390, 768, 1024 og 1440 og
 * ikke ved at kigge på det — og som begge ville komme tavst tilbage.
 *
 * 1. TRYKMÅLENE. `.trykmaal` blev lavet til det offentlige site og kom
 *    aldrig ind i panelet; hver "Se alle", "Se feedback →" og "Log ud" stod
 *    på 16-28 px på en berøringsskærm. De to nye varianter findes, fordi
 *    `.trykmaal` ikke passer alle steder: `-taet` til et link i en række,
 *    der ikke må vokse (polstring plus en negativ margen, der tager den ud
 *    af layoutet igen), og `-min` til en knap, der ALLEREDE har polstring.
 *
 *    DEN FARLIGE RETTELSE ER AT "RYDDE OP": sætter nogen `padding-block: 0`
 *    på `.trykmaal-min` ved siden af de to andre, fjernes knappens EGEN
 *    polstring på desktop — det så jeg selv gøre i første udkast, og det
 *    ville ramme hver eneste knap, klassen sidder på, på den skærm den er
 *    rigtig på i forvejen. Og fjernes `.trykmaal-taet`s negative margen,
 *    ser alt stadig rigtigt ud på en mus, mens hver sektionsoverskrift på
 *    en telefon bliver 20 px højere.
 *
 * 2. NØGLETALLENE. Fire kort i en række læses som en RÆKKE — øjet springer
 *    fra tal til tal. Etiketten "BELØNNINGER INDLØST" brød i to linjer, og
 *    dét ene tal stod 17 px lavere end de tre andre; kort uden underlinje
 *    fik deres udviklingspil en linje højere end naboernes. Kuren er
 *    `sm:min-h-[2.8em]` på etiketten og `mt-auto` på bundgruppen, og
 *    skelettet SKAL reservere det samme — ellers hopper siden, i det øjeblik
 *    tallene kommer, hvilket er præcis dét, et skelet findes for at undgå.
 *
 * Alle fem regler ligner noget, man kan fjerne, og ingen af dem fejler
 * højlydt. Derfor står de her.
 */

const CSS = "src/app/globals.css";
const STAT = "src/components/ui/stat.tsx";
const SKELET = "src/components/ui/skelet.tsx";

/** Kilden uden kommentarer — ellers består prøven på sin egen forklaring. */
const uden = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/**
 * Kroppen af en regel i den berøringsbetingede blok.
 *
 * Grænsen slås OP frem for at stå to steder: kommer der en tablet-bredde
 * mere, må prøven ikke være dét, der holder den tilbage — men de tre
 * klasser skal blive ved med at dele den ene, de har.
 */
const GRAENSE = "@media (max-width: 1023.98px), (pointer: coarse)";

function beroeringsblokke(css: string): string[] {
  const ud: string[] = [];
  let i = css.indexOf(GRAENSE);
  while (i !== -1) {
    const start = css.indexOf("{", i);
    let dybde = 0;
    for (let j = start; j < css.length; j++) {
      if (css[j] === "{") dybde++;
      else if (css[j] === "}") {
        dybde--;
        if (dybde === 0) {
          ud.push(css.slice(start + 1, j));
          break;
        }
      }
    }
    i = css.indexOf(GRAENSE, i + 1);
  }
  return ud;
}

/** Erklæringerne i `.navn` inden for en given tekst. */
function regel(tekst: string, navn: string): string | null {
  const m = tekst.match(
    new RegExp(`(^|[,}])\\s*\\.${navn}\\s*\\{([^}]*)\\}`, "m"),
  );
  return m ? m[2] : null;
}

describe("trykmål i panelet", () => {
  const css = uden(CSS);
  const blokke = beroeringsblokke(css);

  it("de tre varianter deler ÉN grænse", () => {
    for (const navn of ["trykmaal", "trykmaal-taet", "trykmaal-min"]) {
      const traef = blokke.filter((b) => regel(b, navn) !== null);
      expect(traef, `.${navn} skal stå i den berøringsbetingede blok`).toHaveLength(1);
    }
  });

  it("`.trykmaal-taet` tager sin egen polstring ud af layoutet igen", () => {
    const blok = blokke.find((b) => regel(b, "trykmaal-taet"))!;
    const krop = regel(blok, "trykmaal-taet")!;
    const pad = krop.match(/padding-block:\s*([\d.]+)rem/);
    const mar = krop.match(/margin-block:\s*-([\d.]+)rem/);
    expect(pad, "polstringen er dét, der gør feltet større").not.toBeNull();
    expect(mar, "uden den negative margen vokser rækken").not.toBeNull();
    expect(mar![1]).toBe(pad![1]);
  });

  it("`.trykmaal-min` rører ALDRIG polstringen", () => {
    /* Hverken i grundreglen eller i den berøringsbetingede: knappen har sin
       egen, og en nulstilling ville flade den ud på en mus — altså rette
       noget på telefonen ved at ødelægge det på desktop. */
    for (const tekst of [css, ...blokke]) {
      const krop = regel(tekst, "trykmaal-min");
      if (krop) expect(krop).not.toMatch(/padding/);
    }
    const blok = blokke.find((b) => regel(b, "trykmaal-min"))!;
    expect(regel(blok, "trykmaal-min")!).toMatch(/min-height/);
  });

  it("grundreglen nulstiller kun dem, der SKAL nulstilles", () => {
    /* `.trykmaal` og `-taet` skal stå på nul uden for grænsen, ellers bærer
       de deres polstring med over på en mus, hvor markøren er et punkt.

       GRUNDREGLERNE FINDES VED AT FJERNE MEDIABLOKKENES KROPPE og ikke ved
       at tage teksten før den første: `.trykmaal-taet` er erklæret EFTER
       den blok, `.trykmaal` hører til, og et udsnit fra toppen ville derfor
       melde den savnet. Prøven fejlede på præcis dét, første gang den kørte. */
    const grund = blokke.reduce((acc, b) => acc.replace(b, ""), css);
    for (const navn of ["trykmaal", "trykmaal-taet"]) {
      expect(regel(grund, navn), `.${navn} mangler sin grundregel`).toMatch(
        /padding-block:\s*0/,
      );
    }
  });
});

describe("nøgletalskort flugter i en række", () => {
  const stat = uden(STAT);
  const skelet = uden(SKELET);

  /** Reserveringen skrives ét sted og aflæses begge steder. */
  const RESERVERING = /sm:min-h-\[2\.8em\]/;

  it("etiketten reserverer to linjer, fra og med `sm`", () => {
    expect(stat).toMatch(RESERVERING);
    /* `em` og ikke `rem`: `.etiket` er 12 px på en telefon og 11 på desktop,
       så et fast tal ville passe ét af stederne. */
    expect(stat).not.toMatch(/min-h-\[[\d.]+rem\]/);
  });

  it("skelettet reserverer NØJAGTIG det samme", () => {
    expect(
      skelet,
      "et skelet med en anden højde end kortet får siden til at hoppe",
    ).toMatch(RESERVERING);
    /* Og i etikettens egne mål — derfor `.etiket` på beholderen. */
    expect(skelet).toMatch(/etiket sm:min-h-\[2\.8em\]/);
  });

  it("kun fra `sm`, hvor kortene faktisk har en nabo", () => {
    /* Hvert nøgletalsgitter i huset står i én spalte under 640 px. Et kort
       uden nabo har ikke noget at flugte med, og reserveringen ville være
       ren luft på den skærm, hvor der er mindst af den. */
    for (const kilde of [stat, skelet]) {
      expect(kilde).not.toMatch(/(?<!sm:)min-h-\[2\.8em\]/);
    }
  });

  it("underlinje og udvikling hænger i bunden", () => {
    expect(stat, "uden `flex flex-col` gør `mt-auto` ingenting").toMatch(
      /flex flex-col/,
    );
    expect(stat).toMatch(/className="mt-auto"/);
  });
});
