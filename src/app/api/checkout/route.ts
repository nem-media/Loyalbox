import { NextResponse, type NextRequest } from "next/server";
import type Stripe from "stripe";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { DESTINATIONER, erGyldigUrl } from "@/lib/bestilling-uden-konto";
import type { DestinationType } from "@/lib/types/database";
import { stripe, nextBillingAnchor, INTEGRATION_ID } from "@/lib/stripe";
import {
  stripeIdsFor,
  stripeMode,
  isTestBuyer,
  canSell,
  kraeverDestination,
} from "@/lib/commerce";
import {
  getProduct,
  priceFor,
  MAX_QTY,
  STRIPE_TAX_RATES,
  TERMS_VERSION,
  LEVERINGSLANDE,
} from "@/lib/constants";
import { harFysiskSkilt } from "@/lib/constants";
import {
  erStanderFarve,
  normaliserHex,
  FRONT_TEKSTER,
} from "@/lib/stander-tilvalg";
import {
  skalBetaleFrontfarve,
  PRINT_SKABELON_VERSION,
  type DesignValg,
} from "@/lib/design";
import { getSiteUrl } from "@/lib/site";
import { DPA_VERSION, requiresDpa } from "@/lib/dpa";
import { noterFejl } from "@/lib/drift";

/**
 * Læser og renser et design fra klienten.
 *
 * ALT VALIDERES HER. Klienten er en browser, og en browser kan sende hvad som
 * helst — herunder `front_type: "egen"` uden en farve, hvilket ville trykke
 * sort på sort, eller en hex, der ikke er en hex.
 *
 * Vælger kunden ikke en egen farve, nulstilles `front_hex` med vilje. Et
 * felt, der er blevet stående efter tilvalget blev slået fra, må ikke kunne
 * bestemme trykket senere.
 *
 * Returnerer null, hvis noget er så galt, at det ikke kan rettes op.
 */
