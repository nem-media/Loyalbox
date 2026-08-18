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

/**
 * Næste faktureringsdato: den 20. i måneden.
 *
 * Abonnementet trækkes den 20. for den kommende måned. De ti dage frem til
 * månedsskiftet er dunning-vinduet: fejler betalingen, når Stripe at sende to
 * rykkere, før adgangen falder til Basic.
 *
 * Er vi allerede forbi den 20., ankres der på den 20. i næste måned.
 */
export function nextBillingAnchor(now = new Date()): number {
  const anchor = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 20, 9, 0, 0),
  );
  if (anchor.getTime() <= now.getTime()) {
    anchor.setUTCMonth(anchor.getUTCMonth() + 1);
  }
  return Math.floor(anchor.getTime() / 1000);
}
