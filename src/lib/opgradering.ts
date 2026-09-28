import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import {
  abonnementsSkifteSpaerre,
  canSell,
  isStripeConfigured,
  stripeIdsFor,
  stripeMode,
  type AbonnementsIndehav,
} from "@/lib/commerce";
import { getProduct, STRIPE_TAX_RATES, type Product } from "@/lib/constants";
import { findPrislinje, erAarsabonnement } from "@/lib/ekstra-adresse";
import { periodeSlut } from "@/lib/stripe-abonnement";
import { noterFejl } from "@/lib/drift";

/**
 * OPGRADERING PÅ DET ABONNEMENT, DER ALLEREDE KØRER.
 *
 * HVORFOR IKKE EN NY CHECKOUT. Det var sådan, det var bygget, og det gav to
 * abonnementer: det nye blev skrevet i `stripe_subscription_id`, og det gamle
 * blev ved med at trække — usynligt. Når det gamle så fornyede, skrev
 * webhooken dets vare tilbage på virksomheden, og kunden mistede tavst den
 * vare, hun lige havde betalt for. Fundet 28. september 2026.
 *
 * SÅDAN SKAL DET VÆRE (ejerens beslutning samme dag): kunden betaler
 * DIFFERENCEN nu, og derefter trækkes den fulde nye pris, når
 * abonnementsdatoen kommer igen. Det er præcis, hvad Stripe gør, når prisen
 * på linjen byttes med `proration_behavior: "always_invoice"`: den ubrugte del
 * af den gamle pris modregnes, resten af perioden på den nye opkræves straks,
 * og cyklussen røres ikke.
 *
 * `pending_if_incomplete` ER SPÆRREN MOD EN GRATIS OPGRADERING. Uden den
 * gennemfører Stripe skiftet, selv om betalingen fejler, og fakturaen står
 * åben — kunden ville have Komplet uden at have betalt. Med den venter
 * ændringen, til betalingen er gået igennem, og udløber ellers af sig selv.
 *
 * INTERVALLET BEVARES. En årskunde får årsprisen på den nye vare, en
 * månedskunde månedsprisen. ANTALLET BEVARES — det er kundens QR-adresser, og
 * en betalt adresse må aldrig forsvinde, fordi kunden købte noget MERE.
 *
 * STANDEREN ER DEN SAMME. Den peger på vores egen `/r/<slug>`, så den virker
 * videre med de nye funktioner bagved. Derfor er der ingen standerlinje.
 *
 * DER SKRIVES INGENTING I BASEN HER. Webhooken (`customer.subscription.updated`)
 * henter abonnementet friskt og læser varen af PRISEN (`produktForPriser()`),
 * så `product_slug` og `plan` kommer ét sted fra — samme regel som skiftet
 * til årsbetaling.
 */

export type OpgraderingsFejl =
  | "ingen-virksomhed"
  | "ikke-opgradering"
  | "ikke-aabnet"
  | "linjen-mangler"
  | "betaling-fejlede"
  | "stripe";

export interface OpgraderingsFelter extends AbonnementsIndehav {
  stripe_subscription_id?: string | null;
}

export interface OpgraderingsSvar {
  ok: boolean;
  fejl?: OpgraderingsFejl;
  besked?: string;
  /** Ved en fejlet betaling: fakturaen, kunden kan betale og godkende på. */
  fakturaUrl?: string | null;
  /** Ved ok: trukket nu, i øre inkl. moms — af Stripes faktura. */
  betaltOere?: number | null;
  aarligt?: boolean;
  antal?: number;
  naesteBetaling?: Date | null;
}

