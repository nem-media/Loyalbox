import "server-only";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { isStripeConfigured } from "@/lib/commerce";

/**
 * Betalingsoplysningerne til admin — hentet LIVE hos Stripe.
 *
 * HVORFOR IKKE FRA DATABASEN. Fordi den ikke findes der. Webhooken gemmer
 * `stripe_status`, `stripe_subscription_id` og `suspenderet_siden` på
 * virksomheden, men INGEN fornyelsesdato. Tabellen `subscriptions` har en
 * `current_period_end`-kolonne fra 0001, og der er aldrig blevet skrevet en
 * eneste række i den — den er død kode.
 *
 * DER BLEV IKKE TILFØJET EN KOLONNE, og det er et bevidst valg med tre grunde:
 * en migration køres i hånden i Supabase (se AGENTS.md) og ville blokere hele
 * siden, indtil nogen huskede det; en gemt dato er kun så frisk som den
 * seneste webhook, og en misset hændelse ville vise en forkert dato med fuld
 * selvtillid; og Stripe ER sandheden om penge — samme grund til at webhooken
 * er eneste kilde til, at en betaling er gået igennem. Der er få abonnenter,
 * og admin er ikke en side, kunder venter på.
 *
 * SIDEN SKAL VIRKE UDEN STRIPE. Er nøglen ikke sat, eller svarer Stripe ikke,
 * returneres et tomt kort, og listen viser stadig alt, vi selv ved, med en
 * tankestreg i betalingskolonnen. En administrationsside, der giver 500, fordi
 * en nøgle mangler i et miljø, er værre end en, der siger hvad den ikke ved.
 */

export interface Betaling {
  /** Stripes egen status lige nu — kan afvige fra vores gemte, hvis en webhook er misset. */
  status: string;
  /** Hvornår der trækkes næste gang. Null hvis abonnementet er slut. */
  naesteBetaling: Date | null;
  /** Beløbet i mindste enhed (øre). Null hvis prisen ikke kan læses. */
  beloebOere: number | null;
  valuta: string;
  /** Opsagt, men kører perioden ud. Kunden betaler ikke igen. */
  stopperVedPeriodeslut: boolean;
  /** Kortet, der trækkes på. Null betyder ikke "intet kort" — se `kortTekst()`. */
  kort: string | null;
}

/**
 * Loft over hvor mange abonnementer der hentes.
 *
 * Der er en håndfuld i dag. Loftet er der, fordi en side, der henter uden
 * grænse, holder op med at svare den dag der er tusind — og fejlen ville komme
 * som en timeout, ikke som noget, der pegede på den her linje.
 */
const MAKS_ABONNEMENTER = 500;

/**
 * Hvornår trækkes der næste gang?
 *
 * `current_period_end` FLYTTEDE. Til og med API 2025-03-31 lå den på selve
 * abonnementet; i den version, vi er låst til (2026-07-29.dahlia), ligger den
 * på hver LINJE, fordi linjer kan have hver sin periode. Læses den på
 * abonnementet, er den `undefined`, og datoen ville stille blive tom for alle.
 *
 * Vi tager den SENESTE af linjerne. Vi har én linje pr. abonnement i dag, men
 * med to ville den tidligste være en dato, hvor kunden ikke er færdigbetalt.
 */
function periodeSlut(sub: Stripe.Subscription): Date | null {
  const slutninger = sub.items.data
    .map((i) => i.current_period_end)
    .filter((n): n is number => typeof n === "number" && n > 0);
  if (!slutninger.length) return null;
  return new Date(Math.max(...slutninger) * 1000);
}

/** Hvad der trækkes, i øre. Summen af linjerne, så en ekstra linje tælles med. */
function beloebOere(sub: Stripe.Subscription): number | null {
  let sum = 0;
  let fandtNoget = false;
  for (const linje of sub.items.data) {
    const enhed = linje.price?.unit_amount;
    if (typeof enhed !== "number") continue;
    sum += enhed * (linje.quantity ?? 1);
    fandtNoget = true;
  }
  return fandtNoget ? sum : null;
}

/**
 * Kortet, der trækkes på.
 *
 * NULL BETYDER IKKE "INGEN KORT". Betalingsmetoden kan sidde på KUNDEN
 * (`invoice_settings.default_payment_method`) i stedet for på abonnementet, og
 * så er feltet her tomt, mens der udmærket trækkes. Teksten i brugerfladen
 * siger derfor "ikke oplyst" og ikke "mangler kort" — det sidste ville sende
 * nogen ud at ringe til en kunde, der ikke fejler noget.
 *
 * UDLØBSDATOEN ER DEN VIGTIGE. Et kort, der udløber i næste måned, er den
 * mest almindelige grund til, at et velfungerende abonnement pludselig går i
 * past_due.
 */
function kortTekst(sub: Stripe.Subscription): string | null {
  const pm = sub.default_payment_method;
  if (!pm || typeof pm === "string") return null;
  const kort = pm.card;
  if (!kort) return null;
  const maaned = String(kort.exp_month).padStart(2, "0");
  return `${kort.brand} •••• ${kort.last4} · udløber ${maaned}/${kort.exp_year}`;
}

/**
 * Slår betalingsoplysningerne op for de abonnementer, der bliver spurgt om.
 *
 * ÉT KALD OG IKKE ÉT PR. KUNDE. Listen hentes samlet og slås op på id — med et
 * kald pr. række ville en side med tyve abonnenter lave tyve rundture, og
 * Stripes hastighedsgrænse ville ramme os, længe før nogen opdagede hvorfor.
 *
 * `status: "all"` er nødvendig: standardlisten udelader annullerede, og en
 * opsagt kunde er præcis en, admin skal kunne se.
 */
export async function hentBetalinger(
  abonnementsIder: Array<string | null | undefined>,
): Promise<Map<string, Betaling>> {
  const soegte = new Set(abonnementsIder.filter((id): id is string => Boolean(id)));
  const kort = new Map<string, Betaling>();
  if (!soegte.size || !isStripeConfigured()) return kort;

  try {
    const alle = await stripe()
      .subscriptions.list({
        status: "all",
        limit: 100,
        expand: ["data.default_payment_method"],
      })
      .autoPagingToArray({ limit: MAKS_ABONNEMENTER });

    for (const sub of alle) {
      if (!soegte.has(sub.id)) continue;
      kort.set(sub.id, {
        status: sub.status,
        naesteBetaling: periodeSlut(sub),
        beloebOere: beloebOere(sub),
        valuta: (sub.currency ?? "dkk").toUpperCase(),
        stopperVedPeriodeslut: Boolean(sub.cancel_at_period_end),
        kort: kortTekst(sub),
      });
    }
  } catch (err) {
    // Logges og sluges. Se filens hoved: listen skal stadig kunne vises med
    // det, vi selv ved. En tom Map er den ærlige udgave af "vi spurgte ikke".
    console.error("[admin] kunne ikke hente abonnementer fra Stripe:", err);
  }

  return kort;
}
