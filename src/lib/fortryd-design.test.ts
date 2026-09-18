import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * FORTRYDER KUNDEN HOS STRIPE, SKAL DESIGNET FØLGE MED HJEM.
 *
 * Designet gemmes i `/api/checkout` — FØR betalingssessionen oprettes — så det
 * ligger i basen med et id, så snart kunden ser Stripes side. Admin kunne
 * derfor se logo og farvevalg på en ordre, kunden havde fortrudt.
 *
 * Kunden kunne ikke. `cancel_url` bar kun vare og antal, så et tryk på „Gå
 * tilbage“ landede dem på en TOM designer: logoet skulle uploades igen, og
 * farverne vælges igen. Arbejdet var i behold hele tiden — der var bare ingen
 * vej tilbage til det. Meldt af brugeren 2026-09-18.
 *
 * DEN STILLE MÅDE DET KAN GÅ I STYKKER PÅ er, at nogen retter i `cancel_url`
 * og taber `design`-parameteren. Intet fejler: kunden får en tom side, og det
 * ligner bare en side, der er begyndt forfra. Derfor denne prøve.
 *
 * DEN ANDEN HALVDEL ER ORDLYDEN. `GenbestilDesign` skriver „Du bestiller flere
 * af“, og dét er sandt for en genbestilling, men en løgn over for en, der lige
 * har fortrudt og aldrig har købt ét. `fortrudt=1` skifter sætningen. Falder
 * flaget ud, står der noget forkert — uden at noget fejler.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

describe("fortryd-adressen tager designet med", () => {
  const RUTE = kilde("src/app/api/checkout/route.ts");

  it("cancel_url bærer design-id'et", () => {
    expect(
      RUTE,
      "uden det lander kunden på en tom designer og skal uploade logoet igen",
    ).toContain("design=${design.id}");
  });

  it("cancel_url bærer fortrudt-flaget", () => {
    expect(
      RUTE,
      "uden det skriver siden „Du bestiller flere af“ til en, der intet har købt",
    ).toContain("fortrudt=1");
  });

  /*
   * KUN NÅR DER ER ET DESIGN. Et produkt uden fysisk skilt har ingen, og
   * `design` er da null — `&design=null` ville sende kunden til en side, der
   * ikke kan finde noget, og som så viser den almindelige bestilling med en
   * adresse, der lyver om, hvad den peger på.
   */
  it("kun når der FINDES et design", () => {
    expect(RUTE).toMatch(/design \?\s*`&design=\$\{design\.id\}&fortrudt=1`/);
  });
});

describe("siden og blokken kender flaget", () => {
  it("bestillingssiden læser fortrudt og giver det videre", () => {
    const SIDE = kilde("src/app/bestil/page.tsx");
    expect(SIDE).toContain("fortrudt,");
    expect(SIDE).toContain('fortrudt={fortrudt === "1"}');
  });

  /*
   * De to sætninger, der ellers ville være usande. Prøven holder på, at BEGGE
   * er betingede — den første blev rettet med det samme, den anden blev
   * opdaget bagefter, og det er præcis den slags, der bliver glemt.
   */
  it("begge sætninger om „sidst“ er betingede", () => {
    const BLOK = kilde("src/components/genbestil-design.tsx");
    expect(BLOK).toContain('fortrudt ? "Dit design er gemt"');
    // Linjeskift kan være CRLF, så mønstret og ikke en fast streng.
    expect(BLOK).toMatch(/\{fortrudt\s+\? "Du vælger kun antallet\."/);
  });
});
