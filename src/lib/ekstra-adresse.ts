import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { isStripeConfigured, stripeIdsFor, stripeMode } from "@/lib/commerce";
import { getProduct, priceFor, STRIPE_TAX_RATES } from "@/lib/constants";
import { erBetalende } from "@/lib/abonnement";
import type { StanderFarve } from "@/lib/stander-tilvalg";

/**
 * EN BUTIK MERE — EN LINJE MERE PÅ DET ABONNEMENT, DER ALLEREDE KØRER.
 *
 * DET AFGØRENDE: der oprettes ALDRIG et abonnement nummer to. En virksomhed
 * kan kun bære ÉT `stripe_subscription_id`, og et abonnement mere ville blive
 * usynligt og trække penge i al evighed — præcis dét skete for en rigtig
 * kunde 14. september 2026, og det er derfor `abonnementsSkifteSpaerre()`
 * findes. En ekstra QR-adresse er derfor ANTALLET på den månedslinje, der
 * allerede er der, hævet med én.
 *
 * DERFOR ER DER HELLER INGEN NY VARE I STRIPE. Adresse nummer to koster
 * præcis det samme som den første (se `prisPrAdresse()` — en kæde får mere
 * pr. butik, ikke mindre), og så er det den samme pris ganget med et større
 * tal. Skulle prisen en dag være en anden, kræver det sit eget produkt i
 * BÅDE test og live, og så er det ikke længere en ændring i denne fil alene.
 *
 * ÉN FAKTURA OG IKKE TO. Skiltet lægges på som en ventende fakturalinje FØR
 * antallet hæves, så Stripe fejer den med ind på den proratafaktura, som
 * ændringen udløser. Kunden betaler ét beløb på det kort, der allerede
 * trækkes på — ingen omvej gennem Checkout, ingen ventetid på en webhook.
 *
 * OG SKILTET SKAL MED. En ny adresse er en ny QR-kode, og en trykt QR kan
 * ikke omdirigeres. En adresse uden et skilt er derfor en tom linje på
 * fakturaen — kunden har betalt for et sted, de ikke kan sætte noget op ved.
 * Samme regel som ved hovedkøbet, hvor et abonnement KØBES med en stander.
 */

/** Hvad der gik galt. Er der intet, er betalingen sat i gang. */
export type EkstraAdresseFejl =
  /** Ingen løbende vare at lægge linjen på. */
  | "intet-abonnement"
  /** Abonnementet betaler ikke lige nu — suspenderet, opsagt eller ophørt. */
  | "ikke-betalende"
  /** Vi har intet abonnements-id hos Stripe at hæve. */
  | "intet-hos-stripe"
  /** Abonnementet findes, men månedslinjen kunne ikke findes på det. */
  | "linjen-mangler"
  /** Nøgle, produkt-id'er eller momssats mangler i denne tilstand. */
  | "ikke-aabnet"
  /** Stripe afviste. Beskeden hører til driftsloggen, ikke til kunden. */
  | "stripe";

export interface EkstraAdresseKvittering {
  /** Antallet abonnementet nu dækker — læst af Stripes eget svar. */
  adresserTilladt: number;
  /** Er pengene hjemme? Falsk betyder en åben faktura, ikke et afvist køb. */
  betalt: boolean;
  /**
   * Hvad der blev faktureret, i KRONER ex moms — skiltet plus prorataen for
   * resten af perioden.
   *
   * LÆSES AF FAKTURAEN OG REGNES IKKE SELV. Prorataen afhænger af, hvor
   * mange dage der er til kundens fornyelse, og et regnestykke her ville
   * blive et
   * andet tal end det, kunden ser trukket på kortet. Det er kundens udgave,
   * der bliver troet på — så den skal komme fra samme sted som pengene.
   */
  beloebExMoms: number;
  /**
   * Fakturaen hos Stripe, hvis der er noget at gøre ved den. Bruges KUN når
   * betalingen ikke gik igennem med det samme — fx hvis kortet kræver en
   * godkendelse. Så skal kunden have et sted at gøre den færdig i stedet for
   * at stå med en butik, der ser ubetalt ud.
   */
  fakturaUrl: string | null;
}

/**
 * Månedslinjen på abonnementet.
 *
 * SØGES PÅ PRIS-ID OG IKKE PÅ "DEN FØRSTE LINJE". Rækkefølgen i `items` er
 * Stripes og ikke vores, og et abonnement kan bære mere end én linje — gør vi
 * det til et gæt, ender en forkert linje med at blive ganget op, og kunden
 * betaler for noget andet end det, de trykkede på.
 *
 * Skilt ud som ren funktion, fordi det er det eneste her, der kan prøves uden
 * et netværk.
 */
