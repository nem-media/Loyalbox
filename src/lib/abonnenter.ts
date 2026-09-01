import {
  abonnementTilstand,
  erBetalende,
  type AbonnementFelter,
  type AbonnementTilstand,
} from "@/lib/abonnement";
import { getProduct, PRODUCTS } from "@/lib/constants";

/**
 * Abonnenterne, som de skal kunne LÆSES af os selv i admin.
 *
 * EGEN FIL OG IKKE I `abonnement.ts`. Dén fil bærer de juridiske regler —
 * hvornår en aftale er suspenderet, hvornår den ophører, hvornår der skal
 * slettes — og databehandleraftalen hænger på den. Det her er, hvordan de
 * samme regler skrives på én skærm for én læser. Blandes de sammen, kommer en
 * ændring af en badge-farve til at ligge i den fil, § 13 peger på.
 *
 * INTET HER KENDER STRIPE. Betalingsdatoen hentes live (se
 * `stripe-abonnement.ts`), fordi den ikke findes i databasen; men alt, der kan
 * regnes ud af vores egne felter, regnes her, hvor det kan prøves uden et
 * netværk.
 */

/** Badge-tonerne fra `ui/badge`. Gentaget her for at undgå en import af UI i en libfil. */
export type BadgeTone = "neutral" | "accent" | "success" | "warning" | "danger";

/**
 * De varer, der ER et abonnement. Udledt af katalogets månedspris og ikke
 * skrevet af: en ny abonnementsvare skal dukke op på listen af sig selv, og en
 * håndskrevet liste ville tie om den, indtil nogen opdagede det.
 */
export const ABONNEMENTS_SLUGS: string[] = PRODUCTS.filter(
  (p) => p.monthlyPrice,
).map((p) => p.slug);

/**
 * Tilstanden som en etiket.
 *
 * TRE OG IKKE TO. "Betaler ikke" ville dække både en suspension og et ophør,
 * og de to kræver hver sin handling: en suspenderet kunde kan reddes med et
 * nyt kort og har alle sine data i behold, en ophørt skal tegne et nyt
 * abonnement og har en sletningsdato hængende over sig. Forskellen er
 * juridisk, ikke kosmetisk — se `abonnement.ts`.
 */
export const TILSTAND_ETIKET: Record<
  AbonnementTilstand,
  { label: string; tone: BadgeTone }
> = {
  aktiv: { label: "Aktiv", tone: "success" },
  suspenderet: { label: "Suspenderet", tone: "warning" },
  ophoert: { label: "Ophørt", tone: "danger" },
};

/**
 * Stripes status oversat til noget, man kan handle på.
 *
 * VI GEMMER STATUS ORDRET (se `StripeStatus`), fordi vejen tilbage afhænger af
 * den. Men "past_due" siger ingenting til den, der sidder med kunden i røret.
 * Teksten siger, hvad der er sket, OG hvad der sker nu — forskellen på
 * `past_due` og `unpaid` er netop, om Stripe stadig prøver.
 */
export const STRIPE_STATUS_TEKST: Record<string, string> = {
  active: "Betaler normalt.",
  trialing: "I prøveperiode — første betaling er ikke trukket endnu.",
  past_due:
    "Betalingen fejlede. Stripe prøver igen, så kunden kan nå at rette kortet.",
  unpaid:
    "Stripe har opgivet at trække. Der sker ikke mere, før kortet er rettet.",
  incomplete:
    "Første betaling blev aldrig gennemført — abonnementet er ikke startet.",
  incomplete_expired:
    "Første betaling nåede aldrig igennem, og Stripe har lukket forsøget.",
  paused: "Sat på pause hos Stripe. Der trækkes ikke.",
  canceled: "Opsagt. Der trækkes ikke mere; et nyt abonnement skal tegnes.",
};

/**
 * Statussen i klartekst.
 *
 * EN UKENDT STATUS SKRIVES UD RÅT frem for at blive til "ukendt". Stripe
 * tilføjer statusser, og den dag det sker, skal der stå noget, man kan slå op
 * — ikke et tomt felt, der ligner en fejl i vores egen kode.
 */
