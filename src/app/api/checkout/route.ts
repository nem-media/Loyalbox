import { NextResponse, type NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, nextBillingAnchor, INTEGRATION_ID } from "@/lib/stripe";
import { stripeIdsFor, stripeMode, isTestBuyer, canSell } from "@/lib/commerce";
import {
  getProduct,
  priceFor,
  MAX_QTY,
  STRIPE_TAX_RATES,
} from "@/lib/constants";
import { getSiteUrl } from "@/lib/site";
import { DPA_VERSION, requiresDpa } from "@/lib/dpa";

/**
 * Starter en betaling og sender kunden til Stripe Checkout.
 *
 * KRÆVER LOGIN. Betalingen knyttes til en virksomhed, og uden den ved vi ikke,
 * hvem der skal have adgangen bagefter. Rækkefølgen er derfor: opret konto →
 * betal.
 *
 * ADGANG I TESTTILSTAND: så længe nøglen er en testnøgle, kan kun testkontiene
 * starte en betaling. Ellers ville en rigtig besøgende møde en checkout, der kun
 * accepterer testkort — de ville indtaste deres eget kort og få det afvist.
 * Rollen duer ikke som filter: admin har ingen virksomhed og ville aldrig nå
 * hertil (se canStartCheckout i src/lib/commerce.ts).
 *
 * Prisen beregnes ALTID serverside med priceFor(). Antallet kommer fra
 * klienten og må aldrig bestemme en pris; kun hvor mange enheder der købes.
 */
export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Log ind først." }, { status: 401 });
  }

  if (stripeMode() === "test" && !isTestBuyer(user.email)) {
    return NextResponse.json(
      { error: "Betaling er endnu ikke åben." },
      { status: 403 },
    );
  }

  const company = user.company;
  if (!company) {
    return NextResponse.json(
      { error: "Din bruger er ikke knyttet til en virksomhed." },
      { status: 400 },
    );
  }

  const body = await request.json().catch(() => ({}));
  const product = getProduct(String(body.produkt ?? ""));
  if (!product) {
    return NextResponse.json({ error: "Ukendt produkt." }, { status: 400 });
  }

  const qty = Math.max(1, Math.min(MAX_QTY, Number(body.antal) || 1));
  // Varen skal være fuldt oprettet i den aktuelle tilstand — produkt, månedspris
  // OG momssats. Uden spærren ville et manglende led fejle stille; se canSell.
  if (!canSell(product)) {
    return NextResponse.json(
      {
        error:
          "Produktet er ikke oprettet i Stripe i denne tilstand. Kør scripts/setup-stripe-products.mjs.",
      },
      { status: 500 },
    );
  }
  const ids = stripeIdsFor(product)!;

  // canSell har allerede slået fast, at satsen og månedsprisen findes i denne
  // tilstand — derfor er det trygt at kræve dem her.
  const taxRate = STRIPE_TAX_RATES[stripeMode()]!;
  const pricing = priceFor(product, qty);
  const base = getSiteUrl();
  const sub = Boolean(product.monthlyPrice);

  // Standeren sendes som price_data med den rabatterede enhedspris, så
  // mængderabatten kun findes ét sted (VOLUME_DISCOUNTS). Produktet peger på
  // det rigtige Stripe-produkt, så fakturaen viser varens navn.
  const lineItems: Record<string, unknown>[] = [
    {
      quantity: qty,
      tax_rates: [taxRate],
      price_data: {
        currency: "dkk",
        product: ids.productId,
        unit_amount: Math.round(pricing.standUnit * 100),
        tax_behavior: "exclusive",
      },
    },
  ];
  if (sub) {
    lineItems.push({
      price: ids.monthlyPriceId,
      quantity: 1,
      tax_rates: [taxRate],
    });
  }

  // Databehandleraftalen indgås som en del af købet, når varen giver adgang
  // til at indsamle oplysninger om butikkens egne kunder. Accepten stemples
  // FØR betalingen sættes i gang: fejler betalingen, har kunden ikke fået
  // noget, og en accept uden køb er harmløs — modsat et køb uden accept.
  if (requiresDpa(product)) {
    const { error: dpaError } = await createAdminClient()
      .from("companies")
      .update({
        dpa_accepted_at: new Date().toISOString(),
        dpa_version: DPA_VERSION,
      })
      .eq("id", company.id)
      // Kun hvis den gældende version ikke allerede er accepteret, så en
      // gentagen bestilling ikke flytter datoen for den oprindelige accept.
      .or(`dpa_version.is.null,dpa_version.neq.${DPA_VERSION}`);

    // Købet stoppes ikke af dette: aftalen er indgået i kraft af teksten ved
    // købsknappen, uanset om vi fik skrevet datoen ned. Men fejlen skal ses —
    // mangler kolonnen (migration 0010 ikke kørt), står kunden ellers uden
    // registreret accept, og ingen ville opdage det.
    if (dpaError) {
      console.error(
        "[dpa] kunne ikke registrere accept for virksomhed",
        company.id,
        dpaError.message,
      );
    }
  }

  const session = await stripe().checkout.sessions.create({
    mode: sub ? "subscription" : "payment",
    // payment_method_types sættes bevidst IKKE — Stripe vælger dynamisk de
    // metoder, der er slået til i dashboardet, og som passer til kunden.
    line_items: lineItems as never,
    integration_identifier: INTEGRATION_ID,
    client_reference_id: company.id,
    locale: "da",
    billing_address_collection: "required",
    // Momsnummer på fakturaen — dansk B2B skal kunne bogføre den.
    tax_id_collection: { enabled: true },
    ...(company.stripe_customer_id
      ? { customer: company.stripe_customer_id }
      : { customer_email: company.billing_email ?? company.contact_email ?? user.email }),
    metadata: {
      company_id: company.id,
      product_slug: product.slug,
      quantity: String(qty),
    },
    ...(sub
      ? {
          subscription_data: {
            // Fast trækdato den 20. Perioden fra køb til første fulde træk
            // faktureres med det samme (Stripes standard create_prorations),
            // så kunden betaler fra købsdato og derefter fast den 20.
            billing_cycle_anchor: nextBillingAnchor(),
            metadata: {
              company_id: company.id,
              product_slug: product.slug,
            },
          },
        }
      : { invoice_creation: { enabled: true } }),
    success_url: `${base}/bestil/tak?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${base}/bestil?produkt=${product.slug}&antal=${qty}`,
  });

  // Ordren gemmes som "ny" allerede her, så en betaling der aldrig fuldføres
  // stadig kan ses. Webhooken opdaterer den, når pengene er hjemme.
  await createAdminClient()
    .from("orders")
    .insert({
      company_id: company.id,
      product_name: product.name,
      product_slug: product.slug,
      quantity: qty,
      total_amount: pricing.oneTimeTotal,
      stripe_session_id: session.id,
    });

  return NextResponse.json({ url: session.url });
}
