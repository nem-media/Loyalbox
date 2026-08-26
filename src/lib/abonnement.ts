/**
 * Abonnementets tilstande — og hvorfor manglende betaling IKKE er ophør.
 *
 * DEN JURIDISKE KERNE: databehandleraftalens § 13 og forordningens artikel 28
 * tvinger os til at slette kundens data, når AFTALEN ophører. Der er ikke et
 * frit valg. Skulle en manglende betaling regnes som ophør, ville en butik,
 * der glemte at opdatere sit betalingskort, miste hele sin kundeklub — og
 * hendes egne kunder ville miste deres stempler.
 *
 * Derfor er manglende betaling defineret som SUSPENSION: kundeforholdet
 * består, aftalen er i kraft, og adgangen er skruet ned. Så er der intet at
 * slette, og de seks måneder er lovlige. Først når de er gået, ophører
 * aftalen — og så begynder de 30 dage.
 *
 * HVAD DER LUKKER OG HVAD DER BLIVER VED:
 *
 *   Lukker    dashboardets indsigt og redigering — statistik, feedback-
 *             indbakken, ændring af logo og links. Det sker af sig selv, fordi
 *             `plan` falder til basic, og al tierCan()-spærring ligger inde i
 *             /dashboard.
 *   Bliver    alt ved skranken: stempling, indløsning af belønninger,
 *             personalepanelet, kundens kortside, tilmelding og standeren.
 *             Butikkens egne kunder har ikke gjort noget forkert.
 *
 * Skillelinjen er bevidst: butikken mister sin indsigt, ikke sine løfter til
 * sine kunder.
 *
 * FÆLDEN VÆRD AT KENDE: feedback bliver ved med at komme ind, mens indbakken
 * er lukket. Derfor tæller betalingsskærmen de ulæste med — det er både ærligt
 * og den bedste grund til at betale.
 *
 * De almindelige opbevaringsfrister i src/lib/opbevaring.ts kører videre hele
 * vejen igennem. Det er dem, der holder "ikke længere end nødvendigt" ærligt:
 * et stempelkort, der har ligget dødt i 24 måneder, ryger uanset hvad der sker
 * med abonnementet.
 */

import { getProduct } from "@/lib/constants";

/** Hvor længe kundeforholdet består uden betaling, før aftalen ophører. */
export const SUSPENSION_MAANEDER = 6;

/**
 * Fristen fra aftalens ophør til alt er slettet. Står også i
 * databehandleraftalens § 13 — ændres den, skal begge steder følges ad.
 */
export const SLETNING_EFTER_OPHOER_DAGE = 30;

/**
 * Fortrydelsesfristen på en sletning, kunden selv bestiller. Den findes, fordi
 * en sletning ikke kan gøres om: uden en frist ville et fejlklik være endeligt.
 */
export const SLETNING_ANGREFRIST_DAGE = 7;

/**
 * LEVERANDØRSKIFTE — dataforordningen (EU) 2023/2854, artikel 25.
 *
 * Kapitlet om leverandørskifte har fundet anvendelse siden 12. september 2025
 * og gælder udbydere af databehandlingstjenester, hvilket omfatter SaaS.
 * DER ER INGEN UNDTAGELSE FOR SMÅ UDBYDERE i kapitel VI — det er værd at
 * vide, fordi de øvrige kapitler har en. Digital Omnibus foreslår en lettere
 * ordning for SMV'er, men kun for aftaler indgået SENEST 12. september 2025,
 * og alle vores aftaler er nyere.
 *
 * De tre tal herunder er de eneste, forordningen sætter grænser for. Tallene
 * vises i handelsbetingelsernes § 12 og må ikke skrives i hånden dér.
 */

/** Varsel til at sætte et skifte i gang. Artikel 25 tillader højst to måneder. */
export const SKIFT_VARSEL_MAANEDER = 1;

/**
 * Overgangsperioden efter varslet. Artikel 25 sætter loftet ved 30
 * kalenderdage; er det teknisk umuligt, må den forlænges til højst syv måneder
 * mod en begrundelse.
 */
export const SKIFT_OVERGANG_DAGE = 30;