export function findPrislinje(
  sub: Pick<Stripe.Subscription, "items">,
  /* BEGGE PRISER, OG DET ER IKKE EN FINESSE. Abonnementet kører på ÉN af dem
     ad gangen — månedligt eller årligt — og hvilken, kan kun abonnementet
     svare på. Ledte den kun efter månedsprisen, ville en kunde, der har
     skiftet til årsbetaling, ikke kunne købe en adresse mere: linjen findes,
     men vi kan ikke se den. Og `adresserPaaAbonnementet()` ville svare
     "spørg ikke mig", så `adresser_tilladt` stille holdt op med at følge
     virkeligheden. Samme fejlklasse som da pointprogrammet kom til, og
     resten af systemet blev ved med kun at kigge efter et stempelkort. */
  priser: { monthlyPriceId?: string; yearlyPriceId?: string },
): Stripe.SubscriptionItem | null {
  const gyldige = [priser.monthlyPriceId, priser.yearlyPriceId].filter(
    (id): id is string => Boolean(id),
  );
  if (!gyldige.length) return null;
  return (
    sub.items.data.find((linje) =>
      gyldige.includes(linje.price?.id as string),
    ) ?? null
  );
}

/** Kører abonnementet på årsprisen? Bruges til at sige det rigtige til kunden. */
export function erAarsabonnement(
  sub: Pick<Stripe.Subscription, "items">,
  yearlyPriceId: string | undefined,
): boolean {
  if (!yearlyPriceId) return false;
  return sub.items.data.some((linje) => linje.price?.id === yearlyPriceId);
}

/**
 * Hvor mange QR-adresser står abonnementet på hos Stripe?
 *
 * BRUGES AF WEBHOOKEN til at holde `companies.adresser_tilladt` (0034) i takt
 * med virkeligheden. Kolonnen er et aftryk, fordi tallet læses ved hver
 * sideindlæsning og ikke må koste et opslag hos Stripe — men et aftryk kan
 * komme i utakt, og så er det dette tal, der gælder.
 *
 * NULL BETYDER "SPØRG IKKE MIG", og kaldestedet skal så lade kolonnen være.
 * Et gæt her ville kunne lukke en adresse, der står ude i en butik: kender vi
 * hverken varen, prisen eller linjen, ved vi ikke om abonnementet dækker én
 * adresse eller fem, og nul ville være det farligste af alle svar.
 */
export function adresserPaaAbonnementet(
  sub: Pick<Stripe.Subscription, "items">,
  productSlug: string | null | undefined,
): number | null {
  const produkt = productSlug ? getProduct(productSlug) : undefined;
  if (!produkt?.monthlyPrice) return null;

  const ids = stripeIdsFor(produkt);
  if (!ids?.monthlyPriceId) return null;

  const linje = findPrislinje(sub, ids);
  const antal = linje?.quantity;
  return typeof antal === "number" && antal >= 1 ? antal : null;
}

/** Felterne, købet afgøres ud fra. */
export interface AbonnentFelter {
  product_slug?: string | null;
  stripe_status?: string | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
}

export type EkstraAdresseSvar =
  | { ok: true; kvittering: EkstraAdresseKvittering }
  | { ok: false; fejl: EkstraAdresseFejl; besked?: string };

/**
 * Er der et abonnement at hæve — og hvilken linje er det?
 *
 * DELT AF SELVBETJENINGEN OG AF ADMIN, så de to ikke kan komme til at
 * acceptere hver sit. Admin sælger til en kæde, der har ringet; kunden
 * trykker selv på en knap. Men forudsætningen er den samme i begge ender:
 * en løbende vare, et abonnement, der betaler, en linje hos Stripe at gange
 * op, og en momssats at gøre det med.
 */
async function findAbonnementslinje(
  company: AbonnentFelter,
): Promise<
  | { ok: true; sub: Stripe.Subscription; linje: Stripe.SubscriptionItem }
  | { ok: false; fejl: EkstraAdresseFejl; besked?: string }
