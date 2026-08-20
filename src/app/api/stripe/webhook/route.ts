import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForProduct } from "@/lib/constants";
import { noterFejl } from "@/lib/drift";

/**
 * Betalingens id, så en ordre kan spores tilbage til pengene i Stripe.
 *
 * Ved engangskøb står den på sessionen. Ved abonnement er `payment_intent` på
 * sessionen ALTID null — betalingen hænger på den første faktura — så den skal
 * hentes derfra. Bemærk at fakturaens gamle `payment_intent`-felt ikke findes
 * længere; betalingerne ligger i `payments`, som skal udfoldes eksplicit.
 *
 * Fejler opslaget, returneres null frem for at kaste: id'et er til sporing, og
 * en ordre må ikke blive hængende ubetalt, fordi et ekstra kald svigtede.
 */
async function paymentIntentFor(
  session: Stripe.Checkout.Session,
): Promise<string | null> {
  if (typeof session.payment_intent === "string") return session.payment_intent;
  if (typeof session.invoice !== "string") return null;

  try {
    const invoice = await stripe().invoices.retrieve(session.invoice, {
      expand: ["payments"],
    });
    const payment = invoice.payments?.data?.[0]?.payment;
    if (payment?.type !== "payment_intent") return null;
    return typeof payment.payment_intent === "string"
      ? payment.payment_intent
      : (payment.payment_intent?.id ?? null);
  } catch (err) {
    console.error(
      "[stripe] kunne ikke hente payment_intent fra faktura",
      session.invoice,
      err,
    );
    return null;
  }
}

/**
 * Stripes webhook — den eneste kilde til, at en betaling er gået igennem.
 *
 * Signaturen verificeres ALTID først. Uden det kunne hvem som helst POSTe en
 * "betaling gennemført" hertil og give sig selv et abonnement gratis.
 *
 * Kroppen skal læses som rå tekst, ikke som JSON: signaturen er beregnet over
 * de præcise bytes, og en gennemparset og genserialiseret krop matcher ikke.
 */
export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!secret) {
    console.error("[stripe] STRIPE_WEBHOOK_SECRET mangler");
    await noterFejl("stripe-webhook", "STRIPE_WEBHOOK_SECRET mangler — betalinger registreres ikke");
    return NextResponse.json({ error: "ikke konfigureret" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "mangler signatur" }, { status: 400 });
  }

  const raw = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret);
  } catch (err) {
    // Ugyldig signatur: log og afvis. Stripe prøver ikke igen ved 400.
    console.error("[stripe] ugyldig webhook-signatur:", (err as Error).message);
    return NextResponse.json({ error: "ugyldig signatur" }, { status: 400 });
  }

  const admin = createAdminClient();

  try {
    switch (event.type) {
      /* ------------------------------------------------ betaling gennemført */
      case "checkout.session.completed": {
        const session = event.data.object;
        const companyId = session.metadata?.company_id;
        const productSlug = session.metadata?.product_slug;
        if (!companyId || !productSlug) break;

        await admin
          .from("companies")
          .update({
            product_slug: productSlug,
            plan: planForProduct(productSlug),
            stripe_customer_id:
              typeof session.customer === "string" ? session.customer : null,
            stripe_subscription_id:
              typeof session.subscription === "string"
                ? session.subscription
                : null,
          })
          .eq("id", companyId);

        await admin
          .from("orders")
          .update({
            // Betalt ordre går videre til onboarding — det er næste skridt i
            // produktionsflowet, og admin-oversigten tæller netop dem.
            status: "needs_onboarding",
            stripe_payment_intent: await paymentIntentFor(session),
          })
          .eq("stripe_session_id", session.id);
        break;
      }

      /* ------------------------------------------- abonnement ændret/ophørt */
      case "customer.subscription.updated":
      case "customer.subscription.deleted": {
        const sub = event.data.object;
        const companyId = sub.metadata?.company_id;

        // Aktiv og prøveperiode giver adgang. Alt andet — unpaid, past_due
        // efter sidste forsøg, canceled — falder til Basic.
        const stillPaying = sub.status === "active" || sub.status === "trialing";

        const slug = sub.metadata?.product_slug;
        const changes = stillPaying
          ? slug
            ? { product_slug: slug, plan: planForProduct(slug) }
            : null
          : // Falder til Basic: standeren virker videre med sit eget link,
            // men dashboard, statistik og stempelkort lukkes.
            {
              plan: "basic" as const,
              product_slug: null,
              stripe_subscription_id: null,
            };

        if (changes) {
          const q = admin.from("companies").update(changes);
          await (companyId
            ? q.eq("id", companyId)
            : q.eq("stripe_subscription_id", sub.id));
        }
        break;
      }

      default:
        // Alle andre hændelser kvitteres uden handling, så Stripe ikke
        // prøver dem igen i det uendelige.
        break;
    }
  } catch (err) {
    // 500 får Stripe til at prøve igen — det er det rigtige ved en midlertidig
    // fejl i vores ende (fx databasen nede).
    console.error("[stripe] fejl under behandling af", event.type, err);
    await noterFejl(
      "stripe-webhook",
      `Fejl under behandling af ${event.type}: ${(err as Error).message}`,
    );
    return NextResponse.json({ error: "behandlingsfejl" }, { status: 500 });
  }

  return NextResponse.json({ received: true });
}
