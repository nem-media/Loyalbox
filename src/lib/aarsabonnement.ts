import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  isStripeConfigured,
  stripeIdsFor,
  kanKoebesAarligt,
} from "@/lib/commerce";
import { erBetalende } from "@/lib/abonnement";
import { getProduct, aarsPris, aarsBesparelse } from "@/lib/constants";
import { findPrislinje, erAarsabonnement } from "@/lib/ekstra-adresse";

/**
 * SKIFT FRA MÅNED TIL ÅR — elleve måneder for tolv.
 *
 * HVORFOR KUN DENNE VEJ. Huset har allerede reglen: opad ja, nedad nej (se
 * `abonnementsSkifteSpaerre()`). Et skift til årsbetaling er en UDVIDELSE —
 * kunden binder sig frivilligt længere og får en måned for det. Den anden vej
 * er noget andet: kunden har betalt for en periode frem, og at gå tilbage til
 * måned midt i den rejser spørgsmålet om, hvad der sker med resten af det
 * betalte. Det kan en knap ikke rumme, og derfor går den vej gennem os.
 *
 * DER ER INGEN BINDING, OG DET SKAL BLIVE VED MED AT VÆRE SANDT.
 * Handelsbetingelsernes §6 siger, at man kan opsige når som helst, og at
 * opsigelsen træder i kraft ved udgangen af den periode, der ALLEREDE er
 * betalt for. Det gælder uændret her — perioden er bare tolv måneder i stedet
 * for én. Årsbetaling er altså en rabat mod forudbetaling og IKKE en
 * bindingsperiode; de to må ikke blandes sammen i teksterne.
 *
 * `always_invoice` OG IKKE `create_prorations`: kunden har selv trykket, og
 * så skal beløbet trækkes nu. Det er den modsatte afvejning af admins
 * adressesalg, hvor kunden har ringet og ikke rørt noget — se
 * `saelgAdresseAdmin()`.
 *
 * ANTALLET FØLGER MED. Linjens `quantity` er kundens betalte QR-adresser
 * (0034). Udelades den ved skiftet, falder abonnementet tilbage til én, og en
 * butik, der står ude i virkeligheden, holder op med at være betalt for.
 */

export type AarsSkifteFejl =
  | "ingen-virksomhed"
  | "intet-abonnement"
  | "ikke-aabnet"
  | "betaler-ikke"
  | "allerede-aarlig"
  | "linjen-mangler"
  | "stripe";

export interface AarsSkifteFelter {
  product_slug?: string | null;
  stripe_status?: string | null;
  stripe_subscription_id?: string | null;
  stripe_customer_id?: string | null;
}

/**
 * Hvad spærrer for et skifte — eller null, hvis der ikke er noget i vejen.
 *
 * REN FUNKTION UDEN NETVÆRK, så knappen og handlingen kan spørge det SAMME
 * uden at koste et Stripe-opslag ved hver sideindlæsning. Den kan ikke se,
 * hvilken pris abonnementet faktisk kører på — det kræver et opslag, og det
 * tager `skiftTilAarsbetaling()` sig af. Derfor er `allerede-aarlig` ikke en
 * grund, den kan give.
 */
export function aarsSkifteSpaerre(
  company: AarsSkifteFelter | null | undefined,
): AarsSkifteFejl | null {
  if (!company) return "ingen-virksomhed";

  const produkt = company.product_slug ? getProduct(company.product_slug) : undefined;
  if (!produkt?.monthlyPrice) return "intet-abonnement";
  if (!company.stripe_subscription_id) return "intet-abonnement";

  /* Findes årsprisen ikke i den tilstand, sitet kører i, findes vejen ikke.
     Se `kanKoebesAarligt()` for hvorfor det er en spærre og ikke en detalje. */
  if (!isStripeConfigured() || !kanKoebesAarligt(produkt)) return "ikke-aabnet";

  /*
    EN KUNDE I RESTANCE SKAL IKKE SKIFTE TIL ÅRSBETALING.
    Et skifte fakturerer straks, og at sende en årsregning til et kort, der
    lige har afvist en månedsregning, hjælper ingen. Genoptagelsen er vejen
    ud af en suspension — ikke en større regning.
  */
  if (!erBetalende(company.stripe_status)) return "betaler-ikke";

  return null;
}

/** Hvad kunden får at se, før hun trykker. */
export function aarsTilbud(company: AarsSkifteFelter | null | undefined): {
  aarPris: number;
  sparer: number;
  maanedPris: number;
} | null {
  if (aarsSkifteSpaerre(company)) return null;
  const produkt = getProduct(company!.product_slug!)!;
  const aar = aarsPris(produkt);
  const sparer = aarsBesparelse(produkt);
  if (aar === null || sparer === null) return null;
  return { aarPris: aar, sparer, maanedPris: produkt.monthlyPrice! };
}

export interface AarsSkifteSvar {
  ok: boolean;
  fejl?: AarsSkifteFejl;
  besked?: string;
}

/**
 * Byt månedsprisen ud med årsprisen på det abonnement, der allerede kører.
 *
 * ÉT ABONNEMENT, ÉN LINJE. Der oprettes ikke et nyt: en virksomhed bærer ét
 * `stripe_subscription_id`, og et abonnement nummer to ville blive usynligt
 * og trække penge i al evighed — det skete 14. september 2026 og er grunden
 * til, at `koebEkstraAdresse()` også hæver antallet på den kørende linje frem
 * for at oprette noget nyt.
 *
 * KOLONNEN `adresser_tilladt` RØRES IKKE HER. Webhooken
 * (`customer.subscription.updated`) læser antallet af Stripes eget svar og
 * skriver det — og den henter abonnementet friskt, netop fordi rækkefølgen
 * på hændelser ikke er garanteret. To steder, der skriver det samme tal, er
 * to steder, der kan komme i utakt.
 */
export async function skiftTilAarsbetaling(
  company: AarsSkifteFelter | null | undefined,
): Promise<AarsSkifteSvar> {
  const spaerre = aarsSkifteSpaerre(company);
  if (spaerre) return { ok: false, fejl: spaerre };

  const produkt = getProduct(company!.product_slug!)!;
  const ids = stripeIdsFor(produkt)!;

  try {
    const sub = await stripe().subscriptions.retrieve(
      company!.stripe_subscription_id!,
    );

    if (erAarsabonnement(sub, ids.yearlyPriceId)) {
      return { ok: false, fejl: "allerede-aarlig" };
    }

    const linje = findPrislinje(sub, ids);
    if (!linje) return { ok: false, fejl: "linjen-mangler" };

    await stripe().subscriptions.update(company!.stripe_subscription_id!, {
      items: [
        {
          id: linje.id,
          price: ids.yearlyPriceId,
          /* ANTALLET SKAL MED. Udelades det, falder linjen tilbage til én, og
             en betalt QR-adresse holder op med at være betalt. */
          quantity: linje.quantity ?? 1,
        },
      ],
      proration_behavior: "always_invoice",
      metadata: { ...(sub.metadata ?? {}), loyalsum_interval: "aar" },
    } satisfies Stripe.SubscriptionUpdateParams);

    return { ok: true };
  } catch (err) {
    return {
      ok: false,
      fejl: "stripe",
      besked: err instanceof Error ? err.message : "ukendt fejl",
    };
  }
}
