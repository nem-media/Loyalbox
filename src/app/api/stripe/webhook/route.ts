import { NextResponse, after, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { stripe } from "@/lib/stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { planForProduct, getProduct } from "@/lib/constants";
import { sendIntern, sendKundeMail } from "@/lib/mail";
import { ordrevarsel, type Koebstype } from "@/lib/ordrevarsel";
import { ordrebekraeftelse } from "@/lib/ordrebekraeftelse";
import { erBetalende } from "@/lib/abonnement";
import { noterFejl } from "@/lib/drift";
import { generateSlug } from "@/lib/utils";
import { skalOpretteFoersteStander } from "@/lib/commerce";
import { qrAdresseFor } from "@/lib/qr-adresse";

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
/**
 * Leveringsadressen, som Stripe gav den.
 *
 * Feltet har flyttet sig mellem API-versioner: den lå før direkte på
 * sessionen og ligger nu under `collected_information`. Begge steder læses,
 * så en versionsopgradering ikke stille fjerner adressen — og uden adresse
 * kan ordren ikke pakkes.
 */
function leveringsadresse(
  session: Stripe.Checkout.Session,
): Record<string, string | null> | null {
  const s = session as unknown as {
    shipping_details?: {
      address?: Record<string, string | null> | null;
    } | null;
    collected_information?: {
      shipping_details?: {
        address?: Record<string, string | null> | null;
      } | null;
    } | null;
  };
  return (
    s.collected_information?.shipping_details?.address ??
    s.shipping_details?.address ??
    null
  );
}

/**
 * Hvad kommer der til at stå i QR-koden på det skilt, vi lige har solgt?
 *
 * LÆSES TIL SIDST OG IKKE UNDERVEJS. Standeren kan være oprettet af dette
 * kald, og destinationen kan være skrevet et par linjer inde — at samle
 * svaret op fra de variabler ville betyde, at rækkefølgen i funktionen
 * afgjorde, hvad kunden fik at vide. Her spørges basen om den færdige
 * tilstand, præcis som trykfilen gør det bagefter.
 *
 * Reglen selv står i `qrAdresseFor()`: gennem os med abonnement, direkte på
 * butikkens eget link uden.
 */
async function hentQrAdresse(
  admin: ReturnType<typeof createAdminClient>,
  sessionId: string,
): Promise<{ adresse: string | null; fast: boolean }> {
  const { data } = await admin
    .from("orders")
    .select(
      "stand:stands(slug, kun_viderestilling, destination_type, google_review_url, trustpilot_url, facebook_url, custom_url)",
    )
    .eq("stripe_session_id", sessionId)
    .maybeSingle();

  const stand = data?.stand;
  if (!stand) return { adresse: null, fast: false };
  return { adresse: qrAdresseFor(stand), fast: stand.kun_viderestilling };
}

async function varslOmKoeb(
  session: Stripe.Checkout.Session,
  productSlug: string,
  type: Koebstype,
  firma: { name?: string | null; cvr?: string | null } | null,
  /**
   * Skal KUNDEN også have en bekræftelse?
   *
   * Afgøres af kalderen, fordi kun den ved, om ordren stadig stod som `new` —
   * altså om det er første gang, denne betaling behandles. Stripe gentager en
   * webhook, der ikke svarer hurtigt nok, og to ordrebekræftelser for det
   * samme køb får en kunde til at tro, de er blevet trukket to gange.
   */
  bekraeftTilKunde: boolean,
  qr: { adresse: string | null; fast: boolean },
): Promise<void> {
  try {
    const vare = getProduct(productSlug);

    const adresse = leveringsadresse(session);

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

    /*
     * ÉT DATASÆT, TO MAILS. Varslet til os og bekræftelsen til kunden bygges
     * på de samme `Ordredetaljer`. Byggede de hver sit, ville de før eller
     * siden komme til at sige forskellige ting om det samme køb — og det er
     * kundens udgave, der ville blive troet på.
     */
    const detaljer = {
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
      qrAdresse: qr.adresse,
      qrFast: qr.fast,
    };

    const { emne, tekst } = ordrevarsel(detaljer);
    if (!(await sendIntern(emne, tekst))) {
      await noterFejl("ordrevarsel", `Kunne ikke sendes for ${session.id}`);
    }

    /*
     * BEKRÆFTELSEN TIL KUNDEN.
     *
     * Sendes EFTER varslet til os, og det er bevidst: går mailen til kunden
     * galt, skal vi stadig vide, at der er noget at pakke. Rækkefølgen er den
     * eneste, hvor den vigtigste besked altid kommer af sted.
     *
     * Stripes egen kvittering er slået fra i dashboardet, så uden denne mail
     * hører kunden intet efter købet.
     */
    if (bekraeftTilKunde && detaljer.email) {
      const kunde = ordrebekraeftelse(detaljer);
      if (!(await sendKundeMail(detaljer.email, kunde.emne, kunde.tekst))) {
        await noterFejl(
          "ordrebekraeftelse",
          `Kunne ikke sendes til kunden for ${session.id}`,
        );
      }
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
    await noterFejl(
      "stripe-webhook",
      "STRIPE_WEBHOOK_SECRET mangler — betalinger registreres ikke",
    );
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

        // Tillaegget for egen frontfarve er nu betalt for DETTE design, og en
        // genbestilling af det skal vaere gratis. Markeringen sker her og ikke
        // i checkout, fordi checkout kun betyder "kunden gik til betaling" —
        // en afbrudt betaling maa ikke goere farven gratis.
        const designId = session.metadata?.design_id;
        if (designId) {
          const { error } = await admin
            .from("designs")
            .update({ frontfarve_betalt: true })
            .eq("id", designId)
            .eq("company_id", companyId);
          if (error) {
            await noterFejl(
              "design",
              `Kunne ikke markere frontfarve betalt for design ${designId}: ${error.message}`,
            );
          }
        }

        /**
         * Sæt destinationen på standeren, når pengene er hjemme (0022).
         *
         * Den står også på ORDREN, men dét er bilaget. Standeren er dét,
         * QR-koden faktisk peger på, og uden dette skridt ville kunden have
         * betalt for et skilt med en destination, der kun fandtes i en
         * ordrelinje.
         *
         * Kolonnerne skrives EKSPLICIT og ikke via en beregnet nøgle: en
         * dynamisk nøgle river typerne fra Supabase-klienten fra hinanden,
         * og så er der ingen, der fanger en stavefejl i et kolonnenavn.
         */
        const { data: ordreDest } = await admin
          .from("orders")
          .select("stand_id, destination_type, destination_url, status")
          .eq("stripe_session_id", session.id)
          .maybeSingle();

        const dType = ordreDest?.destination_type;
        const dUrl = ordreDest?.destination_url;

        if (ordreDest?.stand_id && dType && dUrl) {
          const { error } = await admin
            .from("stands")
            .update({
              destination_type: dType,
              ...(dType === "google"
                ? { google_review_url: dUrl }
                : dType === "trustpilot"
                  ? { trustpilot_url: dUrl }
                  : dType === "facebook"
                    ? { facebook_url: dUrl }
                    : { custom_url: dUrl }),
            })
            .eq("id", ordreDest.stand_id);

          if (error) {
            await noterFejl(
              "stripe-webhook",
              `Kunne ikke sætte destination på stander ${ordreDest.stand_id}: ${error.message}`,
            );
          }
        }

        const erAbonnement = typeof session.subscription === "string";
        const type: Koebstype = erAbonnement
          ? bestaaende?.product_slug
            ? "opgradering"
            : "nyt-abonnement"
          : getProduct(productSlug)?.addon
            ? "tilkoeb"
            : "engangskoeb";

        /**
         * FØRSTE STANDER OPRETTES VED KØBET.
         *
         * Uden dette skal en ny kunde selv finde ud af at oprette en
         * QR-adresse, før skiltet kan trykkes — og indtil de gør, står
         * trykfilen med skabelonens pladsholder i stedet for deres egen kode.
         * Vi ville altså sende et skilt, der ikke virker, til en kunde der
         * lige har betalt.
         *
         * KUN VED ABONNEMENT. Et engangskøb af Reviewstander har ingen
         * QR-adresse i dashboardet (se harAbonnement), og et tilkøb af et
         * ekstra skilt hører til en stander, kunden allerede har valgt.
         *
         * KUN NÅR VIRKSOMHEDEN SLET INGEN STANDERE HAR. Det er dét, der gør
         * skridtet idempotent: Stripe kan gentage en webhook, og uden spærren
         * ville kunden få en ny stander for hvert forsøg. Prøven ligger i
         * basen og ikke i en variabel — funktionen kører i mange eksemplarer.
         *
         * FEJLER DET, LOGGES DET OG KØBET GÅR IGENNEM. Pengene er hjemme;
         * at svare Stripe med en fejl ville få dem til at prøve igen, uden at
         * standeren blev mere oprettet af det. Kunden kan altid oprette den
         * selv bagefter.
         */
        {
          const { count } = await admin
            .from("stands")
            .select("id", { count: "exact", head: true })
            .eq("company_id", companyId);

          if (
            skalOpretteFoersteStander({
              erAbonnement,
              ordreHarStander: Boolean(ordreDest?.stand_id),
              antalStandere: count ?? 0,
            })
          ) {
            const { data: nyStander, error: standFejl } = await admin
              .from("stands")
              .insert({
                company_id: companyId,
                // Et navn, der beder om at blive rettet. Kunden skal kunne
                // kende sine standere fra hinanden — se vejledningen, som
                // foreslår "Disken" eller "Indgangen".
                name: "Stander 1",
                slug: generateSlug(),
              })
              .select("id")
              .single();

            if (standFejl || !nyStander) {
              await noterFejl(
                "stripe-webhook",
                `Kunne ikke oprette første stander for ${companyId}: ${standFejl?.message ?? "intet svar"}`,
              );
            } else {
              // Ordren skal PEGE på den, ellers ved trykfilen stadig ikke,
              // hvilken QR-kode skiltet skal have.
              const { error } = await admin
                .from("orders")
                .update({ stand_id: nyStander.id })
                .eq("stripe_session_id", session.id);
              if (error) {
                await noterFejl(
                  "stripe-webhook",
                  `Stander ${nyStander.id} oprettet, men ordren blev ikke knyttet: ${error.message}`,
                );
              }
            }
          }
        }

        /**
         * Varslet sendes UANSET hvad der sker nedenfor, og fejler det, ryger
         * det i driftsloggen. En ordre, ingen ved noget om, er værre end en
         * mail, der ikke kom af sted.
         *
         * `after()` OG IKKE EN LØS PROMISE. Første udgave kaldte funktionen med
         * `void` for ikke at forsinke svaret til Stripe. Det virkede lokalt og
         * fejlede i drift: en serverless-funktion kan blive lukket ned, så snart
         * svaret er sendt, og mailen nåede aldrig af sted. Der stod ikke engang
         * en fejl i driftsloggen — arbejdet blev bare aldrig gjort.
         *
         * `after()` er lavet til netop dette: Stripe får sit svar med det
         * samme, og platformen holder funktionen i live, til varslet er sendt.
         */
        /*
         * FØRSTE GANG? Ordren står som `new`, indtil denne webhook flytter
         * den til `needs_onboarding` længere nede. Er den allerede flyttet,
         * er det Stripe, der prøver igen — og så må kunden ikke få endnu en
         * bekræftelse. Statussen ER altså kvitteringen for, at beskeden er
         * sendt; det kræver ingen ekstra kolonne.
         *
         * Findes ordren slet ikke, er der ikke noget at bekræfte. Det er en
         * anomali, så den noteres frem for at gå stille forbi.
         */
        const foersteGang = ordreDest?.status === "new";
        if (!ordreDest) {
          after(() =>
            noterFejl(
              "stripe-webhook",
              `Betaling uden ordrerække: ${session.id}`,
            ),
          );
        }

        after(async () =>
          varslOmKoeb(
            session,
            productSlug,
            type,
            bestaaende ?? null,
            foersteGang,
            await hentQrAdresse(admin, session.id),
          ),
        );

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
            // Adressen gemmes HER og ikke ved bestillingen: den indsamles først
            // hos Stripe. Uden den kan ordren ses i admin, men ikke pakkes.
            leveringsadresse: leveringsadresse(session),
            kontakt_email: session.customer_details?.email ?? undefined,
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
              ...(slug
                ? { product_slug: slug, plan: planForProduct(slug) }
                : {}),
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