export function stripeStatusTekst(status: string | null | undefined): string {
  if (!status) return "Intet abonnement registreret hos Stripe.";
  return STRIPE_STATUS_TEKST[status] ?? `Ukendt status hos Stripe: ${status}.`;
}

/** Månedsprisen for den vare, virksomheden har købt. Null hvis den ikke har en. */
export function maanedspris(slug: string | null | undefined): number | null {
  if (!slug) return null;
  return getProduct(slug)?.monthlyPrice ?? null;
}

/** Varens navn, som kunden købte den. Falder tilbage til sluggen frem for til intet. */
export function produktNavn(slug: string | null | undefined): string {
  if (!slug) return "Intet produkt";
  return getProduct(slug)?.name ?? slug;
}

/**
 * Kortet som én linje: "visa •••• 4242 · udløber 04/2027".
 *
 * FORMATERINGEN LIGGER HER og ikke i Stripe-opslaget, så den kan prøves uden
 * et netværk — og så selve opslaget kan aflevere måned og år som TAL, der kan
 * regnes på. Se `abonnent-varsler.ts`: udløbsdatoen er et varsel, ikke pynt.
 */
export function kortTekst(kort: {
  maerke: string;
  sidste4: string;
  udloebMaaned: number;
  udloebAar: number;
}): string {
  const maaned = String(kort.udloebMaaned).padStart(2, "0");
  return `${kort.maerke} •••• ${kort.sidste4} · udløber ${maaned}/${kort.udloebAar}`;
}

/** De felter, en abonnentrække skal have for at kunne bedømmes. */
export interface AbonnentFelter extends AbonnementFelter {
  product_slug: string | null;
}

/**
 * Kræver rækken, at nogen gør noget?
 *
 * TO VEJE IND, og begge skal med. Den ene er tilstanden: suspenderet eller
 * ophørt. Den anden er Stripes status alene — en betaling kan være fejlet,
 * uden at `suspenderet_siden` er sat endnu, fordi de to skrives af hver sin
 * webhook-hændelse og ikke nødvendigvis i den rækkefølge.
 *
 * DEN TREDJE, SOM DEN OGSÅ FANGER: en virksomhed, der står med en
 * abonnementsvare, men slet ingen status hos Stripe. Det er en, der er sat op
 * i hånden i admin og aldrig er blevet faktureret — der kommer ingen penge
 * ind, og ingen ville nogensinde opdage det. Den skal stå øverst, ikke skjules.
 */
export function kraeverHandling(r: AbonnentFelter): boolean {
  if (abonnementTilstand(r) !== "aktiv") return true;
  return !erBetalende(r.stripe_status);
}

/**
 * Månedlig omsætning — KUN fra dem, der faktisk betaler.
 *
 * En suspenderet kunde tæller ikke med. Hun ER stadig kunde, aftalen er i
 * kraft, og hendes data er urørte — men der kommer ingen penge ind, og et tal,
 * der lover dem, er et forkert tal at træffe beslutninger på. Prøveperioder
 * tæller med, fordi `erBetalende()` regner dem med: de bliver til penge af sig
 * selv, medmindre kunden siger fra.
 */
export function maanedligOmsaetning(raekker: AbonnentFelter[]): number {
  return raekker.reduce(
    (sum, r) =>
      erBetalende(r.stripe_status) ? sum + (maanedspris(r.product_slug) ?? 0) : sum,
    0,
  );
}

/**
 * Rækkefølgen: det, der kræver noget, står øverst.
 *
 * En liste sorteret på navn eller dato er en RAPPORT. Det, man kommer efter,
 * er "er der noget galt" — og en suspenderet kunde, der er ved at løbe tør for
 * sine seks måneder, må ikke ligge nummer fjorten, fordi butikken hedder Ørsted.
 *
 * Sorterer på en KOPI. Rækkerne kommer fra en forespørgsel, der også bruges
 * til at tælle med, og en sortering på stedet ville flytte dem under fødderne
 * på den, der talte.
 */
export function sorterAbonnenter<T extends AbonnentFelter & { name: string }>(
  raekker: T[],
): T[] {
  return [...raekker].sort((a, b) => {
    const vaegt = Number(kraeverHandling(b)) - Number(kraeverHandling(a));
    if (vaegt !== 0) return vaegt;
    return a.name.localeCompare(b.name, "da");
  });
}
