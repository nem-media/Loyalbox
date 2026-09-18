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

/**
 * OG SÅ DEN ANDEN VEJ IND — BESTILLINGEN UDEN KONTO.
 *
 * Samme fejl, og den var værre: her er der ikke kun et design at miste, men
 * firmanavn, CVR, mail og linket, QR-koden skal pege på. Fortryd-adressen
 * pegede på `/bestil`, som sender en besøgende uden konto videre til
 * formularen — TOM, og med antallet sat tilbage til 1.
 *
 * DEN KUNNE IKKE LØSES SOM DEN INDLOGGEDE. Dér er ejerskabet et spørgsmål,
 * siden kan stille ("tilhører designet den butik, der er logget ind?"). Her er
 * der ingen at spørge, så et rent design-id i adressen ville være en nøgle til
 * en fremmed butiks logo og oplysninger for enhver, der gætter et UUID.
 * Derfor er nøglen SIGNERET — se `gendan-noegle.ts` og dens egen prøve.
 */
describe("fortryd-adressen uden konto", () => {
  const HANDLING = kilde("src/app/bestil/uden-konto/actions.ts");

  it("peger på formularen og ikke på /bestil", () => {
    expect(
      HANDLING,
      "et videresend i vejen ville kaste nøglen væk undervejs",
    ).toContain("/bestil/uden-konto?produkt=");
  });

  it("bærer både antallet og nøglen", () => {
    expect(HANDLING).toMatch(/antal=\$\{v\.antal\}/);
    expect(
      HANDLING,
      "uden nøglen er siden den samme tomme formular som før",
    ).toMatch(/gendan=\$\{gendanNoegle\}/);
  });

  /*
   * NØGLEN SKAL UDSTEDES AF OS OG IKKE SAMLES OP FRA NOGET, DER KOM IND.
   * Blev den lavet af et design-id fra formularen, ville signaturen bevise
   * præcis ingenting.
   */
  it("nøglen laves af designet, vi lige har gemt", () => {
    expect(HANDLING).toMatch(/lavGendanNoegle\(\{\s*designId: design\.id/);
  });
});

describe("det gemte logo hæftes kun på med nøglen", () => {
  const HANDLING = kilde("src/app/bestil/uden-konto/actions.ts");

  it("designet slås op MED ejerskabet i forespørgslen", () => {
    expect(HANDLING).toContain("laesGendanNoegle(");
    expect(
      HANDLING,
      "uden company_id i selve forespørgslen er nøglen kun et tjek, nogen kan glemme",
    ).toMatch(/\.eq\("id", gendan\.designId\)\s*\.eq\("company_id", gendan\.companyId\)/);
  });

  /*
   * FILEN SKAL KOPIERES OG IKKE DELES — det er 0037's fejl, bare ind ad en
   * anden dør. Den forladte kladde ryddes syv dage efter, OG DENS LOGOFIL
   * SLETTES FRA LAGERET; pegede den nye, BETALTE ordre på den samme fil,
   * ville kunden miste sit logo en uge efter købet.
   */
  it("logofilen kopieres til sin egen sti", () => {
    expect(HANDLING).toMatch(/storage\.from\("logos"\)\.copy\(fra, til\)/);
    expect(HANDLING).toContain("uden-konto/${crypto.randomUUID()}");
  });

  it("en kopi, der fejler, stopper bestillingen", () => {
    expect(
      HANDLING,
      "ellers trykkes et skilt UDEN det logo, kunden lige så i previewet",
    ).toMatch(/if \(error\) \{[\s\S]{0,400}?return svar\(\{ besked: GEMT_LOGO_FEJL \}\)/);
  });
});

describe("formularen tegnes, som kunden forlod den", () => {
  const SIDE = kilde("src/app/bestil/uden-konto/page.tsx");
  const FORM = kilde("src/app/bestil/uden-konto/bestil-form.tsx");

  it("siden læser nøglen og giver det fundne videre", () => {
    expect(SIDE).toContain("hentFortrudt(gendan)");
    expect(SIDE).toContain("fortrudt={fortrudt}");
  });

  /*
   * DE FEM FELTER, DER ER DYRE AT TASTE IGEN. Falder én af dem ud, fejler
   * ingenting — feltet står bare tomt, og det ligner en side, der er begyndt
   * forfra. Det er præcis dét, hele rettelsen handler om.
   */
  it("felterne starter i det, der stod i bestillingen", () => {
    for (const felt of [
      "fortrudt?.firmanavn",
      "fortrudt?.cvr",
      "fortrudt?.email",
      "fortrudt?.destination?.url",
      "fortrudt?.standerFarve",
    ]) {
      expect(FORM, felt + " skal lægges tilbage").toContain(felt);
    }
  });

  /*
   * SAMTYKKET LÆGGES ALDRIG TILBAGE. Et kryds er en aktiv handling og skal
   * blive ved med at være det — samme regel som i formular-hukommelse.
   */
  it("vilkårene skal krydses af igen", () => {
    expect(FORM).toContain("const [vilkaar, setVilkaar] = useState(false)");
  });

  it("nøglen og flaget følges med indsendelsen", () => {
    expect(FORM).toContain('name="gendan"');
    expect(FORM).toMatch(/name="behold_logo"[\s\S]{0,120}beholdLogo && !logoFil/);
  });

  /*
   * ET NYT VALG SKAL SLÅ DET GEMTE IHJEL. Uden dette ville en kunde, der
   * vælger en ny fil og fortryder den igen, få det GAMLE logo trykt — altså
   * noget andet end det, feltet og previewet siger.
   */
  it("et nyt eller fjernet logo slår genbrugen fra", () => {
    /*
     * UDSNITTENE SKAL HAVE EN BUND. Første udgave skar fra funktionens navn og
     * HELE VEJEN TIL FILENS SLUTNING, så fjernLogo lå med i udsnittet af
     * vaelgFil — og prøven bestod, da linjen blev fjernet fra den ene af dem.
     * Målt med en sabotage: den var den eneste af seks, der ikke blev fanget.
     * Prøven havde samme hul som den kode, den skulle beskytte.
     */
    const iValg = FORM.indexOf("async function vaelgFil");
    const iFjern = FORM.indexOf("function fjernLogo");
    const iEffekt = FORM.indexOf("useEffect(", iFjern);
    expect(iValg, "vaelgFil skal findes").toBeGreaterThan(-1);
    expect(iFjern, "fjernLogo skal ligge efter vaelgFil").toBeGreaterThan(iValg);
    expect(iEffekt, "effekten efter fjernLogo skal findes").toBeGreaterThan(iFjern);
    expect(FORM.slice(iValg, iFjern)).toContain("setBeholdLogo(false)");
    expect(FORM.slice(iFjern, iEffekt)).toContain("setBeholdLogo(false)");
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