/**
 * Hvor længe kunden kan hente sine data EFTER overgangsperioden. Artikel 25
 * kræver mindst 30 kalenderdage.
 *
 * FÆLDEN: sammen med overgangsperioden betyder det, at data skal være
 * tilgængelige i op til 60 dage efter ophøret — altså LÆNGERE end de 30 dage,
 * databehandleraftalen ellers lover sletning inden for. Derfor har
 * `companies.dataudtraek_frist` (migration 0017) forrang for oprydningen:
 * uden den ville vi slette midt i et lovsikret skifte.
 */
export const SKIFT_HENTEPERIODE_DAGE = 30;

export type AbonnementTilstand = "aktiv" | "suspenderet" | "ophoert";

/**
 * Stripes egen status, gemt som den er.
 *
 * Vi gemmer den ORDRET og ikke som et ja/nej, fordi vejen tilbage afhænger af
 * den: et abonnement i `past_due` findes stadig og kan reddes med et nyt kort,
 * mens et `canceled` er væk og kræver et nyt. Blev den kogt ned til "betaler
 * ikke", kunne betalingsskærmen ikke vide, hvilken knap den skulle vise.
 */
export type StripeStatus =
  | "active"
  | "trialing"
  | "past_due"
  | "unpaid"
  | "incomplete"
  | "incomplete_expired"
  | "paused"
  | "canceled";

/** De felter på virksomheden, tilstanden regnes ud fra. */
export interface AbonnementFelter {
  stripe_subscription_id: string | null;
  stripe_status: string | null;
  suspenderet_siden: string | null;
  ophoert_den: string | null;
  sletning_udfoeres_den: string | null;
  /**
   * Er et leverandørskifte i gang, står der en dato her, og INTET slettes før
   * den. Se SKIFT_HENTEPERIODE_DAGE. Feltet er valgfrit i typen, så ældre
   * kaldesteder ikke skal ændres for at kompilere — men oprydningen og
   * sletningsdatoen respekterer det.
   */
  dataudtraek_frist?: string | null;
}

/** Betaler kunden lige nu? Prøveperiode tæller med. */
export function erBetalende(status: string | null | undefined): boolean {
  return status === "active" || status === "trialing";
}

/**
 * Hvor står abonnementet?
 *
 * Rækkefølgen er ikke tilfældig: et ophør slår altid en suspension, og en
 * suspension kræver, at der ER noteret et starttidspunkt. Uden det ville en
 * virksomhed, der aldrig har haft et abonnement (fx en Basic-konto oprettet i
 * går), fremstå som suspenderet og få en betalingsskærm, der ikke giver mening.
 */
export function abonnementTilstand(c: AbonnementFelter): AbonnementTilstand {
  if (c.ophoert_den) return "ophoert";
  if (c.suspenderet_siden && !erBetalende(c.stripe_status))
    return "suspenderet";
  return "aktiv";
}

/** Datoen hvor suspensionen løber ud, og aftalen ophører. Null hvis ikke suspenderet. */
export function suspensionUdloeber(c: AbonnementFelter): Date | null {
  if (!c.suspenderet_siden) return null;
  const d = new Date(c.suspenderet_siden);
  if (Number.isNaN(d.getTime())) return null;
  d.setMonth(d.getMonth() + SUSPENSION_MAANEDER);
  return d;
}

/**
 * Datoen hvor data faktisk slettes.
 *
 * Tre veje fører hertil, og den nærmeste gælder: en sletning kunden selv har
 * bestilt, de 30 dage efter et ophør, eller de 30 dage efter en suspension,
 * der får lov at løbe ud. Kunden skal se ÉN dato — ikke tre regnestykker.
 */
export function sletningSker(c: AbonnementFelter): Date | null {
  const datoer: Date[] = [];

  if (c.sletning_udfoeres_den) {
    const d = new Date(c.sletning_udfoeres_den);
    if (!Number.isNaN(d.getTime())) datoer.push(d);
  }

  const ophoer = c.ophoert_den
    ? new Date(c.ophoert_den)
    : suspensionUdloeber(c);
  if (ophoer && !Number.isNaN(ophoer.getTime())) {
    const d = new Date(ophoer);
    d.setDate(d.getDate() + SLETNING_EFTER_OPHOER_DAGE);
    datoer.push(d);
  }

  if (datoer.length === 0) return null;
  const naermeste = datoer.reduce((a, b) => (a < b ? a : b));

  // Et leverandørskifte skubber ALTID datoen. Kunden har krav på tiden til at
  // hente sine data, og en sletning midt i den ville bryde både forordningen
  // og det, § 12 lover. Derfor vinder fristen over enhver anden dato — også
  // over en sletning, kunden selv har bestilt.
  if (c.dataudtraek_frist) {
    const frist = new Date(c.dataudtraek_frist);
    if (!Number.isNaN(frist.getTime()) && frist > naermeste) return frist;
  }

  return naermeste;
}