function laesDesign(raw: Record<string, unknown>) {
  const standerFarve = raw.stander_farve;
  if (!erStanderFarve(standerFarve)) return null;

  const vilEgen = raw.front_type === "egen";
  const hex =
    vilEgen && typeof raw.front_hex === "string"
      ? normaliserHex(raw.front_hex)
      : null;

  // "Egen farve" uden en gyldig farve er ikke et design, vi kan trykke.
  if (vilEgen && !hex) return null;

  const tal = (v: unknown) =>
    typeof v === "number" && Number.isFinite(v) && v > 0 ? Math.round(v) : null;

  return {
    stander_farve: standerFarve,
    front_type: hex ? ("egen" as const) : ("matcher" as const),
    front_hex: hex,
    /*
     * ACCENTEN VALIDERES, MEN AFVISER IKKE. Modsat frontfarven er den gratis
     * og har en gyldig standard: falder koden ud som ugyldig, trykkes
     * LoyalSums egen. At afvise hele bestillingen, fordi en farvekode var
     * skrevet forkert, ville koste et salg for ingenting.
     */
    accent_hex:
      typeof raw.accent_hex === "string" ? normaliserHex(raw.accent_hex) : null,
    logo_url: typeof raw.logo_url === "string" ? raw.logo_url : null,
    logo_filnavn:
      typeof raw.logo_filnavn === "string" ? raw.logo_filnavn : null,
    logo_mime: typeof raw.logo_mime === "string" ? raw.logo_mime : null,
    logo_bytes: tal(raw.logo_bytes),
    logo_bredde: tal(raw.logo_bredde),
    logo_hoejde: tal(raw.logo_hoejde),
    logo_transparent:
      typeof raw.logo_transparent === "boolean" ? raw.logo_transparent : null,
  };
}

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

  /*
   * CVR AFVISER IKKE LÆNGERE. Ruten svarede 400 uden et gyldigt nummer, fordi
   * betingelserne forudsatte et erhvervskøb. Vi sælger stadig kun til
   * virksomheder — men Stripe spørger selv om momsnummeret nedenfor
   * (`tax_id_collection`), og momsen opkræves via en fast sats uanset hvad.
   * At afvise en betaling, fordi kunden ikke har nummeret ved hånden, kostede
   * mere end det beskyttede. Nummeret valideres stadig med modulus 11, når det
   * udfyldes i profilen.
   */

  const body = await request.json().catch(() => ({}));
  const product = getProduct(String(body.produkt ?? ""));
  if (!product) {
    return NextResponse.json({ error: "Ukendt produkt." }, { status: 400 });
  }

  /**
   * GENOPTAGELSE af et abonnement, der er lukket hos Stripe.
   *
   * Kunden har standeren i forvejen — den er købt og betalt, og den ligger på
   * disken. Skulle genoptagelsen gå gennem den almindelige checkout, ville de
   * skulle købe en stander mere for at få deres eget dashboard tilbage.
   *
   * Derfor: kun månedsprisen, ingen stander, og ingen ny ordre til
   * produktionen. Varen bestemmes af `product_slug` og ikke af klienten — det
   * er kvitteringen for, hvad de faktisk har.
   */
  const genoptag = body.genoptag === true;
  if (
    genoptag &&
    (!company.product_slug || company.product_slug !== product.slug)
  ) {
    return NextResponse.json(
      { error: "Der er intet abonnement at genoptage." },
      { status: 400 },
    );
  }
  if (genoptag && !product.monthlyPrice) {
    return NextResponse.json(
      { error: "Varen har ikke et abonnement." },
      { status: 400 },
    );
  }

  const qty = genoptag
    ? 1
    : Math.max(1, Math.min(MAX_QTY, Number(body.antal) || 1));
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

  /**
   * DESIGNET — trykvalgene bag skiltet.
   *
   * To veje ind: `design_id` genbruger et, kunden allerede har (og så er
   * tillægget for egen frontfarve betalt), eller `design` opretter et nyt.
   *
   * PRISEN AFGØRES HER OG KUN HER. Klienten sender sine valg, aldrig et beløb
   * — ellers kunne enhver sætte tillægget til nul i browseren. Om der skal
   * betales, afgøres af `skalBetaleFrontfarve()` på det design, serveren selv
   * har hentet eller lige har skrevet.
   */
  const admin = createAdminClient();
  let design: (DesignValg & { id: string }) | null = null;

  if (!genoptag && harFysiskSkilt(product)) {
    const genbrug = typeof body.design_id === "string" ? body.design_id : null;

    if (genbrug) {
      const { data } = await admin
        .from("designs")
        .select("id, stander_farve, front_type, front_hex, accent_hex, frontfarve_betalt")
        .eq("id", genbrug)
        // Ejerskabet kontrolleres i forespørgslen og ikke bagefter: et design,
        // der tilhører en anden butik, må ikke engang læses.
        .eq("company_id", company.id)
        .maybeSingle();

      if (!data) {
        return NextResponse.json(
          { error: "Designet blev ikke fundet." },
          { status: 400 },
        );
      }
      design = data as DesignValg & { id: string };
    } else if (body.design && typeof body.design === "object") {
      const nyt = laesDesign(body.design as Record<string, unknown>);
      if (!nyt) {
        return NextResponse.json(
          { error: "Designet kunne ikke læses. Prøv igen." },
          { status: 400 },
        );
      }

      const { data, error } = await admin
        .from("designs")
        .insert({
          company_id: company.id,
          navn: `${product.name} — ${new Date().toISOString().slice(0, 10)}`,
          print_skabelon: PRINT_SKABELON_VERSION,
          ...nyt,
        })
        .select("id, stander_farve, front_type, front_hex, accent_hex, frontfarve_betalt")
        .single();

      if (error || !data) {
        await noterFejl(
          "design",
          `Kunne ikke gemmes for virksomhed ${company.id}: ${error?.message}`,
        );
        return NextResponse.json(
          { error: "Designet kunne ikke gemmes. Prøv igen." },
          { status: 500 },
        );
      }
      design = data as DesignValg & { id: string };
    }
  }

  /**
   * Hvilken stander skal skiltet trykkes med? (0022)
   *
   * EJERSKABET LIGGER I FORESPØRGSLEN og ikke i en kontrol bagefter: et
   * stand-id, der tilhoerer en anden butik, giver ingen række og dermed
   * ingen kobling. Sendes der et ukendt id, fejler bestillingen ikke — der
   * bliver bare ingen stander på ordren, præcis som før 0022. En ordre
   * må ikke falde på noget, der kun er en oplysning til produktionen.
   */
  let standId: string | null = null;
  if (typeof body.stand === "string" && body.stand) {
    const { data } = await admin
      .from("stands")
      .select("id")
      .eq("id", body.stand)
      .eq("company_id", company.id)
      .maybeSingle();
    standId = data?.id ?? null;
  }

  /**
   * Hvad skal skiltet pege på? (0022)
   *
   * HÅNDHÆVES HER OG IKKE KUN I FORMULAREN. Et fysisk skilt uden abonnement
   * har en trykt QR og ingen dynamiske links: destinationen er afgjort én
   * gang for alle. Mangler den, ville vi tage imod penge for et skilt, der
   * fører ingen steder hen, og som kun kan rettes med et nyt tryk. Derfor
   * afvises købet — det er den ene gang, hvor en manglende oplysning SKAL
   * stoppe en bestilling.
   *
   * `kraeverDestination()` er samme funktion, som formularen spørger. Ét
   * sted, så feltet ikke kan blive vist uden at blive krævet, eller omvendt.
   */
  let destType: DestinationType | null = null;
  let destUrl: string | null = null;

  if (kraeverDestination(product, company)) {
    const t = String(body.destination_type ?? "");
    const u = String(body.destination_url ?? "").trim();

    if (!DESTINATIONER.some((d) => d.vaerdi === t) || !erGyldigUrl(u)) {
      return NextResponse.json(
        {
          error:
            "Vi mangler at vide, hvad skiltet skal pege på. Uden abonnement " +
            "trykkes linket fast og kan ikke ændres bagefter.",
        },
        { status: 400 },
      );
    }
    destType = t as DestinationType;
    destUrl = u;
  }

  const betalerFrontfarve = design ? skalBetaleFrontfarve(design) : false;
  // Farven tages fra designet, serveren selv har hentet — aldrig fra kroppen.
  // Ellers kunne en klient bestille sort og betale for hvid.
  const pricing = priceFor(product, qty, {
    egenFrontfarve: betalerFrontfarve,
    standerFarve: design?.stander_farve,
  });
  const base = getSiteUrl();
  const sub = Boolean(product.monthlyPrice);

  // Standeren sendes som price_data med den rabatterede enhedspris, så
  // mængderabatten kun findes ét sted (VOLUME_DISCOUNTS). Produktet peger på
  // det rigtige Stripe-produkt, så fakturaen viser varens navn.
  const lineItems: Record<string, unknown>[] = genoptag
    ? []
    : [
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
  // Tillægget er ÉN linje, ikke en del af standerprisen: kunden skal kunne se
  // på fakturaen, hvad de betalte for, og bogholderiet skal kunne kende det
  // igen. Det sendes som price_data uden et Stripe-produkt, fordi det ikke ER
  // en vare — det er en opsætning i trykket.
  if (pricing.frontfarve > 0) {
    lineItems.push({
      quantity: 1,
      tax_rates: [taxRate],
      price_data: {
        currency: "dkk",
        unit_amount: Math.round(pricing.frontfarve * 100),
        tax_behavior: "exclusive",
        product_data: { name: FRONT_TEKSTER.tilvalg },
      },
    });
  }

  if (sub) {
    lineItems.push({
      price: ids.monthlyPriceId,
      quantity: 1,
      tax_rates: [taxRate],
    });
  }

  // Accepten af handelsbetingelserne er nu et aktivt afkrydsningsfelt på
  // /bestil og ikke en sætning, man kan læse hen over. Den gemmes MED sin
  // version, så vi kan svare på, hvad kunden faktisk sagde ja til.
  if (body.accepterVilkaar !== true) {
    return NextResponse.json(
      { error: "Du skal acceptere handelsbetingelserne for at gå videre." },
      { status: 400 },
    );
  }

  const { error: vilkaarFejl } = await admin
    .from("companies")
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    })
    .eq("id", company.id);

  if (vilkaarFejl) {
    // Købet stoppes ikke: accepten er givet i kraft af afkrydsningsfeltet.
    // Men mangler kolonnen, står kunden uden registreret accept, og ingen
    // ville opdage det — derfor skal fejlen ud af systemet.
    await noterFejl(
      "vilkaar-accept",
      `Kunne ikke registrere accept for virksomhed ${company.id}: ${vilkaarFejl.message}`,
    );
  }

  // Databehandleraftalen indgås som en del af købet, når varen giver adgang
  // til at indsamle oplysninger om butikkens egne kunder. Accepten stemples
  // FØR betalingen sættes i gang: fejler betalingen, har kunden ikke fået
  // noget, og en accept uden køb er harmløs — modsat et køb uden accept.
  if (requiresDpa(product)) {
    const { error: dpaError } = await admin
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
      await noterFejl(
        "dpa-accept",
        `Kunne ikke registrere accept for virksomhed ${company.id}: ${dpaError.message}`,
      );
    }
  }

  let session: Stripe.Checkout.Session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: sub ? "subscription" : "payment",
      // payment_method_types sættes bevidst IKKE — Stripe vælger dynamisk de
      // metoder, der er slået til i dashboardet, og som passer til kunden.
      line_items: lineItems as never,
      integration_identifier: INTEGRATION_ID,
      client_reference_id: company.id,
      locale: "da",
      billing_address_collection: "required",
      // Leveringsadressen indsamles KUN ved et fysisk køb. Ved en genoptagelse
      // sendes der ikke noget — standeren står allerede på disken.
      //
      // Uden dette blev der aldrig spurgt om en leveringsadresse nogen steder,
      // mens handelsbetingelserne lovede levering "til den adresse, du oplyser".
      // Landet er låst til Danmark; se LEVERINGSLANDE for hvorfor.
      ...(genoptag
        ? {}
        : {
            shipping_address_collection: {
              allowed_countries: [...LEVERINGSLANDE],
            },
          }),
      // Momsnummer på fakturaen — dansk B2B skal kunne bogføre den.
      tax_id_collection: { enabled: true },
      /**
       * EKSISTERENDE KUNDE KRÆVER `customer_update`.
       *
       * Stripe afviser en session, der både peger på en eksisterende kunde OG
       * indsamler momsnummer, medmindre den får lov at opdatere kundens navn:
       * "Tax ID collection requires updating business name on the customer."
       *
       * Fejlen var latent fra begyndelsen. Ved FØRSTE køb har virksomheden intet
       * `stripe_customer_id`, så grenen med `customer_email` bruges, og alt gik
       * godt. Først ved det ANDET køb — den første genkøbende kunde — slår den
       * til. Adresserne sættes med af samme grund: indsamler vi dem, skal
       * kunden hos Stripe også opdateres med dem.
       */
      ...(company.stripe_customer_id
        ? {
            customer: company.stripe_customer_id,
            customer_update: {
              name: "auto" as const,
              address: "auto" as const,
              // Kun når vi rent faktisk beder om en leveringsadresse.
              ...(genoptag ? {} : { shipping: "auto" as const }),
            },
          }
        : {
            customer_email:
              company.billing_email ?? company.contact_email ?? user.email,
          }),
      metadata: {
        company_id: company.id,
        product_slug: product.slug,
        quantity: String(qty),
        // Webhooken bruger den til at markere tillægget betalt, så en
        // genbestilling af samme design er gratis.
        ...(design ? { design_id: design.id } : {}),
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
      success_url: genoptag
        ? `${base}/dashboard/abonnement?genoptaget=1`
        : `${base}/bestil/tak?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: genoptag
        ? `${base}/dashboard/abonnement`
        : `${base}/bestil?produkt=${product.slug}&antal=${qty}`,
    });
  } catch (err) {
    /**
     * EN AFVIST SESSION MÅ IKKE VÆLTE RUTEN.
     *
     * Uden dette kastede Stripe-fejlen igennem, Next svarede 500 med en TOM
     * krop, og browseren viste "Unexpected end of JSON input" — en besked,
     * hverken kunden eller vi kan bruge til noget. Nu står den rigtige fejl i
     * driftsloggen, og kunden får noget, de kan handle på.
     */
    const besked = (err as Error).message;
    await noterFejl("checkout", `Stripe afviste session: ${besked}`);
    return NextResponse.json(
      {
        error:
          "Betalingen kunne ikke startes. Vi har fået besked og ser på det — prøv igen om lidt.",
      },
      { status: 502 },
    );
  }

  // Ordren gemmes som "ny" allerede her, så en betaling der aldrig fuldføres
  // stadig kan ses. Webhooken opdaterer den, når pengene er hjemme.
  //
  // Ved en genoptagelse oprettes der INGEN ordre: der skal ikke produceres og
  // sendes en stander mere. Ellers ville admin-oversigten bede om at pakke en
  // vare, kunden allerede har stående på disken.
  if (!genoptag) {
    await admin.from("orders").insert({
      company_id: company.id,
      product_name: product.name,
      product_slug: product.slug,
      quantity: qty,
      total_amount: pricing.oneTimeTotal,
      design_id: design?.id ?? null,
      // Designet siger HVORDAN skiltet ser ud; standeren siger HVILKEN
      // QR-adresse der skal trykkes på det.
      stand_id: standId,
      destination_type: destType,
      destination_url: destUrl,
      // Står også på ordren, så beløbet kan læses uden at slå designet op —
      // også efter designet er slettet.
      frontfarve_beloeb: pricing.frontfarve,
      stripe_session_id: session.id,
    });
  }

  return NextResponse.json({ url: session.url });
}
