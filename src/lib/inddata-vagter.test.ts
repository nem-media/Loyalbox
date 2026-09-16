import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  laesValg,
  EARN_MODEL_LABELS,
  PROGRAM_STATUS_LABELS,
  REWARD_TYPE_LABELS,
} from "./loyalty/constants";

/**
 * `as` ER EN PÅSTAND, IKKE EN KONTROL.
 *
 * Der stod `String(formData.get("x")) as EarnModel` tretten steder.
 * TypeScript tror på påstanden, og hvad der FAKTISK kom ind, afgøres først af
 * databasen — som enten afviser med en rå PostgreSQL-besked til butikken,
 * eller, dér hvor svaret ikke blev læst, ikke gør noget som helst
 * (`setOrderStatus`, #212).
 *
 * Etiket-kortene er i forvejen den fulde liste over lovlige værdier, og de
 * bruges til at TEGNE valgmulighederne. Så kan de også bruges til at prøve
 * dem: én kilde, og en ny værdi kan ikke glide ind uden en etiket.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

function filer(mappe: string): string[] {
  const ud: string[] = [];
  for (const navn of readdirSync(mappe)) {
    const sti = join(mappe, navn);
    if (statSync(sti).isDirectory()) ud.push(...filer(sti));
    else if (/\.tsx?$/.test(navn) && !navn.includes(".test.")) ud.push(sti);
  }
  return ud;
}

describe("laesValg tager kun kendte værdier", () => {
  it("giver værdien igennem, når den står på listen", () => {
    expect(laesValg("per_visit", EARN_MODEL_LABELS, "per_purchase")).toBe(
      "per_visit",
    );
  });

  it("falder tilbage på noget ukendt", () => {
    for (const skidt of ["", "drop table", "PER_VISIT", null]) {
      expect(
        laesValg(skidt as never, EARN_MODEL_LABELS, "per_purchase"),
        String(skidt),
      ).toBe("per_purchase");
    }
  });

  /**
   * ARVEDE EGENSKABER TÆLLER IKKE MED. `"toString" in objekt` er sandt for et
   * hvilket som helst objekt, så en formular med `status=toString` ville
   * ellers slippe igennem som en gyldig værdi.
   */
  it("lader sig ikke narre af noget, alle objekter har", () => {
    for (const arvet of ["toString", "constructor", "__proto__", "valueOf"]) {
      expect(
        laesValg(arvet, PROGRAM_STATUS_LABELS, "draft"),
        arvet,
      ).toBe("draft");
    }
  });

  /**
   * STANDARDVÆRDIEN MÅ IKKE SNÆVRE TYPEN. Uden `NoInfer` udleder TypeScript
   * `T` af standarden, og så bliver returtypen den ene streng — hvorefter en
   * senere `=== "none"` ser ud som en sammenligning, der aldrig kan være sand.
   * Prøven her ville ikke oversætte, hvis det skete.
   */
  it("bevarer hele unionen som returtype", () => {
    const v = laesValg("gift", REWARD_TYPE_LABELS, "free_product");
    // Begge grene skal kunne oversættes.
    expect(v === "none" || v === "gift").toBe(true);
  });
});

describe("ingen typepåstande på inddata i loyalitetsmodulet", () => {
  /**
   * Fejeprøven. Den fanger den NÆSTE `as`, ikke de tretten, der er rettet —
   * og det er hele pointen: den slags skrives et par gange om året, og `as`
   * ser ud som en typeoplysning frem for som en påstand om noget, der kommer
   * udefra.
   */
  it("formulardata kastes ikke til en enum", () => {
    const synder: string[] = [];
    for (const sti of filer("src/app")) {
      const kode = udenKommentarer(readFileSync(sti, "utf8"));
      const udtryk =
        /(formData\.get|searchParams\.get)\([^)]*\)[^;\n]{0,80}\bas\s+(?!const\b|never\b)(\w+)/g;
      for (const m of kode.matchAll(udtryk)) {
        const linje = kode.slice(0, m.index).split("\n").length;
        synder.push(`${sti}:${linje} -> as ${m[2]}`);
      }
    }
    expect(
      synder,
      "brug `laesValg(...)` med etiket-kortet i stedet for `as` — " +
        "listen er i forvejen den fulde sandhed om lovlige værdier",
    ).toEqual([]);
  });
});

describe("checkout giver ikke et betalingslink for en ordre, der ikke blev gemt", () => {
  /**
   * Indsættelsen stod uden fejltjek, og betalingslinket blev returneret
   * nedenfor uanset. Kunden kunne betale for en ordre, der ikke fandtes —
   * admin havde intet at pakke. Webhooken opdager det i dag, men FØRST efter
   * pengene er taget; her er de ikke taget endnu.
   *
   * Samme fejl som i `bestilUdenKonto` (#221), i søsterkodestien.
   */
  const KILDE = udenKommentarer(
    readFileSync(join(process.cwd(), "src/app/api/checkout/route.ts"), "utf8"),
  );

  it("læser svaret på ordreindsættelsen", () => {
    const i = KILDE.indexOf('from("orders").insert');
    expect(i).toBeGreaterThan(-1);
    expect(KILDE.slice(Math.max(0, i - 120), i)).toMatch(
      /const \{ error: ordreFejl \}/,
    );
  });

  it("afvisningen står FØR betalingslinket gives", () => {
    const afvis = KILDE.indexOf("if (ordreFejl)");
    const url = KILDE.indexOf("url: session.url");
    expect(afvis).toBeGreaterThan(-1);
    expect(url).toBeGreaterThan(-1);
    expect(afvis).toBeLessThan(url);
  });

  it("siger at der ikke er opkrævet noget", () => {
    const i = KILDE.indexOf("if (ordreFejl)");
    expect(KILDE.slice(i, i + 700)).toMatch(/ikke blevet opkrævet/);
  });
});
