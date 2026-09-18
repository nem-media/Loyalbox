"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { stripe, INTEGRATION_ID, nextBillingAnchor } from "@/lib/stripe";
import {
  stripeIdsFor,
  stripeMode,
  koebSpaerreUdenKonto,
  kraeverDestination,
  checkoutMode,
} from "@/lib/commerce";
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
  EMAIL_HAR_KONTO,
  laesBestilling,
  type Fejl,
} from "@/lib/bestilling-uden-konto";
import { getSiteUrl } from "@/lib/site";
import { requiresDpa, DPA_VERSION } from "@/lib/dpa";
import { generateSlug } from "@/lib/utils";
import { aktiveringUdloeber } from "@/lib/aktivering";
import { lavGendanNoegle, laesGendanNoegle } from "@/lib/gendan-noegle";
import { randomBytes } from "node:crypto";
import { noterFejl } from "@/lib/drift";
import { findKonto } from "@/lib/konto-opslag";
import type { DestinationType } from "@/lib/types/database";

export interface BestillingResultat {
  /** Stripe-adressen, browseren skal videre til. */
  url?: string;
  /** Fejl pr. felt. */
  fejl?: Fejl;
  /** Fejl, der ikke hører til et bestemt felt. */
  besked?: string;
  /**
   * Hvilket forsøg i rækken svaret hører til.
   *
   * Bruges som `key` på afkrydsnings- og radiofelterne. React nulstiller
   * formularen, når en server action svarer, og for et STYRET felt sættes
   * DOM'ens `checked` tilbage, uden at React opdager det — tilstanden er jo
   * uændret, så der gentegnes ikke. Et forkert ciffer i CVR-feltet slog
   * derfor standerfarven tilbage til hvid og fjernede både frontfarven og
   * accepten af vilkårene, mens komponenten mente det modsatte.
   */
  forsoeg?: number;
}

/**
 * Siges ÉT sted, fordi den er svaret på to forskellige fejl med samme
 * betydning for kunden: det gemte logo kunne ikke hentes frem igen.
 */
