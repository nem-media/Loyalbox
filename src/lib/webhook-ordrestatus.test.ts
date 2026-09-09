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
  expect(start, "betalingsgrenens case-etiketter findes ikke længere").toBeGreaterThan(-1);

  const næste = KILDE.indexOf('case "', start + SIDSTE_ETIKET.length);
  const krop = KILDE.slice(start, næste === -1 ? undefined : næste);

  // Selve fælden ovenfor: en tom krop må aldrig kunne se ud som en bestået prøve.
  expect(krop.length, "betalingsgrenens krop er tom").toBeGreaterThan(500);
  return krop;
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
    expect(kædeStart, "grenen, der sætter kundeforholdet, er væk").toBeGreaterThan(-1);
    expect(ordreOpdatering, "ordreopdateringen er væk").toBeGreaterThan(-1);
  });

  it("opdaterer ordren EFTER kundeforholdet", () => {
    // Rækkefølgen er ikke ligegyldig: `varslOmKoeb` afgør ud fra statussen
    // `new`, om kunden allerede har fået sin bekræftelse. Flyttes
    // opdateringen op før den, sendes bekræftelsen aldrig.
    expect(ordreOpdatering).toBeGreaterThan(kædeStart);
  });

  /** DETTE ER SELVE FEJLEN. */
  it("forlader ikke case'en undervejs i grenkæden", () => {
    const imellem = gren.slice(kædeStart, ordreOpdatering);

    expect(
      imellem,
      "et `break` mellem grenkæden og ordreopdateringen springer ud af hele " +
        "case'en, og ordren bliver aldrig markeret betalt — det var fejlen fra " +
        "21. august 2026. Brug `else if`.",
    ).not.toMatch(/\bbreak\s*;/);
  });

  it("bruger én if/else if-kæde og ikke løse if-blokke", () => {
    // Den positive formulering af prøven ovenfor: falder grenene ikke sammen
    // i én kæde, kan en fremtidig gren igen slippe uden om ordreopdateringen.
    const imellem = gren.slice(kædeStart, ordreOpdatering);
    expect(imellem.match(/}\s*else if \(/g)?.length ?? 0).toBe(2);
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
    const spaerren = gren.slice(fra, gren.indexOf("break;", fra) + "break;".length);

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