export async function opgraderAbonnement(
  company: OpgraderingsFelter | null | undefined,
  maal: Product | undefined,
): Promise<OpgraderingsSvar> {
  if (!company) return { ok: false, fejl: "ingen-virksomhed" };
  if (!maal) return { ok: false, fejl: "ikke-aabnet" };

  // SAMME DØR SOM KNAPPEN: kun det, spærren kalder en opgradering, må ske her.
  if (abonnementsSkifteSpaerre(company, maal) !== "opgradering") {
    return { ok: false, fejl: "ikke-opgradering" };
  }
  if (!company.stripe_subscription_id) return { ok: false, fejl: "ikke-opgradering" };
  if (!isStripeConfigured() || !canSell(maal)) return { ok: false, fejl: "ikke-aabnet" };

  const nuvaerende = getProduct(company.product_slug!);
  const idsNu = nuvaerende ? stripeIdsFor(nuvaerende) : undefined;
  const idsMaal = stripeIdsFor(maal);
  const taxRate = STRIPE_TAX_RATES[stripeMode()];
  if (!idsNu || !idsMaal || !taxRate) return { ok: false, fejl: "ikke-aabnet" };

  try {
    const sub = await stripe().subscriptions.retrieve(
      company.stripe_subscription_id,
    );

    const linje = findPrislinje(sub, idsNu);
    if (!linje) return { ok: false, fejl: "linjen-mangler" };

    // Satsen kan ikke sættes i samme kald (se nedenfor), så den SKAL sidde
    // på linjen i forvejen. Gør den ikke, ville differencen blive faktureret
    // uden moms, uden at noget fejlede — hellere et nej og en alarm.
    const tr = (linje.tax_rates ?? []) as Array<string | { id: string }>;
    if (!tr.some((t) => (typeof t === "string" ? t : t.id) === taxRate)) {
      await noterFejl(
        "opgradering",
        `Abonnementslinjen på ${sub.id} har ikke momssatsen ${taxRate} — opgradering afvist.`,
      );
      return { ok: false, fejl: "linjen-mangler" };
    }

    const aarligt = erAarsabonnement(sub, idsNu.yearlyPriceId);
    const nyPris = aarligt ? idsMaal.yearlyPriceId : idsMaal.monthlyPriceId;
    // En årskunde kan ikke flyttes over på en vare uden årspris: det ville
    // stille skifte hende til månedsbetaling.
    if (!nyPris) return { ok: false, fejl: "ikke-aabnet" };

    const antal = linje.quantity ?? 1;
    const opdateret = await stripe().subscriptions.update(sub.id, {
      items: [
        {
          id: linje.id,
          price: nyPris,
          quantity: antal,
          /* INGEN `tax_rates` HER — `pending_if_incomplete` afviser feltet.
             Satsen sidder på LINJEN fra købet og følger med, når prisen
             byttes; efterprøvet mod Stripe test 28. sep. 2026: linjen bar
             stadig satsen, og differencefakturaen havde 25 % moms. */
        },
      ],
      proration_behavior: "always_invoice",
      payment_behavior: "pending_if_incomplete",
      expand: ["latest_invoice"],
    } satisfies Stripe.SubscriptionUpdateParams);

    const faktura =
      typeof opdateret.latest_invoice === "object"
        ? opdateret.latest_invoice
        : null;

    if (opdateret.pending_update) {
      // Betalingen gik ikke igennem (afvist kort, 3D Secure). Skiftet venter
      // og udløber af sig selv — kunden har IKKE fået den nye vare.
      return {
        ok: false,
        fejl: "betaling-fejlede",
        fakturaUrl: faktura?.hosted_invoice_url ?? null,
      };
    }

    /* METADATAEN RETTES BAGEFTER, OG DET ER OPRYDNING. Webhooken læser
       varen af prisen, så en fejl her ændrer intet for kunden; den noteres,
       så nogen kan se, hvorfor et abonnement bærer et gammelt navn. Det kan
       ikke ske i samme kald: `pending_if_incomplete` tager ikke imod
       metadata. */
    try {
      await stripe().subscriptions.update(sub.id, {
        metadata: { ...(sub.metadata ?? {}), product_slug: maal.slug },
      });
    } catch (err) {
      await noterFejl(
        "opgradering",
        `Metadata på ${sub.id} kunne ikke rettes til ${maal.slug}: ${(err as Error).message}`,
      );
    }

    return {
      ok: true,
      betaltOere: faktura?.amount_paid ?? null,
      aarligt,
      antal,
      naesteBetaling: periodeSlut(opdateret),
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
 * Betaler kunden årligt i dag? Til `/bestil`, så opgraderingsboksen kan vise
 * den pris, kunden faktisk kommer til at betale — og ikke en månedspris til en
 * årskunde. Et opslag hos Stripe, kun i den ene gren. Kan det ikke hentes,
 * svares null, og boksen viser månedsprisen med intervallet sagt ud.
 */
export async function betalerAarligt(
  company: OpgraderingsFelter | null | undefined,
): Promise<boolean | null> {
  if (!company?.stripe_subscription_id || !isStripeConfigured()) return null;
  const nuvaerende = getProduct(company.product_slug ?? "");
  const ids = nuvaerende ? stripeIdsFor(nuvaerende) : undefined;
  if (!ids) return null;
  try {
    const sub = await stripe().subscriptions.retrieve(
      company.stripe_subscription_id,
    );
    return erAarsabonnement(sub, ids.yearlyPriceId);
  } catch {
    return null;
  }
}
