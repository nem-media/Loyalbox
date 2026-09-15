import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BETALTE_ORDRE_STATUSSER, sessionErBetalt } from "./commerce";

/**
 * ORDREN SKAL MARKERES BETALT AD ALLE VEJE.
 *
 * FEJLEN, der blev fundet 8. september 2026 med et rigtigt testkøb af
 * LoyalSum Komplet: i `checkout.session.completed` sluttede to af de tre
 * grene, der sætter kundeforholdet, med `break`. Et `break` i en `switch`
 * forlader hele `case`en — også ordreopdateringen længere nede. Ordren blev
 * derfor kun markeret betalt for en BESTÅENDE kunde, der købte en
 * ENGANGSVARE, og stod som `new` ("oprettet, aldrig betalt") for ethvert
 * abonnementskøb og enhver førstegangskøber.
 *
 * Det kostede: ordren talte ikke med som betalt i admin, nåede aldrig
 * `needs_onboarding` og kom derfor aldrig i produktion, leveringsadressen
 * fandtes kun hos Stripe — og fordi kundebekræftelsens idempotens hænger på
 * statussen `new`, ville en gentaget webhook sende bekræftelsen igen.
 *
 * PRØVES I KILDEN, og det er ikke dovenskab: fejlen er en KONTROLSTRØM i en
 * rutehandler, der taler med både Stripe og Supabase. Der er intet at kalde
 * og ingen returværdi at se på — udfaldet er, hvor programmet ender henne.
 * Præcis som de to kildeprøver i `gennemtest-fejl.test.ts`.
 *
 * Fejlen kom ind med `71292d1` (21. august 2026) og lå i produktion i 18
 * dage. Den blev ikke fanget af gennemtesten 7. september, fordi netop den
 * ene vej, der virkede, var den, der blev afprøvet.
 */

const KILDE = readFileSync(
  join(process.cwd(), "src/app/api/stripe/webhook/route.ts"),
  "utf8",
);

/**
 * Kroppen af betalingsgrenen — frem til næste `case`.
 *
 * ANKRET PÅ DEN SIDSTE ETIKET I GRUPPEN. `completed` og
 * `async_payment_succeeded` deler én krop, så et snit fra den FØRSTE etiket
 * til "næste `case`" ville ramme den anden etiket og give en tom streng —
 * hvorefter hver eneste prøve herunder ville bestå på ingenting. Det skete,
 * da den anden etiket blev tilføjet.
 */
const SIDSTE_ETIKET = 'case "checkout.session.async_payment_succeeded"';

function betalingsGrenen(): string {
  const start = KILDE.indexOf(SIDSTE_ETIKET);
  expect(
    start,
    "betalingsgrenens case-etiketter findes ikke længere",
  ).toBeGreaterThan(-1);

  const næste = KILDE.indexOf('case "', start + SIDSTE_ETIKET.length);
  const krop = KILDE.slice(start, næste === -1 ? undefined : næste);

  // Selve fælden ovenfor: en tom krop må aldrig kunne se ud som en bestået prøve.
  expect(krop.length, "betalingsgrenens krop er tom").toBeGreaterThan(500);
  return krop;
}

/**
 * Grenen UDEN kommentarer.
 *
 * EN KILDEPRØVE MÅ IKKE KUNNE BESTÅ PÅ EN KOMMENTAR. Filen her er tæt
 * kommenteret, og flere af kommentarerne citerer med vilje netop den kode, de
 * forklarer — `.eq("status", "new")` står ordret i begrundelsen lige over
 * kaldet. En prøve, der leder efter det mønster i den rå tekst, ville derfor
 * bestå, også hvis kaldet selv blev slettet, og forklaringen blev stående.
 *
 * Opdaget ved at sabotere koden med vilje og se prøven bestå alligevel. Det er
 * dén kontrol, der afgør, om en kildeprøve er værd at have.
 */
function betalingsGrenenUdenKommentarer(): string {
  return betalingsGrenen()
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1");
}

describe("sessionErBetalt", () => {
  it("tager de to statusser, hvor der ikke er noget at vente på", () => {
    expect(sessionErBetalt("paid")).toBe(true);
    // Nul kroner — fx en fuld rabat. Der kommer ingen betaling.
    expect(sessionErBetalt("no_payment_required")).toBe(true);
  });

  /** `unpaid` er Klarna og de forsinkede bankmetoder. Svaret kommer senere. */
  it("afviser alt andet", () => {
    for (const s of ["unpaid", "", null, undefined, "PAID"]) {
      expect(sessionErBetalt(s as string), String(s)).toBe(false);
    }
  });
});