/**
 * Hele dage fra nu til datoen. Aldrig negativ — er fristen overskredet, er
 * svaret 0, for "om -3 dage" er ikke noget, et menneske kan bruge til noget.
 */
export function dageTil(dato: Date | null, nu = new Date()): number | null {
  if (!dato) return null;
  const ms = dato.getTime() - nu.getTime();
  return Math.max(0, Math.ceil(ms / 86_400_000));
}

/**
 * Hvordan kommer kunden tilbage?
 *
 *   "opdater_kort"     abonnementet findes stadig hos Stripe og venter på en
 *                      betaling, der kan gennemføres. Kundecentret klarer det,
 *                      og Stripe prøver den åbne faktura igen af sig selv.
 *   "nyt_abonnement"   abonnementet er lukket. Der skal tegnes et nyt — men
 *                      KUN månedsprisen, for standeren er købt og betalt.
 *
 * Null betyder, at der ikke er noget at genoptage.
 */
export function genoptagVej(
  c: AbonnementFelter,
): "opdater_kort" | "nyt_abonnement" | null {
  if (abonnementTilstand(c) === "aktiv") return null;
  if (c.stripe_subscription_id && !erBetalende(c.stripe_status)) {
    const kanReddes =
      c.stripe_status === "past_due" ||
      c.stripe_status === "unpaid" ||
      c.stripe_status === "incomplete" ||
      c.stripe_status === "paused";
    return kanReddes ? "opdater_kort" : "nyt_abonnement";
  }
  return "nyt_abonnement";
}

/**
 * Det kunden får at vide på betalingsskærmen. Samlet ét sted, så beskeden er
 * den samme i dashboardet, i mailen og i eventuelle senere kanaler.
 */
export const BETALING_MANGLER_OVERSKRIFT = "Betaling mangler";

export function betalingManglerBroedtekst(
  dageTilSletning: number | null,
): string {
  const hale =
    dageTilSletning === null
      ? ""
      : ` Dine data er urørte og bliver liggende ${dageTilSletning} dage endnu.`;
  return (
    "Vi kunne ikke gennemføre betalingen, så din adgang til statistik, " +
    "feedback og redigering er sat på pause. Standeren, stempelkortene og " +
    "dine kunders stempler kører videre som altid." +
    hale
  );
}

/**
 * Har virksomheden købt et af abonnementerne?
 *
 * DET ER PRODUKTET, DER SPØRGES OM — ikke `plan`, og det er med vilje.
 * `plan` kan sættes i hånden i admin og HAVDE været sat forkert på en rigtig
 * kunde: LoyalSum Komplet med niveau `premium`. Havde spærringerne hængt på
 * planen, ville dén fejl have slukket for en betalende kundes egen
 * anmeldelsesside. Produktet er kvitteringen for, hvad der er købt, og det er
 * dét, adgangen skal følge.
 *
 * SUSPENSION SPØRGES DER IKKE OM HER. Det er samme regel som stempelkortet:
 * en manglende betaling lukker DASHBOARDET, ikke det kunderne møder. En
 * butik, hvis skilt holder op med at virke midt i en betalingssag, har et
 * problem ude i lokalet — og det er ikke det, en suspension skal gøre.
 *
 * Bemærk at et engangskøb af "Reviewstander" IKKE tæller: den har ingen
 * månedspris, og den købes uden konto som et trykt skilt, der viderestiller.
 */
export function harAbonnement(
  company: { product_slug?: string | null } | null | undefined,
): boolean {
  const slug = company?.product_slug;
  if (!slug) return false;
  return Boolean(getProduct(slug)?.monthlyPrice);
}
