import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForProduct, getProduct } from "@/lib/constants";
import { sendIntern } from "@/lib/mail";
import { ordrevarsel, type Koebstype } from "@/lib/ordrevarsel";
import { erBetalende } from "@/lib/abonnement";
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
 * Sender varslet om et køb til os selv.
 *
 * Beløbet tages fra `amount_subtotal`, som er UDEN moms — det er de tal,
 * priserne i constants.ts er sat i, og et varsel med momsen indregnet ville
 * ikke kunne sammenlignes med varen.
 *
 * Leveringsadressen har flyttet sig mellem Stripes API-versioner. Begge steder
 * læses derfor, frem for at varslet stille mister adressen den dag versionen
 * hæves — og uden adresse kan ordren ikke pakkes.
 *
 * Funktionen kaster ALDRIG. Et varsel, der fejler, må ikke få webhooken til at
 * svare 500 og få Stripe til at sende hændelsen igen: så ville kundeforholdet
 * blive skrevet to gange for en mail, der alligevel ikke virkede.
 */
async function varslOmKoeb(
  session: Stripe.Checkout.Session,
  productSlug: string,
  type: Koebstype,
  firma: { name?: string | null; cvr?: string | null } | null,
): Promise<void> {
  try {
    const vare = getProduct(productSlug);

    const s = session as unknown as {
      shipping_details?: { address?: Record<string, string | null> | null } | null;
      collected_information?: {
        shipping_details?: { address?: Record<string, string | null> | null } | null;
      } | null;
    };
    const adresse =
      s.collected_information?.shipping_details?.address ??
      s.shipping_details?.address ??
      null;

    const leveringslinjer = adresse
      ? [
          session.customer_details?.name ?? firma?.name ?? "",
          adresse.line1 ?? "",
          adresse.line2 ?? "",
          [adresse.postal_code, adresse.city].filter(Boolean).join(" "),
          adresse.country ?? "",
        ].filter((l) => l.trim().length > 0)
      : [];

    const antal = Number(session.metadata?.quantity ?? 1) || 1;

    const { emne, tekst } = ordrevarsel({
      type,
      vare: vare?.name ?? productSlug,
      antal,
      // amount_subtotal er i oere og UDEN moms.
      beloeb: Math.round((session.amount_subtotal ?? 0) / 100),
      maanedligt: vare?.monthlyPrice ?? null,
      firmanavn: firma?.name ?? session.customer_details?.name ?? null,
      cvr: firma?.cvr ?? session.customer_details?.tax_ids?.[0]?.value ?? null,
      email: session.customer_details?.email ?? null,
      leveringslinjer,
      sessionId: session.id,
    });

    if (!(await sendIntern(emne, tekst))) {
      await noterFejl("ordrevarsel", `Kunne ikke sendes for ${session.id}`);
    }
  } catch (err) {
    await noterFejl(
      "ordrevarsel",
      `Fejl under varsel for ${session.id}: ${(err as Error).message}`,
    );
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

        const kundeId =
          typeof session.customer === "string" ? session.customer : null;

        // Hentes FØR opdateringen: om der allerede var en vare, er det, der
        // skiller et nyt abonnement fra en opgradering — og efter opdateringen
        // er svaret altid "ja".
        const { data: bestaaende } = await admin
          .from("companies")
          .select("name, cvr, product_slug, stripe_customer_id, contact_email")
          .eq("id", companyId)
          .maybeSingle();

        const erAbonnement = typeof session.subscription === "string";
        const type: Koebstype = erAbonnement
          ? bestaaende?.product_slug
            ? "opgradering"
            : "nyt-abonnement"
          : getProduct(productSlug)?.addon
            ? "tilkoeb"
            : "engangskoeb";

        // Varslet sendes UANSET hvad der sker nedenfor, og fejler det, ryger
        // det i driftsloggen. En ordre, ingen ved noget om, er værre end en
        // mail, der ikke kom af sted.
        void varslOmKoeb(session, productSlug, type, bestaaende ?? null);

        if (erAbonnement && typeof session.subscription === "string") {
          // ABONNEMENTSKØB. Det er her kundeforholdet sættes eller genoptages:
          // niveau, vare og abonnement følger den vare, der lige blev betalt,
          // og enhver suspension ophæves — købet er nyere end alt det gamle.
          await admin
            .from("companies")
            .update({
              product_slug: productSlug,
              plan: planForProduct(productSlug),
              stripe_customer_id: kundeId,
              stripe_subscription_id: session.subscription,
              stripe_status: "active",
              suspenderet_siden: null,
              ophoert_den: null,
              sletning_bestilt_den: null,
              sletning_token: null,
              sletning_udfoeres_den: null,
            })
            .eq("id", companyId);
          break;
        }

        // ENGANGSKØB — en stander uden abonnement, enten den almindelige
        // Reviewstander eller et tilkøb.
        //
        // ET ENGANGSKØB MÅ ALDRIG ÆNDRE ET BESTÅENDE KUNDEFORHOLD. Før gjorde
        // det tre ting galt på én gang, hvis en Pro-kunde bestilte et skilt
        // mere: niveauet faldt til basic (varen har ingen månedspris),
        // `stripe_status` blev sat til null, og en igangværende suspension
        // blev ophævet, selvom det manglende abonnement ikke var betalt.
        //
        // Reglen er derfor: et engangskøb ETABLERER et kundeforhold, hvis der
        // ikke er et, og rører det ellers ikke. Kun kundenummeret gemmes, så
        // kvitteringerne hænger sammen.
        if (!bestaaende?.product_slug) {
          await admin
            .from("companies")
            .update({
              product_slug: productSlug,
              plan: planForProduct(productSlug),
              stripe_customer_id: kundeId,
            })
            .eq("id", companyId);
          break;
        }

        if (kundeId && !bestaaende.stripe_customer_id) {
          await admin
            .from("companies")
            .update({ stripe_customer_id: kundeId })
            .eq("id", companyId);
        }

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
        const slug = sub.metadata?.product_slug;

        // Virksomheden findes på sit id, eller — mangler metadataen — på
        // abonnementet. Nøglen udregnes én gang og bruges til hver opdatering.
        const noegle: ["id", string] | ["stripe_subscription_id", string] =
          companyId ? ["id", companyId] : ["stripe_subscription_id", sub.id];

        if (erBetalende(sub.status)) {
          // Betalingen er på plads: adgangen tilbage, og uret nulstilles. Et
          // ophør, der endnu ikke er nået at blive udført, fortrydes her.
          await admin
            .from("companies")
            .update({
              ...(slug ? { product_slug: slug, plan: planForProduct(slug) } : {}),
              stripe_status: sub.status,
              suspenderet_siden: null,
              ophoert_den: null,
            })
            .eq(noegle[0], noegle[1]);
          break;
        }

        // SUSPENSION — ikke ophør. Adgangen til dashboardets indsigt falder til
        // Basic, men alt ved skranken kører videre, og der slettes ingenting i
        // seks måneder. Se src/lib/abonnement.ts for hvorfor.
        //
        // `stripe_subscription_id` nulstilles IKKE længere. Uden den kunne vi
        // ikke se forskel på et abonnement, der kan reddes med et nyt kort, og
        // et der er lukket — og kunden ville få den forkerte knap.
        //
        // `product_slug` bliver også stående: det er kvitteringen for, hvad
        // kunden købte, og uden den kan et abonnement ikke genoptages.
        await admin
          .from("companies")
          .update({ plan: "basic" as const, stripe_status: sub.status })
          .eq(noegle[0], noegle[1]);

        // Starttidspunktet sættes KUN, hvis der ikke allerede står et. Stripe
        // sender flere opdateringer på vej gennem rykkerforløbet, og uden
        // filteret ville hver af dem skubbe de seks måneder foran sig — så
        // ville fristen aldrig løbe ud, og aftalen aldrig ophøre.
        await admin
          .from("companies")
          .update({ suspenderet_siden: new Date().toISOString() })
          .eq(noegle[0], noegle[1])
          .is("suspenderet_siden", null);
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
