import Stripe from "stripe";

/**
 * Stripe-klient. Server-only — nøglen må aldrig nå browseren.
 *
 * API-versionen er låst med vilje. Uden den følger klienten kontoens
 * standardversion, som Stripe kan flytte under os, og så kan et svar skifte
 * form midt i produktion. Opgradering skal være et bevidst valg.
 */
const API_VERSION = "2026-07-29.dahlia";

let client: Stripe | null = null;

export function stripe(): Stripe {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error(
      "STRIPE_SECRET_KEY mangler. Betaling er ikke konfigureret i dette miljø.",
    );
  }
  if (!client) {
    client = new Stripe(key, {
      apiVersion: API_VERSION as Stripe.LatestApiVersion,
      appInfo: { name: "LoyalSum", url: "https://loyalsum.dk" },
    });
  }
  return client;
}

/**
 * Tag på checkout-sessioner, så flows kan sammenlignes i Stripes dashboard.
 * Suffikset er otte bogstaver, jf. Stripes anbefaling.
 */
export const INTEGRATION_ID = "loyalsum-checkout-hjkmnpqr";

/*
 * DER SÆTTES INTET FAKTURERINGSANKER — OG DET ER ET VALG, IKKE EN MANGEL.
 *
 * Her lå `nextBillingAnchor()`, som ankrede hver kundes abonnement til den 20.
 * i måneden. Stripe kan ikke ankre en cyklus til en fast dato OG opkræve fuld
 * pris for en periode, der starter en anden dag, så den skæve første periode
 * blev faktureret pro rata. Beløbet var rigtigt; det var bare ikke det, der
 * stod på siden — og et beløb, kunden ikke kan genkende, er dét, indsigelser
 * og opkald er lavet af. Ordrebekræftelsen gjorde det værre: den skrev
 * "Betalt nu: 399 kr.", fordi ordrens beløb er LISTEPRISEN, mens kortet blev
 * trukket for noget andet.
 *
 * Uden anker bruger Stripe købsdatoen som cyklussens start: fuld pris med det
 * samme, og derefter samme dato hver måned. Prisen for det er, at
 * trækdatoerne spreder sig ud over månedens dage — rykkervinduet ligger, hvor
 * det nu falder, og et tilkøb kan ikke længere love en bestemt fakturadato.
 * Det er byttet bevidst for, at første betaling er den pris, kunden har set.
 *
 * TILKØB PRORATERES STADIG, og det er en anden sag: køber en butik adresse
 * nr. 2 midt i en periode, hæves antallet på den linje, der allerede kører
 * (se `ekstra-adresse.ts`), og Stripe beregner forskellen for de resterende
 * dage. Alternativet ville være at nulstille hele kundens cyklus, fordi de
 * købte et skilt mere.
 */
