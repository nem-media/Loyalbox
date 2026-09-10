import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { koebSpaerre } from "./commerce";
import { getProduct } from "./constants";

/**
 * En spærret bestilling skal SIGE HVORFOR — ikke forsvinde.
 *
 * FEJLEN, DEN PASSER PÅ, blev fundet af en rigtig kunde på sin egen
 * standerside: der var ingen vej til et skilt og ingen forklaring. Boksen
 * returnerede `null`, når `koebSpaerre()` svarede `ikke-aabnet`, og så var
 * hele afsnittet væk. Det er stik imod grunden til, at funktionen svarer med
 * en GRUND frem for et boolean — reglen står i `AGENTS.md`: siden skal kunne
 * skrive noget brugbart i stedet for bare at skjule knappen.
 *
 * TO ÅRSAGER, ÉT SVAR. I dag kører produktionen med en testnøgle, så ingen
 * uden for `@loyalbox.test` kan købe. Den dag live åbnes, bliver svaret det
 * SAMME af en helt anden grund: tilkøbet "Ekstra stander" har ingen live-id'er
 * hos Stripe, så `canSell()` siger nej. Uden denne prøve ville boksen bare
 * mangle igen, uden at noget fejlede — og ingen ville forbinde de to ting.
 *
 * KILDEPRØVE, fordi komponenten er en serverkomponent, der slår op i basen.
 * Det, der skal holdes fast, er en GREN og ikke en returværdi.
 */

const KILDE = readFileSync(
  join(process.cwd(), "src", "components", "bestil-til-stander.tsx"),
  "utf8",
);

describe("bestillingen på standersiden", () => {
  /**
   * Det præcise, der gik galt: `ikke-aabnet` stod i den gren, der skjuler alt.
   * Prøven er skrevet på DEN sætning og ikke på fraværet af noget — så den
   * fejler, hvis nogen lægger den tilbage.
   */
  it("skjuler ikke boksen, fordi købet er spærret", () => {
    const skjuler = KILDE.match(/if \([^)]*\) \{\s*return null;/);
    expect(skjuler, "der skal stadig være en gren, der skjuler boksen").toBeTruthy();
    expect(skjuler![0]).not.toContain("ikke-aabnet");
  });

  /**
   * `ingen-virksomhed` SKAL stadig skjule den. Det svar kommer, når en ADMIN
   * kigger på en kundes side, og admin må ikke kunne bestille på kundens vegne
   * — se [[loyalsum-admin-support]]: admin forbliver admin.
   */
  it("skjuler den stadig, når der ingen virksomhed er", () => {
    expect(KILDE).toMatch(/spaerre === "ingen-virksomhed"[\s\S]{0,60}return null;/);
  });

  /** Der skal stå noget, kunden kan handle på — ikke bare "nej". */
  it("henviser til en mail, så et salg ikke går tabt imens", () => {
    expect(KILDE).toContain("Selvbetjent bestilling er ikke åbnet endnu");
    expect(KILDE).toContain("mailto:${COMPANY.email}");
  });

  /**
   * ORDLYDEN MÅ IKKE NÆVNE ÅRSAGEN. De to årsager giver samme svar, og en
   * tekst om at "vi sætter betaling op" ville være løgn den dag, betalingen
   * ER åben og det er varen, der mangler sine id'er.
   */
  it("nævner ikke hvorfor, for grunden kan være to forskellige", () => {
    const boks = KILDE.slice(KILDE.indexOf("Selvbetjent bestilling"));
    for (const ord of ["betaling op", "endnu ikke klar", "testtilstand"]) {
      expect(boks.slice(0, 700), ord).not.toContain(ord);
    }
  });

  /**
   * Tilkøbet er dét, boksen sælger. Kan det ikke sælges i den aktuelle
   * tilstand, ER svaret `ikke-aabnet` — og så er beskeden det eneste, kunden
   * ser. Prøven binder de to sammen, så de ikke kan komme til at være uenige.
   */
  it("spærren siger ikke-aabnet for en almindelig kunde i testtilstand", () => {
    const svar = koebSpaerre(
      { email: "nem@nemmedia.dk", company: { cvr: "37811769" } },
      getProduct("ekstra-stander"),
    );
    expect(svar).toBe("ikke-aabnet");
  });
});