const GEMT_LOGO_FEJL =
  "Vi kunne ikke genbruge dit gemte logo. Vælg filen igen, så er du videre.";

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
  // Ét sted ud med en fejl, så forsøgstælleren ikke kan blive glemt på en af
  // de tolv veje ud herunder — se `forsoeg` i BestillingResultat.
  const forsoeg = (_prev.forsoeg ?? 0) + 1;
  const svar = (
    r: Omit<BestillingResultat, "forsoeg">,
  ): BestillingResultat => ({
    ...r,
    forsoeg,
  });

  const product = getProduct(String(formData.get("produkt") ?? ""));
  const email = String(formData.get("email") ?? "");

  /*
   * SAMME SPÆRRE SOM DEN VEJ IND, DER KRÆVER LOGIN. Her spørges der med den
   * indtastede e-mail, fordi der ikke er nogen konto. Uden den kunne en
   * besøgende i testtilstand lande i et Stripe-sandbox, hvor deres rigtige
   * kort blev afvist uden forklaring — se koebSpaerreUdenKonto().
   */
  // Eksplicit, så typen indsnævres: spærren svarer også "ikke-aabnet" på en
  // ukendt vare, men det fortæller TypeScript ikke noget om.
  if (!product) return svar({ besked: "Varen kan ikke bestilles lige nu." });

  if (koebSpaerreUdenKonto(product, email)) {
    return svar({
      besked:
        "Du kan ikke købe online endnu. Skriv til kontakt@loyalsum.dk, så hjælper vi med bestillingen.",
    });
  }

  const laest = laesBestilling(
    {
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
    },
    undefined,
    /*
     * DESTINATIONEN KRÆVES KUN, NÅR DEN IKKE KAN ÆNDRES BAGEFTER.
     *
     * `null` som virksomhed er det rigtige her og ikke en forglemmelse: der ER
     * ingen kunde endnu, så svaret afhænger alene af varen. Et abonnement peger
     * på vores egen /r/<slug> og sættes i dashboardet efter aktiveringen; et
     * engangsskilt trykkes direkte til butikkens link og kan aldrig omdirigeres.
     */
    kraeverDestination(product, null),
  );

  if (!laest.ok || !laest.vaerdier) return svar({ fejl: laest.fejl });
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
      return svar({ fejl: { firmanavn: undefined }, besked: kontrol.fejl });

    const ext = logo.name.split(".").pop()?.toLowerCase() || "png";
    const sti = `uden-konto/${crypto.randomUUID()}.${ext}`;
    const { error } = await admin.storage
      .from("logos")
      .upload(sti, buffer, { contentType: logo.type, upsert: false });

    if (error) {
      await noterFejl("bestilling-uden-konto", `Logo-upload: ${error.message}`);
      return svar({ besked: "Logoet kunne ikke uploades. Prøv igen." });
    }

    logoUrl = admin.storage.from("logos").getPublicUrl(sti).data.publicUrl;
    logoNavn = logo.name;
    logoMime = logo.type;
    logoBytes = logo.size;
    logoBredde = hoved?.bredde ?? null;
    logoHoejde = hoved?.hoejde ?? null;
    logoTransparent = hoved?.harAlfa ?? null;
  } else if (formData.get("behold_logo") === "1") {
    /*
     * KUNDEN ER KOMMET TILBAGE FRA STRIPE MED ET LOGO, DER ALLEREDE ER OPPE.
     *
     * Et filfelt kan ikke forudfyldes — browseren giver ingen vej til det, og
     * derfor er „behold logoet“ et flag og ikke en fil i formulardataene.
     *
     * NØGLEN ER BEVISET. Der er ingen konto at kontrollere ejerskabet imod, så
     * uden signaturen ville et gættet design-id være nok til at hæfte en
     * fremmed butiks logo på sin egen bestilling. Ejerskabet ligger i selve
     * FORESPØRGSLEN nedenfor og ikke i et tjek bagefter — samme mønster som
     * `hentDesign()` på /bestil.
     */
    const gendan = laesGendanNoegle(String(formData.get("gendan") ?? ""));

    const { data: gemt } = gendan
      ? await admin
          .from("designs")
          .select(
            "logo_url, logo_filnavn, logo_mime, logo_bytes, logo_bredde, logo_hoejde, logo_transparent",
          )
          .eq("id", gendan.designId)
          .eq("company_id", gendan.companyId)
          .maybeSingle()
      : { data: null };

    if (gemt?.logo_url) {
      /*
       * FILEN KOPIERES — DEN DELES IKKE.
       *
       * Kladden fra det afbrudte forsøg bliver ryddet syv dage efter, OG DENS
       * LOGOFIL SLETTET FRA LAGERET (migration 0037 + `sletLogofiler`). Pegede
       * den nye bestilling på den samme fil, ville en BETALT kunde miste sit
       * logo en uge senere — nøjagtig den fejl, 0037 er skrevet om, bare ind ad
       * en anden dør. En kopi koster nogle kilobytes; den anden vej kostede et
       * logo, der ikke kunne skaffes igen.
       */
      const fra = gemt.logo_url.split("/logos/")[1];

      if (!fra) {
        await noterFejl(
          "bestilling-uden-konto",
          `Gemt logo uden sti: ${gemt.logo_url}`,
        );
        return svar({ besked: GEMT_LOGO_FEJL });
      }

      const ext = fra.split(".").pop()?.toLowerCase() || "png";
      const til = `uden-konto/${crypto.randomUUID()}.${ext}`;
      const { error } = await admin.storage.from("logos").copy(fra, til);

      if (error) {
        await noterFejl(
          "bestilling-uden-konto",
          `Gemt logo kunne ikke kopieres: ${error.message}`,
        );
        /*
         * DER SIGES FRA FREM FOR AT KØRE VIDERE. Kunden har lige set sit logo
         * i previewet; en bestilling, der stille blev til et skilt UDEN det,
         * ville først blive opdaget, når skiltet lå i kuverten.
         */
        return svar({ besked: GEMT_LOGO_FEJL });
      }

      logoUrl = admin.storage.from("logos").getPublicUrl(til).data.publicUrl;
      logoNavn = gemt.logo_filnavn;
      logoMime = gemt.logo_mime;
      logoBytes = gemt.logo_bytes;
      logoBredde = gemt.logo_bredde;
      logoHoejde = gemt.logo_hoejde;
      logoTransparent = gemt.logo_transparent;
    }
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
  /*
   * ER DET ET ABONNEMENT? Det afgør tre ting længere nede: om standeren får
   * vores egen side, om der skal udstedes et aktiveringstoken, og om Stripe
   * skal oprette et abonnement frem for et engangskøb.
   */
  const abonnement = checkoutMode(product) === "subscription";

  /*
   * TOKENET, DER GØR VIRKSOMHEDEN TIL KUNDENS.
   *
   * Udstedes ved BESTILLINGEN og ikke i webhooken, fordi tak-siden skal kunne
   * tilbyde aktiveringen i samme øjeblik Stripe sender kunden tilbage — og
   * webhooken kan sagtens være et halvt sekund bagefter. En ubetalt,
   * forladt bestilling efterlader et token på en virksomhed uden plan, og
   * det giver ingen adgang til noget.
   *
   * 32 tilfældige bytes: det skal ikke kunne gættes, for den der har det,
   * kan overtage virksomheden.
   */
  const aktiveringToken = abonnement ? randomBytes(32).toString("hex") : null;
  /*
   * DATABEHANDLERAFTALEN INDGÅS VED KØBET — også her.
   *
   * Den blev ikke registreret i dette flow, dengang det kun var Basic, og det
   * var rigtigt: Basic-standeren viderestiller og indsamler ingenting, så der
   * er ingen databehandlerrolle at aftale. Med et abonnement er det omvendt —
   * kunden indsamler feedback og medlemsdata om SINE kunder, og vi behandler
   * dem for dem. Uden dette ville en betalende Komplet-kunde stå uden aftale.
   *
   * Accepten stemples FØR betalingen, samme rækkefølge som `/api/checkout`:
   * fejler betalingen, har kunden ikke fået noget, og en accept uden køb er
   * harmløs — modsat et køb uden accept.
   */
  const dpaFelter = requiresDpa(product)
    ? {
        dpa_accepted_at: new Date().toISOString(),
        dpa_version: DPA_VERSION,
      }
    : {};

  const aktiveringFelter = aktiveringToken
    ? {
        aktivering_token: aktiveringToken,
        aktivering_udloeber: aktiveringUdloeber().toISOString(),
      }
    : {};

  const { data: fundet } = v.cvr
    ? await admin
        .from("companies")
        .select("id, user_id, stripe_customer_id")
        .eq("cvr", v.cvr)
        .maybeSingle()
    : { data: null };

  if (fundet?.user_id) return svar({ fejl: { cvr: CVR_HAR_KONTO } });

  /*
   * OG SÅ DET SAMME PÅ E-MAILEN. Opslaget ovenfor springes over, når CVR
   * er tomt, og feltet er frivilligt — så uden det her kunne en kunde med
   * et login bestille igen og få en HELT NY virksomhed, som dashboardet
   * aldrig viser. Det skete 14. september 2026 på et rigtigt køb.
   */
  const eksisterende = await findKonto(v.email);
  if (eksisterende?.harVirksomhed) {
    return svar({ fejl: { email: EMAIL_HAR_KONTO } });
  }

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
        ...dpaFelter,
        ...aktiveringFelter,
      })
      .select("id")
      .single();

    if (error || !data) {
      await noterFejl("bestilling-uden-konto", `Virksomhed: ${error?.message}`);
      return svar({ besked: "Bestillingen kunne ikke oprettes. Prøv igen." });
    }
    companyId = data.id;
  } else {
    /*
     * Genbestilling fra samme CVR: opdatér det, der kan være ændret siden
     * sidst.
     *
     * SVARET SKAL LÆSES, OG DET BLEV DET IKKE. Her skrives både accepten af
     * handelsbetingelserne, databehandleraftalen og et NYT aktiveringstoken —
     * altså dét, der giver køberen adgang til det, hun er ved at betale for.
     * Rammer opdateringen nul rækker (virksomheden slettet i mellemtiden, en
     * afvist RLS), svarer PostgREST glad med `error: null`, og så ville
     * kunden betale for en bestilling, hvis aktiveringsmail bærer et token,
     * der ikke findes.
     *
     * Der afvises FØR Stripe, så der er ikke flyttet penge endnu — og det er
     * netop derfor, det skal fanges her og ikke opdages bagefter.
     */
    const { data: ramt, error: firmaFejl } = await admin
      .from("companies")
      .update({
        name: v.firmanavn,
        contact_email: v.email,
        terms_accepted_at: new Date().toISOString(),
        terms_version: TERMS_VERSION,
        ...(logoUrl ? { logo_url: logoUrl } : {}),
        ...dpaFelter,
        // Genbestilling: et nyt token afløser et gammelt, så det seneste køb
        // er det, der giver adgang.
        ...aktiveringFelter,
      })
      .eq("id", companyId)
      .select("id");

    if (firmaFejl || !ramt?.length) {
      await noterFejl(
        "bestilling-uden-konto",
        `Genbestilling på virksomhed ${companyId} kunne ikke opdateres: ` +
          `${firmaFejl?.message ?? "ingen rækker ramt"}`,
      );
      return svar({
        besked: "Bestillingen kunne ikke oprettes. Prøv igen, eller skriv til os.",
      });
    }
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
    return svar({ besked: "Designet kunne ikke gemmes. Prøv igen." });
  }

  /* --------------------------------------------------------------- standen */
  const { data: stand, error: standFejl } = await admin
    .from("stands")
    .insert({
      company_id: companyId,
      name: v.firmanavn,
      slug: generateSlug(),
      /*
       * MED ABONNEMENT PEGER QR'EN PÅ OS, uden gør den ikke.
       *
       * `kun_viderestilling: true` betyder, at koden trykkes direkte til
       * butikkens eget link — det er Basic, og målet kan aldrig ændres. Et
       * abonnement får derimod vores egen /r/<slug>, og dét er hele grunden
       * til, at destinationen ikke skal oplyses ved bestillingen: den sættes
       * i dashboardet, når kontoen er aktiveret.
       *
       * Destinationen skrives kun, hvis den faktisk kom med. Uden linjen ville
       * en abonnementsstander få `destination_type: "custom"` og et tomt link,
       * altså et valg kunden aldrig har truffet.
       */
      kun_viderestilling: !abonnement,
      ...(v.destinationUrl
        ? {
            destination_type: v.destinationType,
            ...destinationKolonne(v.destinationType, v.destinationUrl),
          }
        : {}),
    })
    .select("id, slug")
    .single();

  if (standFejl || !stand) {
    await noterFejl("bestilling-uden-konto", `Stander: ${standFejl?.message}`);
    return svar({ besked: "Bestillingen kunne ikke oprettes. Prøv igen." });
  }

  /* -------------------------------------------------------------- betaling */
  const ids = stripeIdsFor(product)!;
  const taxRate = STRIPE_TAX_RATES[stripeMode()]!;
  const pricing = priceFor(product, v.antal, {
    egenFrontfarve: Boolean(v.frontHex),
    standerFarve: v.standerFarve,
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

  /*
   * MÅNEDSPRISEN ER SIN EGEN LINJE, ligesom i /api/checkout. Uden den ville
   * købet blive et ENGANGSKØB: kunden betalte for standeren, fik adgang via
   * webhooken og blev aldrig trukket igen. `canSell()` spærrer for varen, hvis
   * månedsprisen mangler i den aktuelle Stripe-tilstand, netop fordi fejlen
   * ellers er tavs.
   */
  if (abonnement) {
    lineItems.push({
      price: ids.monthlyPriceId,
      quantity: 1,
      tax_rates: [taxRate],
    });
  }

  let session;
  try {
    /*
     * NØGLEN TIL EN FORTRUDT BESTILLING. Udstedes her, sammen med sessionen, og
     * lever lige så længe som den — se `gendan-noegle.ts`.
     */
    const gendanNoegle = lavGendanNoegle({
      designId: design.id,
      companyId,
    });

    session = await stripe().checkout.sessions.create({
      mode: abonnement ? ("subscription" as const) : ("payment" as const),
      line_items: lineItems as never,
      integration_identifier: INTEGRATION_ID,
      client_reference_id: companyId,
      locale: "da",
      /*
       * RABATKODEFELTET. Uden dette ene ord findes feltet slet ikke i
       * betalingsvinduet, og en kampagnekode kan hverken tastes eller
       * indløses — koden ville findes hos Stripe og være umulig at bruge.
       *
       * KODERNE LAVES I STRIPE (Produkter → Kuponer), ikke her. Det er med
       * vilje: en kampagne er en forretningsbeslutning, der skal kunne
       * ændres og stoppes uden en udrulning, og priserne i KATALOG skal
       * blive ved med at være listeprisen.
       *
       * ET NUL-BELØB ER EN GYLDIG BETALING. Giver koden 100 % rabat,
       * svarer sessionen `no_payment_required` i stedet for `paid`, og der
       * findes ingen `payment_intent`. Begge dele er der taget højde for:
       * BETALTE_SESSIONER indeholder `no_payment_required`, og
       * `paymentIntentFor()` giver null frem for at kaste. Ordren flyttes
       * derfor til `needs_onboarding` som ethvert andet køb — den bliver
       * pakket og sendt, og designet bliver ikke ryddet som forladt.
       *
       * BEMÆRK: ordrens `total_amount` er vores listepris, skrevet FØR
       * kunden har set betalingsvinduet. Den kan ikke kende en rabat, der
       * tastes bagefter. Stripe er sandheden om, hvad der faktisk blev
       * betalt; ordren i admin linker derhen.
       */
      allow_promotion_codes: true,
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
      /*
       * KUN VED ENGANGSKØB. Stripe afviser sessionen med
       * "You can only enable invoice creation when `mode` is set to
       * `payment`" — et abonnement laver sine fakturaer selv, én pr. periode.
       *
       * Fejlen ramte hele bestillingen, ikke bare fakturaen: sessionen blev
       * aldrig oprettet, og kunden fik "Betalingen kunne ikke startes" efter
       * at have udfyldt det hele. Fundet ved det første rigtige køb gennem det
       * nye flow — tests og build så intet, fordi de ikke taler med Stripe.
       */
      ...(abonnement ? {} : { invoice_creation: { enabled: true } }),
      metadata: {
        company_id: companyId,
        product_slug: product.slug,
        quantity: String(v.antal),
        design_id: design.id,
      },
      /*
       * ABONNEMENTETS EGEN METADATA. Webhooken finder virksomheden på
       * `sub.metadata.company_id`, når Stripe siden melder om en ændret eller
       * ophørt betaling — uden den ville en fejlet fornyelse ikke kunne
       * knyttes til nogen. Trækdatoen er den 20., samme anker som den vej ind,
       * der kræver login, så to kunder ikke får hver sin rytme.
       */
      ...(abonnement
        ? {
            subscription_data: {
              billing_cycle_anchor: nextBillingAnchor(),
              metadata: {
                company_id: companyId,
                product_slug: product.slug,
              },
            },
          }
        : {}),
      success_url: `${base}/bestil/tak?session_id={CHECKOUT_SESSION_ID}`,
      /*
       * FORTRYDER KUNDEN HOS STRIPE, SKAL HELE BESTILLINGEN FØLGE MED HJEM.
       *
       * Adressen pegede på `/bestil`, som for en besøgende uden konto sender
       * videre til formularen her — TOM, og med antallet sat tilbage til 1.
       * Alt var i behold i basen (admin kunne se både logo og farvevalg); der
       * var bare ingen vej tilbage til det, og kunden skulle taste firmanavn,
       * CVR, mail og link forfra og uploade logoet igen.
       *
       * Der peges nu direkte på formularen, så der ikke er et videresend i
       * vejen, og nøglen åbner det, kunden allerede har lavet. Uden signaturen
       * ville adressen være en måde at læse en fremmed butiks oplysninger på —
       * se `gendan-noegle.ts` for hvorfor det ikke kan være et rent id.
       */
      cancel_url:
        `${base}/bestil/uden-konto?produkt=${product.slug}` +
        `&antal=${v.antal}&gendan=${gendanNoegle}`,
    });
  } catch (err) {
    await noterFejl(
      "bestilling-uden-konto",
      `Stripe: ${(err as Error).message}`,
    );
    return svar({ besked: "Betalingen kunne ikke startes. Prøv igen." });
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