> {
  const produkt = company.product_slug
    ? getProduct(company.product_slug)
    : undefined;
  if (!produkt?.monthlyPrice) return { ok: false, fejl: "intet-abonnement" };

  // Suspenderet eller opsagt: der er ikke et kundeforhold at udvide, og en
  // prorata på et abonnement i restance ville bare lægge til gælden.
  if (!erBetalende(company.stripe_status)) {
    return { ok: false, fejl: "ikke-betalende" };
  }

  if (!company.stripe_subscription_id || !company.stripe_customer_id) {
    return { ok: false, fejl: "intet-hos-stripe" };
  }

  const ids = stripeIdsFor(produkt);
  if (!isStripeConfigured() || !ids?.monthlyPriceId) {
    return { ok: false, fejl: "ikke-aabnet" };
  }

  try {
    const sub = await stripe().subscriptions.retrieve(
      company.stripe_subscription_id,
    );
    const linje = findPrislinje(sub, ids);
    if (!linje) return { ok: false, fejl: "linjen-mangler" };
    return { ok: true, sub, linje };
  } catch (err) {
    return {
      ok: false,
      fejl: "stripe",
      besked: err instanceof Error ? err.message : "ukendt fejl",
    };
  }
}

/**
 * ADMINS VEJ: én adresse mere, uden et skilt og uden et træk på kortet nu.
 *
 * TO TING ER ANDERLEDES END KUNDENS EGEN KNAP, og begge er bevidste.
 *
 * DER FAKTURERES IKKE MED DET SAMME (`create_prorations` og ikke
 * `always_invoice`). Kunden har ringet eller skrevet — de har ikke trykket på
 * noget. Et øjeblikkeligt træk på deres kort, udløst af et klik hos OS, er
 * ikke noget, de har sagt ja til. Beløbet for de resterende dage lægges i
 * stedet på næste faktura, hvor de kan se det komme.
 *
 * DER FØLGER INTET SKILT MED. Kunden, der klikker selv, skal have et skilt,
 * fordi en ny QR-kode kræver et nyt tryk — men en kæde, vi taler med, har som
 * regel allerede standere stående, eller skal have et andet antal end ét. Det
 * aftales i samtalen og bestilles for sig.
 *
 * ANTALLET KOMMER FRA STRIPES EGET SVAR, ikke fra vores egen optælling:
 * kolonnen skal blive ved at svare til abonnementet, og det gør den kun, hvis
 * den skrives af det, Stripe faktisk står med bagefter.
 */
export async function tilfoejAdresseAdmin(
  company: AbonnentFelter,
): Promise<
  { ok: true; adresserTilladt: number } | { ok: false; fejl: EkstraAdresseFejl; besked?: string }
> {
  const fundet = await findAbonnementslinje(company);
  if (!fundet.ok) return fundet;

  try {
    const opdateret = await stripe().subscriptionItems.update(fundet.linje.id, {
      quantity: (fundet.linje.quantity ?? 1) + 1,
      proration_behavior: "create_prorations",
    });
    return {
      ok: true,
      adresserTilladt: opdateret.quantity ?? (fundet.linje.quantity ?? 1) + 1,
    };
  } catch (err) {
    return {
      ok: false,
      fejl: "stripe",
      besked: err instanceof Error ? err.message : "ukendt fejl",
    };
  }
}

/**
 * Hæver abonnementet med én adresse og lægger skiltet på samme faktura.
 *
 * RÆKKEFØLGEN ER VALGT EFTER, HVAD DER SKER NÅR DET GÅR GALT. Betalingen
 * ligger FØRST, og adressen oprettes af kaldestedet bagefter. Fejler
 * oprettelsen, har kunden betalt for en adresse, de ikke fik — men
 * `adresser_tilladt` er hævet, så /dashboard/standere viser den almindelige
 * "Opret QR-adresse"-formular, og de kan selv komme videre. Lå oprettelsen
 * først, ville en mislykket betaling efterlade en gratis adresse, og
 * oprydningen bagefter skulle slette noget, vi ikke kan vide om der
 * alligevel blev betalt for.
 *
 * `standerPris` er engangsbeløbet for skiltet i KRONER ex moms, regnet af
 * kaldestedet med `standerPrisForDesign()` — farve og frontfarve hører til
 * designet og ikke til denne fil.
 */
