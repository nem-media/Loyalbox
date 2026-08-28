"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, INTEGRATION_ID } from "@/lib/stripe";
import { stripeIdsFor, stripeMode, canSell } from "@/lib/commerce";
import {
  getProduct,
  priceFor,
  STRIPE_TAX_RATES,
  TERMS_VERSION,
  LEVERINGSLANDE,
} from "@/lib/constants";
import { FRONT_TEKSTER } from "@/lib/stander-tilvalg";
import { PRINT_SKABELON_VERSION } from "@/lib/design";
import { laesPngHoved, validerLogo } from "@/lib/logo";
import {
  CVR_HAR_KONTO,
  laesBestilling,
  type Fejl,
} from "@/lib/bestilling-uden-konto";
import { getSiteUrl } from "@/lib/site";
import { generateSlug } from "@/lib/utils";
import { noterFejl } from "@/lib/drift";
import type { DestinationType } from "@/lib/types/database";

export interface BestillingResultat {
  /** Stripe-adressen, browseren skal videre til. */
  url?: string;
  /** Fejl pr. felt. */
  fejl?: Fejl;
  /** Fejl, der ikke hører til et bestemt felt. */
  besked?: string;
}

/** Destinationstypen bestemmer, hvilken kolonne adressen havner i. */
function destinationKolonne(type: DestinationType, url: string) {
  switch (type) {
    case "google":
      return { google_review_url: url };
    case "trustpilot":
      return { trustpilot_url: url };
    case "facebook":
      return { facebook_url: url };
    default:
      return { custom_url: url, custom_label: "Se mere" };
  }
}

/**
 * Bestilling af et skilt uden konto.
 *
 * REKKEFØLGEN ER VALGT MED OMHU. Alt oprettes FØR betalingen, fordi prisen
 * afhænger af valgene, og fordi en ordre, der aldrig blev betalt, skal kunne
 * ses. Det er samme mønster som den eksisterende checkout, hvor ordren gemmes
 * som "ny" og først opdateres af webhooken.
 *
 * DER OPRETTES INGEN DATABEHANDLERAFTALE, og det er ikke en forglemmelse.
 * Skiltet får ingen LoyalSum-side: QR'en viderestiller, og der indsamles ingen
 * feedback. Vi behandler altså ingen oplysninger om KUNDENS kunder, og så er
 * der ingen databehandlerrolle at aftale. Det, vi gemmer — firmanavn, CVR,
 * mail, logo — er kundens egne oplysninger, hvor vi er dataansvarlige.
 *
 * VIRKSOMHEDEN GENBRUGES PÅ CVR. Uden det ville et afbrudt køb spærre for det
 * næste forsøg: CVR er unikt, og den anden indsættelse ville blive afvist.
 * Hører CVR'et til en konto MED login, afvises bestillingen i stedet — en
 * offentlig formular må ikke kunne hænge en ordre på en eksisterende kundes
 * virksomhed, blot fordi nogen kender deres nummer.
 */