describe("webhooken markerer ordren betalt ad alle veje", () => {
  const gren = betalingsGrenen();

  const kædeStart = gren.indexOf("if (erAbonnement");
  const ordreOpdatering = gren.indexOf('status: "needs_onboarding"');

  it("har både grenkæden og ordreopdateringen", () => {
    expect(
      kædeStart,
      "grenen, der sætter kundeforholdet, er væk",
    ).toBeGreaterThan(-1);
    expect(ordreOpdatering, "ordreopdateringen er væk").toBeGreaterThan(-1);
  });

  /**
   * VENDT OM 2026-09-15 — OG DET ER EN STRAMNING, IKKE EN LEMPELSE.
   *
   * Prøven krævede før, at opdateringen lå EFTER grenkæden, og vogtede så
   * over, at der ikke stod et `break` imellem dem. Det beskyttede mod fejlen
   * fra 21. august ved at holde øje med afstanden mellem to steder.
   *
   * Ligger opdateringen FØR kæden, kan et `break` i en gren slet ikke springe
   * forbi den — så er hele fejlklassen umulig i stedet for bevogtet. Flytningen
   * skete af en anden grund: `foersteGang` skal være resultatet af den
   * BETINGEDE opdatering og ikke et opslag fra tidligere i behandlingen, for
   * ellers kan to samtidige leverancer af samme hændelse begge kalde sig den
   * første. De to hensyn peger heldigvis samme vej.
   */
  it("opdaterer ordren FØR kundeforholdet, så ingen gren kan springe forbi", () => {
    expect(ordreOpdatering).toBeLessThan(kædeStart);
  });

  /**
   * DEN OPRINDELIGE FEJL, PRØVET FORFRA.
   *
   * Spørgsmålet er ikke længere, om der står et `break` mellem to steder, men
   * om opdateringen overhovedet kan nås.
   */
  it("forlader ikke case'en, før ordren er markeret betalt", () => {
    const foer = gren.slice(0, ordreOpdatering);
    /*
     * Den tidlige afvisning af en UBETALT session har det ene legitime
     * `break` — dér er der med vilje ikke noget at markere endnu, for pengene
     * er ikke faldet. Snittet begynder EFTER netop det, så prøven handler om
     * vejen fra "betalingen er bekræftet" til "ordren er markeret".
     */
    const ubetalt = foer.indexOf("stripe-afventer-betaling");
    expect(ubetalt, "afvisningen af en ubetalt session er væk").toBeGreaterThan(
      -1,
    );
    const efterUbetalt = foer.slice(
      foer.indexOf("break;", ubetalt) + "break;".length,
    );
    expect(
      efterUbetalt,
      "et `break` før ordreopdateringen springer ud af hele case'en, og ordren " +
        "bliver aldrig markeret betalt — det var fejlen fra 21. august 2026.",
    ).not.toMatch(/\bbreak\s*;/);
  });

  it("bruger én if/else if-kæde og ikke løse if-blokke", () => {
    // De tre udfald for kundeforholdet udelukker hinanden. Løse `if`-blokke
    // ville lade to af dem ramme samme køb.
    const kæde = gren.slice(kædeStart);
    expect(kæde.match(/}\s*else if \(/g)?.length ?? 0).toBeGreaterThanOrEqual(2);
  });

  /**
   * FØRSTE GANG AFGØRES AF SKRIVNINGEN, IKKE AF ET TIDLIGERE OPSLAG.
   *
   * `foersteGang` stod som `ordreDest?.status === "new"` — læst mange kald
   * tidligere, mens opdateringen var ubetinget. To leverancer af samme
   * hændelse kunne derfor begge læse `new`, begge sende en kundebekræftelse og
   * begge trække fra lageret. Målt mod den kørende base: tre samtidige
   * leverancer gav tre "første gange"; med den betingede opdatering én.
   */
  it("afgør første gang med en betinget opdatering", () => {
    // UDEN kommentarer: begrundelsen over kaldet citerer selv `.eq("status",
    // "new")`, og prøven ville ellers bestå på forklaringen alene.
    const kode = betalingsGrenenUdenKommentarer();
    expect(kode).toMatch(/\.eq\("status",\s*"new"\)/);
    expect(kode).toContain(
      "const foersteGang = Boolean(opdateretOrdre?.length)",
    );
    expect(kode).not.toMatch(/foersteGang\s*=\s*ordreDest\?\.status/);
  });

  it("siger fra, når ordreopdateringen ikke rammer en række", () => {
    // En `update` mod PostgREST svarer glad, når den rammer nul rækker. På
    // dette tidspunkt ER pengene hjemme, så en ordre, vi ikke kan finde, er
    // en anomali og ikke en stilhed.
    const efter = gren.slice(ordreOpdatering);
    expect(efter).toMatch(/\.select\("id"\)/);
    expect(efter).toMatch(/noterFejl\(/);
  });

  /**
   * PENGENE SKAL VÆRE FALDET, FØR DER GIVES NOGET.
   *
   * `checkout.session.completed` betyder kun, at kunden nåede igennem
   * formularen. Med en betalingsmetode med forsinket svar — Klarna er slået
   * til på kontoen — afsluttes sessionen `unpaid`, og svaret kommer først
   * bagefter. Uden kontrollen gav webhooken adgang, oprettede standeren,
   * markerede ordren betalt og sendte begge mails for en betaling, der endnu
   * ikke var faldet.
   *
   * Usynlig i testtilstand: testkortet svarer `paid` med det samme.
   */
  it("kontrollerer betalingen FØR der gives adgang", () => {
    const kontrol = gren.indexOf("sessionErBetalt(");
    expect(kontrol, "kontrollen af payment_status er væk").toBeGreaterThan(-1);

    // Før ALT, der giver noget: designet, kundeforholdet og ordren.
    expect(kontrol).toBeLessThan(gren.indexOf("frontfarve_betalt"));
    expect(kontrol).toBeLessThan(kædeStart);
    expect(kontrol).toBeLessThan(ordreOpdatering);
  });

  /** Den forsinkede bekræftelse skal kunne gøre præcis det samme arbejde. */
  it("behandler den forsinkede betaling som en betaling", () => {
    expect(KILDE).toMatch(/case "checkout\.session\.async_payment_succeeded":/);
    // Samme krop — altså ingen `break` mellem de to etiketter.
    const a = KILDE.indexOf('case "checkout.session.completed":');
    const b = KILDE.indexOf(SIDSTE_ETIKET);
    expect(b).toBeGreaterThan(a);
    expect(KILDE.slice(a, b)).not.toMatch(/\bbreak\s*;/);
  });

  /**
   * ALARMÉR ALDRIG FRA EN STI, EN UDEFRAKOMMENDE KAN UDLØSE FRIT.
   * En ubetalt session er ikke en fejl — det er den normale vej for en
   * forsinket betaling — og `noterFejl` sender mail. Enhver besøgende kunne
   * ellers udløse en mailbombe ved at vælge Klarna.
   */
  it("alarmerer ikke på en ubetalt session", () => {
    // KUN selve spærren, som slutter med sit eget `break`. Længere nede
    // ligger der legitime `noterFejl` — en fejlet standeroprettelse er en
    // rigtig fejl og skal alarmere. Prøven må ikke ramme dem.
    const fra = gren.indexOf("sessionErBetalt(");
    const spaerren = gren.slice(
      fra,
      gren.indexOf("break;", fra) + "break;".length,
    );

    expect(spaerren).toMatch(/noterKoersel\(/);
    expect(spaerren).not.toMatch(/noterFejl\(/);
  });

  it("sætter ordren i en status, der tæller som betalt", () => {
    // Bindingen tilbage til den liste, admin faktisk tæller på. Skiftes
    // statussen her til noget, der ikke står i listen, forsvinder ordren fra
    // "betalte ordrer i alt" uden at noget fejler.
    expect(BETALTE_ORDRE_STATUSSER).toContain("needs_onboarding");
  });
});

/**
 * ET ABONNEMENT SKAL KUNNE FINDE SIN VIRKSOMHED — OGSÅ ÅR EFTER KØBET.
 *
 * `sub.metadata.company_id` er et øjebliksbillede fra oprettelsen og bliver
 * aldrig rettet af sig selv. Peger den på en række, der siden er flyttet
 * eller lagt sammen med en anden, ramte opdateringen nul rækker og fejlede
 * uden at fejle. Konsekvensen er ikke kosmetisk: en MISLYKKET BETALING
 * ville aldrig suspendere kunden, og `stripe_status` ville stå og lyve.
 *
 * Det var ikke teoretisk — det opstod, da to virksomheder på samme bruger
 * blev lagt sammen i hånden 14. september 2026, og abonnementets metadata
 * blev stående og pegede på den slettede.
 */
describe("abonnementshændelser finder virksomheden", () => {
  const RUTE = readFileSync(
    join(process.cwd(), "src/app/api/stripe/webhook/route.ts"),
    "utf8",
  );

  it("slår virksomheden OP frem for at opdatere i blinde", () => {
    /*
      Den gamle form var `.eq(noegle[0], noegle[1])` på et par, der kom
      direkte fra metadataen — uden at nogen så efter, om den ramte noget.
    */
    expect(RUTE).not.toMatch(/\.eq\(noegle\[0\], noegle\[1\]\)/);
    expect(RUTE).toMatch(/let firmaId: string \| null = null;/);
  });

  it("falder tilbage på abonnements-id'et", () => {
    // Det står på virksomheden selv og kan ikke blive forældet som
    // metadataen.
    expect(RUTE).toMatch(/\.eq\("stripe_subscription_id", sub\.id\)/);
  });

  it("råber op, når der slet ingen virksomhed er", () => {
    // Nogen betaler for noget, vi ikke kan knytte til nogen. Det må ikke
    // være en tavs `break`.
    const gren = RUTE.slice(RUTE.indexOf("if (!firmaId) {"));
    expect(gren.slice(0, 900)).toMatch(/noterFejl\(/);
  });

  it("skriver IKKE varen, når metadataen er forældet", () => {
    /*
      Måtte vi falde tilbage, ved vi at metadataen er gammel — og så er
      dens `product_slug` det også. At skrive den ville sætte kunden
      tilbage til det, de købte ENGANG, og ikke det, de har i dag. Præcis
      dét ville have rullet en sammenlagt Komplet-kunde tilbage til Pro.
    */
    expect(RUTE).toMatch(/slug && fraMetadata/);
  });
});
