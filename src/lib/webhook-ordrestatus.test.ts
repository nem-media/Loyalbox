import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { BETALTE_ORDRE_STATUSSER } from "./commerce";

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

/** Kroppen af `case "checkout.session.completed"` — frem til næste `case`. */
function betalingsGrenen(): string {
  const start = KILDE.indexOf('case "checkout.session.completed"');
  expect(start, "case'en for gennemført betaling findes ikke længere").toBeGreaterThan(-1);

  const næste = KILDE.indexOf('case "', start + 10);
  return KILDE.slice(start, næste === -1 ? undefined : næste);
}

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

  it("sætter ordren i en status, der tæller som betalt", () => {
    // Bindingen tilbage til den liste, admin faktisk tæller på. Skiftes
    // statussen her til noget, der ikke står i listen, forsvinder ordren fra
    // "betalte ordrer i alt" uden at noget fejler.
    expect(BETALTE_ORDRE_STATUSSER).toContain("needs_onboarding");
  });
});