export async function koebEkstraAdresse(
  company: AbonnentFelter,
  standerPris: number,
): Promise<EkstraAdresseSvar> {
  const taxRate = STRIPE_TAX_RATES[stripeMode()];
  if (!taxRate) return { ok: false, fejl: "ikke-aabnet" };

  const fundet = await findAbonnementslinje(company);
  if (!fundet.ok) return fundet;
  const { sub, linje } = fundet;

  // Efter `findAbonnementslinje` er begge id'er kendte; TypeScript ved det
  // bare ikke, fordi felterne er valgfri i typen.
  const kundeId = company.stripe_customer_id!;

  try {
    /*
     * SKILTET LÆGGES PÅ FØRST — som en ventende fakturalinje på kunden.
     *
     * Stripe fejer ventende linjer med ind på den NÆSTE faktura, der laves
     * for abonnementet, og det er den, `always_invoice` nedenfor udløser et
     * øjeblik senere. Derfor bliver det ét beløb og ét kortkøb.
     *
     * Linjen bærer sit eget navn og ikke varens pris-id: beløbet afhænger af
     * designets farve og af, om frontfarven allerede er betalt, og den slags
     * kan et fast pris-id ikke bære. Momssatsen sættes eksplicit — uden den
     * ville linjen gå momsfri ud, og vi ville skylde SKAT 25 % af den.
     */
    const ekstraStander = getProduct("ekstra-stander");
    const standerIds = ekstraStander ? stripeIdsFor(ekstraStander) : undefined;
    if (!ekstraStander || !standerIds) {
      return { ok: false, fejl: "ikke-aabnet" };
    }

    await stripe().invoiceItems.create({
      customer: kundeId,
      subscription: sub.id,
      quantity: 1,
      tax_rates: [taxRate],
      price_data: {
        currency: "dkk",
        // Linjen peger på varens eget Stripe-produkt, så fakturaen viser
        // "Ekstra stander" og bogholderiet kan kende den igen.
        product: standerIds.productId,
        unit_amount: Math.round(standerPris * 100),
        tax_behavior: "exclusive",
      },
    });

    /*
     * ANTALLET HÆVES MED ÉN — og prorataen faktureres MED DET SAMME.
     *
     * `always_invoice` er valgt frem for Stripes standard (`create_prorations`,
     * der venter til næste træk): kunden skal betale for butikken i samme
     * øjeblik, de får den, og skiltet skal faktureres nu og ikke om tre uger.
     * Beløbet er de resterende dage af perioden — fornyelsesdatoen rykker
     * sig IKKE, og næste træk dækker begge butikker. Det er derfor, tilkøb
     * stadig prorateres, selv om selve abonnementet ikke gør: alternativet
     * ville være at nulstille kundens cyklus, fordi de købte et skilt mere.
     */
    const opdateret = await stripe().subscriptionItems.update(linje.id, {
      quantity: (linje.quantity ?? 1) + 1,
      proration_behavior: "always_invoice",
    });

    /*
     * BLEV DER BETALT? Fakturaen slås op bagefter, fordi `always_invoice`
     * ikke giver den tilbage. Kræver kortet en godkendelse (3D Secure), står
     * fakturaen som `open` — og så er butikken stadig købt, men kunden skal
     * gøre betalingen færdig. Vi tager den IKKE fra dem imens: en manglende
     * betaling er suspension og ikke ophør, og bliver fakturaen aldrig
     * betalt, går hele abonnementet i `past_due` ad den vej, systemet i
     * forvejen kender.
     */
    const fakturaer = await stripe().invoices.list({
      customer: kundeId,
      subscription: sub.id,
      limit: 1,
    });
    const faktura = fakturaer.data[0] ?? null;
    const betalt = faktura?.status === "paid";

    return {
      ok: true,
      kvittering: {
        adresserTilladt: opdateret.quantity ?? (linje.quantity ?? 1) + 1,
        betalt,
        beloebExMoms: Math.round((faktura?.subtotal ?? 0) / 100),
        fakturaUrl: betalt ? null : (faktura?.hosted_invoice_url ?? null),
      },
    };
  } catch (err) {
    return {
      ok: false,
      fejl: "stripe",
      besked: err instanceof Error ? err.message : "ukendt fejl",
    };
  }
}

/**
 * Prisen for skiltet, der følger med den nye adresse.
 *
 * ÉT SKILT OG INGEN MÆNGDERABAT — der bestilles præcis ét til den nye butik.
 * Farven kommer fra DESIGNET og aldrig fra klienten, samme regel som i
 * /api/checkout: ellers kunne nogen bestille sort og betale for hvid.
 */
export function standerPrisForDesign(design: {
  stander_farve: StanderFarve;
  betalFrontfarve: boolean;
}): number {
  const vare = getProduct("ekstra-stander");
  if (!vare) return 0;
  return priceFor(vare, 1, {
    egenFrontfarve: design.betalFrontfarve,
    standerFarve: design.stander_farve,
  }).oneTimeTotal;
}