export async function bestilUdenKonto(
  _prev: BestillingResultat,
  formData: FormData,
): Promise<BestillingResultat> {
  const product = getProduct(String(formData.get("produkt") ?? ""));
  if (!product || !canSell(product)) {
    return { besked: "Varen kan ikke bestilles lige nu." };
  }

  const laest = laesBestilling({
    firmanavn: formData.get("firmanavn"),
    cvr: formData.get("cvr"),
    accentHex: formData.get("accentHex"),
    email: formData.get("email"),
    antal: formData.get("antal"),
    standerFarve: formData.get("standerFarve"),
    egenFrontfarve: formData.get("egenFrontfarve") === "1",
    frontHex: formData.get("frontHex"),
    destinationType: formData.get("destinationType"),
    destinationUrl: formData.get("destinationUrl"),
    accepterVilkaar: formData.get("accepterVilkaar") === "1",
  });

  if (!laest.ok || !laest.vaerdier) return { fejl: laest.fejl };
  const v = laest.vaerdier;

  const admin = createAdminClient();

  /* ------------------------------------------------------------------ logo */
  const logo = formData.get("logo");
  let logoUrl: string | null = null;
  let logoBredde: number | null = null;
  let logoHoejde: number | null = null;
  let logoTransparent: boolean | null = null;
  let logoNavn: string | null = null;
  let logoMime: string | null = null;
  let logoBytes: number | null = null;

  if (logo instanceof File && logo.size > 0) {
    const buffer = await logo.arrayBuffer();
    const hoved = logo.type === "image/png" ? laesPngHoved(buffer) : null;
    const kontrol = validerLogo(
      { navn: logo.name, type: logo.type, storrelse: logo.size },
      hoved,
    );
    // Kontrolleres HER OG IKKE KUN I BROWSEREN. Formularen er offentlig, og en
    // browser kan sende hvad som helst — også en 40 MB fil eller en exe.
    if (!kontrol.ok)
      return { fejl: { firmanavn: undefined }, besked: kontrol.fejl };

    const ext = logo.name.split(".").pop()?.toLowerCase() || "png";
    const sti = `uden-konto/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from("logos")
      .upload(sti, buffer, { contentType: logo.type, upsert: false });

    if (error) {
      await noterFejl("bestilling-uden-konto", `Logo-upload: ${error.message}`);
      return { besked: "Logoet kunne ikke uploades. Prøv igen." };
    }

    logoUrl = admin.storage.from("logos").getPublicUrl(sti).data.publicUrl;
    logoNavn = logo.name;
    logoMime = logo.type;
    logoBytes = logo.size;
    logoBredde = hoved?.bredde ?? null;
    logoHoejde = hoved?.hoejde ?? null;
    logoTransparent = hoved?.harAlfa ?? null;
  }

  /* ------------------------------------------------------------ virksomhed */
  /*
   * GENBRUG KUN, NÅR DER ER ET CVR AT GENBRUGE PÅ.
   *
   * Da CVR blev frivilligt, blev `.eq("cvr", "")` pludselig en fælde: to
   * forskellige butikker uden nummer ville matche hinanden, og den anden
   * ordre ville lande på den førstes virksomhed — med dens ordrer, standere
   * og logo. Uden opslaget får hver bestilling sin egen række, hvilket er den
   * eneste rigtige antagelse, når vi ikke har noget at kende dem på.
   *
   * Nummeret gemmes desuden som NULL og ikke "": der er et unikt indeks på
   * `cvr where cvr is not null` (migration 0015), så den anden tomme streng
   * ville få indsættelsen til at fejle.
   */
  const { data: fundet } = v.cvr
    ? await admin
        .from("companies")
        .select("id, user_id, stripe_customer_id")
        .eq("cvr", v.cvr)
        .maybeSingle()
    : { data: null };

  if (fundet?.user_id) return { fejl: { cvr: CVR_HAR_KONTO } };

  let companyId = fundet?.id ?? null;

  if (!companyId) {
    const { data, error } = await admin
      .from("companies")
      .insert({
        name: v.firmanavn,
        cvr: v.cvr || null,
        contact_email: v.email,
        logo_url: logoUrl,
        // Ingen bruger: der oprettes hverken login eller dashboard.
        user_id: null,
        plan: "basic",
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
      })
      .select("id")
      .single();

    if (error || !data) {
      await noterFejl("bestilling-uden-konto", `Virksomhed: ${error?.message}`);
      return { besked: "Bestillingen kunne ikke oprettes. Prøv igen." };
    }
    companyId = data.id;
  } else {
    // Genbestilling fra samme CVR: opdatér det, der kan være ændret siden sidst.
    await admin
      .from("companies")
      .update({
        name: v.firmanavn,
        contact_email: v.email,
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
      })
      .eq("id", companyId);
  }

  /* ---------------------------------------------------------------- design */
  const { data: design, error: designFejl } = await admin
    .from("designs")
    .insert({
      company_id: companyId,
      navn: `${product.name} — ${v.firmanavn}`,
      stander_farve: v.standerFarve,
      front_type: v.frontHex ? "egen" : "matcher",
      front_hex: v.frontHex,
      accent_hex: v.accentHex,
      logo_url: logoUrl,
      logo_filnavn: logoNavn,
      logo_mime: logoMime,
      logo_bytes: logoBytes,
      logo_bredde: logoBredde,
      logo_hoejde: logoHoejde,
      logo_transparent: logoTransparent,
      print_skabelon: PRINT_SKABELON_VERSION,
    })
    .select("id")
    .single();

  if (designFejl || !design) {
    await noterFejl("bestilling-uden-konto", `Design: ${designFejl?.message}`);
    return { besked: "Designet kunne ikke gemmes. Prøv igen." };
  }

  /* --------------------------------------------------------------- standen */
  const { data: stand, error: standFejl } = await admin
    .from("stands")
    .insert({
      company_id: companyId,
      name: v.firmanavn,
      slug: generateSlug(),
      destination_type: v.destinationType,
      // Ingen LoyalSum-side: QR'en viderestiller. Se /r/[slug].
      kun_viderestilling: true,
      ...destinationKolonne(v.destinationType, v.destinationUrl),
    })
    .select("id, slug")
    .single();

  if (standFejl || !stand) {
    await noterFejl("bestilling-uden-konto", `Stander: ${standFejl?.message}`);
    return { besked: "Bestillingen kunne ikke oprettes. Prøv igen." };
  }

  /* -------------------------------------------------------------- betaling */
  const ids = stripeIdsFor(product)!;
  const taxRate = STRIPE_TAX_RATES[stripeMode()]!;
  const pricing = priceFor(product, v.antal, {
    egenFrontfarve: Boolean(v.frontHex),
  });
  const base = getSiteUrl();

  const lineItems: Record<string, unknown>[] = [
    {
      quantity: v.antal,
      tax_rates: [taxRate],
      price_data: {
        currency: "dkk",
        product: ids.productId,
        unit_amount: Math.round(pricing.standUnit * 100),
        tax_behavior: "exclusive",
      },
    },
  ];

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

  let session;
  try {
    session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: lineItems as never,
      integration_identifier: INTEGRATION_ID,
      client_reference_id: companyId,
      locale: "da",
      /**
       * Genbestiller samme CVR, genbruges kunden hos Stripe frem for at lave
       * en ny. Ellers ville hver ordre give sin egen kunde, og hverken
       * kvitteringer eller momsnumre ville hænge sammen.
       *
       * `customer_update` er PÅKRÆVET sammen med tax_id_collection, når der
       * peges på en eksisterende kunde — Stripe skal have lov at opdatere
       * navnet. Se den samme kommentar i /api/checkout.
       */
      ...(fundet?.stripe_customer_id
        ? {
            customer: fundet.stripe_customer_id,
            customer_update: {
              name: "auto" as const,
              address: "auto" as const,
              shipping: "auto" as const,
            },
          }
        : { customer_email: v.email }),
      billing_address_collection: "required",
      shipping_address_collection: { allowed_countries: [...LEVERINGSLANDE] },
      tax_id_collection: { enabled: true },
      invoice_creation: { enabled: true },
      metadata: {
        company_id: companyId,
        product_slug: product.slug,
        quantity: String(v.antal),
        design_id: design.id,
      },
      success_url: `${base}/bestil/tak?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${base}/bestil?produkt=${product.slug}`,
    });
  } catch (err) {
    await noterFejl(
      "bestilling-uden-konto",
      `Stripe: ${(err as Error).message}`,
    );
    return { besked: "Betalingen kunne ikke startes. Prøv igen." };
  }

  await admin.from("orders").insert({
    company_id: companyId,
    product_name: product.name,
    product_slug: product.slug,
    quantity: v.antal,
    total_amount: pricing.oneTimeTotal,
    design_id: design.id,
    /*
     * ORDREN SKAL PEGE PÅ STANDEREN, ellers ved produktionen ikke, hvilken
     * QR-kode der skal trykkes. Den manglede her, og virkningen var stille:
     * admin skrev "Ikke oplyst — spørg kunden", og trykfilen kom ud med
     * skabelonens PLADSHOLDER i QR-feltet. Standeren var oprettet få linjer
     * ovenfor, med både slug og destination; der var bare ingen, der vidste
     * hvilken. `/api/checkout` har sat feltet siden migration 0022.
     */
    stand_id: stand.id,
    frontfarve_beloeb: pricing.frontfarve,
    kontakt_email: v.email,
    uden_konto: true,
    stripe_session_id: session.id,
  });

  return { url: session.url ?? undefined };
}
