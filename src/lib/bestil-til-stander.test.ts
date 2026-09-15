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

/**
 * ET SKILT MERE ER IKKE EN ADRESSE MERE.
 *
 * Boksen sagde "Samme udseende, ny QR-kode" under "Eller genbrug et design,
 * du har" — og det var forkert på den dyre måde. Begge veje herfra bærer
 * samme `?stand=`, så skiltet trykkes med DENNE standers kode og peger på den
 * side, kunden allerede har sat op. Overskriften to linjer længere oppe siger
 * ligefrem det modsatte af undersætningen.
 *
 * DET ER IKKE KUN EN SJUSKEFEJL. Statistikken deles pr. QR-adresse
 * (`stand_id` → `grupperPrAdresse()`) og aldrig pr. skilt. En butik, der
 * ville have to steder talt hver for sig, kunne læse teksten som at et
 * genbestilt skilt gav dem en ny adresse — og så ville tallene lande i samme
 * kasse, uden at nogen opdagede det. Skal to steder tælles hver for sig, er
 * det en adresse mere (`adresseSpaerre()`), ikke et skilt mere.
 */
describe("hvad et genbestilt skilt peger på", () => {
  it("lover ikke en ny QR-kode, når koden er den samme", () => {
    expect(KILDE).not.toMatch(/ny QR-kode/);
  });

  it("siger, at koden er den samme som standerens egen", () => {
    const i = KILDE.indexOf("Eller genbrug et design");
    expect(i).toBeGreaterThan(-1);
    expect(KILDE.slice(i, i + 900)).toMatch(/samme QR-kode/i);
  });

  /**
   * DET ER `?stand=` DER GØR DET SANDT. Forsvinder den fra genbrugslinket,
   * kan /bestil ikke vide hvilken kode der skal trykkes — og så bliver
   * teksten en påstand i stedet for en beskrivelse.
   */
  it("bærer standeren med på begge veje ud af boksen", () => {
    expect(KILDE).toMatch(/const grund = `\/bestil\?produkt=\$\{[^}]+\}&stand=\$\{standId\}`/);
    // Genbrugslinket bygger videre på præcis den adresse.
    expect(KILDE).toContain("`${grund}&design=${d.id}`");
  });
});

/**
 * DESIGNLISTEN KAN IKKE GÆTTE, NÅR DER ER FLERE ADRESSER.
 *
 * "Bestil flere af denne" sender til /bestil UDEN en `?stand=`, og
 * `enesteAdresseFor()` gætter kun, når der er præcis ÉN adresse. Med to får
 * ordren `stand_id: null`, og produktionen må ringe og spørge, hvilken kode
 * der skal trykkes. Det var harmløst, dengang én adresse var alt man kunne
 * have — efter at en butik mere kan KØBES, er det en fælde, der venter på den
 * første kæde.
 */
describe("designlisten med flere QR-adresser", () => {
  const LISTE = readFileSync(
    join(process.cwd(), "src", "app", "dashboard", "standere", "design-liste.tsx"),
    "utf8",
  );

  it("tæller adresserne, før den tilbyder en genbestilling", () => {
    expect(LISTE).toContain("flereAdresser");
    expect(LISTE).toMatch(/from\("stands"\)/);
  });

  it("sender kunden til standeren i stedet for at gætte", () => {
    const i = LISTE.indexOf("flereAdresser ? (");
    expect(i).toBeGreaterThan(-1);
    // KUN grenen med flere adresser — `else` har med vilje stadig linket.
    const gren = LISTE.slice(i, LISTE.indexOf(") : (", i));
    expect(gren).not.toContain("/bestil?produkt=");
    expect(gren).toMatch(/flere QR-adresser/i);
  });
});
