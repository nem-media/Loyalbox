import { EGEN_FRONTFARVE_PRIS } from "@/lib/stander-tilvalg";

export const SITE_NAME = "LoyalSum.dk";
export const SITE_TAGLINE =
  "Anmeldelser, loyalitet, feedback og synlighed samlet i én platform — så lokale forretninger får flere nye kunder og flere genbesøg.";

/**
 * SELSKABSOPLYSNINGER — UDFYLD FØR LIVE
 *
 * Det er et lovkrav (e-handelsloven), at selskabsnavn, CVR og adresse fremgår
 * af sitet, og Stripe kontrollerer det samme, når en konto skal godkendes til
 * rigtige betalinger. Felter markeret UDFYLD vises som en tydelig markering på
 * siderne i stedet for at blive udeladt i stilhed — så kan de ikke glemmes.
 *
 * Bruges af footeren, handelsbetingelserne og privatlivspolitikken.
 */
export const COMPANY = {
  legalName: "Nem Media ApS",
  cvr: "37811769",
  address: "Spotorno Allé 4",
  postalCode: "2630",
  city: "Høje Taastrup",
  email: "kontakt@loyalsum.dk",
  /** Tom = telefon vises ikke. */
  phone: "",
  /** Hvor lang tid går der typisk, fra bestilling til standeren er sendt? */
  deliveryDays: "3–5 hverdage",
} as const;

/**
 * Handelsbetingelsernes version og dato.
 *
 * Accepten gemmes MED versionen på virksomheden ved købet, præcis som
 * databehandleraftalen (se DPA_VERSION). Uden det kan vi ikke svare på, hvilke
 * vilkår en kunde faktisk sagde ja til — og et vilkår, ingen kan bevise blev
 * accepteret, er ikke meget værd i en tvist.
 *
 * Hæv versionen, når et vilkår ændres materielt, og ret datoen med.
 */
// 1.3 (2026-08-26): CVR er ikke længere et krav for at bestille. Vi sælger
// stadig kun til virksomheder, men §1 lovede en spærre, der ikke findes mere,
// og §2 lovede et nummer på fakturaen, vi ikke altid har.
export const TERMS_VERSION = "1.3";
export const TERMS_DATE = "2026-08-26";

/**
 * Hvor vi sælger og leverer.
 *
 * Danmark alene, og det er et bevidst valg med to grunde. Momsen lægges på som
 * en fast dansk sats (se STRIPE_TAX_RATES): sælges der til en momsregistreret
 * køber i et andet EU-land, ville satsen være forkert, og fakturaen ubrugelig
 * for begge parter. Og standeren er en fysisk vare, der skal sendes.
 *
 * Skal der sælges uden for Danmark en dag, er det ikke en linje her — det er
 * momshåndtering og fragt, og begge dele skal bygges først.
 */
export const LEVERINGSLANDE = ["DK"] as const;
export const LEVERINGSLAND_NAVN = "Danmark";

/** True hvis feltet stadig venter på en rigtig værdi. */
export function mangler(v: string): boolean {
  return !v || v === "UDFYLD";
}

/**
 * Målsøgeord kunder skal finde os på (organisk + Shopping). Dækker begge motorer:
 * loyalitet/stempelkort OG anmeldelser. Væves naturligt ind i titler/beskrivelser
 * — ikke keyword-stuffing.
 */
export const SEO_KEYWORDS = [
  // Platformen (forsidens semantiske tyngdepunkt)
  "kundeloyalitet",
  "kunderelationer",
  "flere genbesøg",
  "kundeklub til lokale virksomheder",
  "online synlighed lokal virksomhed",
  // Loyalitet / stempelkort
  "digitalt stempelkort",
  "stempelkort uden app",
  "stempelkort til café",
  "loyalitetsprogram lille virksomhed",
  "kundeklub",
  "NFC stempelkort",
  "digitalt loyalitetskort",
  // Anmeldelser
  "reviewstander",
  "review stander",
  "google review skilt",
  "flere google anmeldelser",
  "anmeldelsesstander",
  "QR anmeldelse skilt",
];

export type Tier = "basic" | "premium" | "pro";

/** Capabilities that a company's plan unlocks in the control panel. */
export type Capability =
  | "customBranding" // eget logo + tilpasset design
  | "feedbackInbox" // se privat feedback i dashboardet
  | "statistics" // scan-/klik-/rating-statistik
  | "dynamicLinks"; // skift destination + flere destinationstyper

export const TIER_CAPABILITIES: Record<Tier, Record<Capability, boolean>> = {
  basic: {
    customBranding: false,
    feedbackInbox: false,
    statistics: false,
    dynamicLinks: false,
  },
  premium: {
    customBranding: true,
    feedbackInbox: false,
    statistics: false,
    dynamicLinks: false,
  },
  pro: {
    customBranding: true,
    feedbackInbox: true,
    statistics: true,
    dynamicLinks: true,
  },
};

/** Danske labels til hvad et niveau låser op — vises i dashboardet. */
export const CAPABILITY_LABELS: Record<Capability, string> = {
  customBranding: "Eget logo og design på kundens side",
  feedbackInbox: "Privat feedback-indbakke",
  statistics: "Statistik i realtid",
  dynamicLinks: "Skift links når som helst + flere platforme",
};

export const CAPABILITY_ORDER: Capability[] = [
  "customBranding",
  "dynamicLinks",
  "feedbackInbox",
  "statistics",
];

/**
 * PREMIUM TILDELES ALDRIG AF ET KØB. `planForProduct()` svarer kun `pro`
 * (abonnement) eller `basic` (alt andet), så ingen virksomhed kan ende der
 * ad den vej.
 *
 * Niveauet bliver alligevel stående: `company_plan` er en Postgres-enum
 * (migration 0003) med præcis de tre værdier, og fjernes det her, kan typen
 * ikke længere beskrive, hvad kolonnen må indeholde. Det kan også sættes i
 * hånden i admin.
 *
 * Det er altså IKKE et produkt og må aldrig vises som et. Skal en vare give
 * mellemniveauet, er stedet `planForProduct()` — ikke en liste et sted i UI.
 */
export const TIER_LABELS: Record<Tier, string> = {
  basic: "Basic",
  premium: "Premium",
  pro: "Pro",
};

export const TIER_ORDER: Tier[] = ["basic", "premium", "pro"];

/**
 * Niveauerne, en administrator må vælge i hånden.
 *
 * `premium` er IKKE med. Ingen vare giver det, og det stod alligevel i
 * vælgeren mellem basic og pro, hvor det ligner det naturlige mellemtrin —
 * så en rigtig kunde, der blev solgt LoyalSum Komplet manuelt, endte dér og
 * mistede feedback-indbakke, statistik og dynamiske links.
 *
 * Niveauet bliver i `TIER_ORDER` og i typen, fordi `company_plan` er en
 * Postgres-enum med de tre værdier, og rækker kan stå med det.
 */
export const VALGBARE_NIVEAUER: Tier[] = ["basic", "pro"];

/** True if the given tier unlocks the capability. Unknown tier → basic. */
export function tierCan(
  tier: Tier | null | undefined,
  cap: Capability,
): boolean {
  return TIER_CAPABILITIES[tier ?? "basic"]?.[cap] ?? false;
}

export type Platform =
  "google" | "trustpilot" | "tripadvisor" | "facebook" | "multi";

export type StripeMode = "test" | "live";

export interface StripeIds {
  productId: string;
  /** Engangsbeløbet (standeren). */
  priceId: string;
  /** Det månedlige abonnement. Kun på abonnementsvarer. */
  monthlyPriceId?: string;
}

export interface Product {
  slug: string;
  platform: Platform;
  name: string;
  /** Primært SEO-søgeord for produktets side. */
  keyword: string;
  /** Valgfri override til <title>; ellers bruges name. */
  metaTitle?: string;
  /** Pris pr. stander (engangs, DKK ex moms). Ganges med antal + mængderabat. */
  price: number;
  interval: "one_time" | "month";
  /** Fast månedligt abonnement (DKK ex moms) — UAFHÆNGIGT af antal standere. */
  monthlyPrice?: number;
  /** Engangs opsætningsgebyr (DKK ex moms) — fast, uafhængigt af antal. */
  setupPrice?: number;
  /** True hvis produktet inkluderer hele LoyalSum-platformen (komplet pakke). */
  includesLoyalSum?: boolean;
  tagline: string;
  description: string;
  image: string;
  features: string[];
  featured?: boolean;

  // --- Betaling (Stripe) ---
  /**
   * Stripe-id'er PR. TILSTAND. Test og live har hver deres id'er — bruges et
   * test-id med live-nøglen, fejler checkout. Derfor er de adskilt her frem
   * for i ét felt, der skal huskes udskiftet ved go-live.
   *
   * Oprettes med `node scripts/setup-stripe-products.mjs`, som printer dem.
   */
  stripe?: Partial<Record<StripeMode, StripeIds>>;

  /**
   * TILKØB. Varen er ikke et selvstændigt tilbud, men noget en kunde, der
   * allerede har en konto, køber oveni.
   *
   * Konsekvenserne er ens for alle tilkøb og hænger sammen: varen får ingen
   * offentlig produktside, står ikke i katalog, footer eller sitemap, og et
   * køb af den ændrer ALDRIG kundens niveau eller `product_slug`. Det sidste er
   * det vigtigste — se webhooken.
   */
  addon?: boolean;

  /**
   * Sæt kun denne, hvis varen IKKE sender et fysisk skilt. Så bortfalder
   * farvevalg, logo-upload og leveringsadresse. Ingen nuværende vare er
   * digital — flaget findes, så en fremtidig kan sige det udtrykkeligt.
   */
  kunDigital?: boolean;

  /**
   * Sæt kun denne, hvis varen IKKE giver adgang til at indsamle oplysninger om
   * butikkens egne kunder. Alle nuværende varer indeholder en stander, der
   * tager imod feedback med navn og fritekst, så de kræver alle en
   * databehandleraftale. Se requiresDpa() i src/lib/dpa.ts.
   */
  noPersonalData?: boolean;

  // --- Google Shopping / Merchant Center ---
  /** Med i et Google Shopping-feed? Som udgangspunkt kun fysiske engangsprodukter. */
  shoppable?: boolean;
  /** Vores eget varenummer. Bruges som identifier når produktet ikke har GTIN. */
  mpn?: string;
  /** Stregkode (EAN/UPC), hvis produktet får en. Ellers udeladt. */
  gtin?: string;
  /** Vises som product_type i feedet, fx "LoyalSum > Standere > Basic". */
  productType?: string;
  /** Ekstra produktbilleder (additional_image_link). Stier under /public. */
  additionalImages?: string[];
}

/**
 * Globale handelsdata delt af hele kataloget — til Stripe-checkout og et kommende
 * Google Shopping-feed. Ét sted, så vi ikke gentager dem pr. produkt.
 */
export const COMMERCE = {
  brand: SITE_NAME.replace(".dk", ""), // "LoyalSum"
  currency: "DKK",
  /** Google Shopping: alle standere er nye. */
  condition: "new",
  /** Google Shopping: lagerstatus (juster hvis den skal styres pr. produkt). */
  availability: "in_stock",
  /**
   * Google Merchant produktkategori. Kvalificeret bud for en bord-/displaystander
   * — verificér/justér i Merchant Center, når feedet oprettes.
   */
  googleProductCategory:
    "Business & Industrial > Retail > Retail Display Props",
} as const;

// ===========================================================================
// PRODUKTER & PRISER  —  REDIGÉR HER
// Tre varer i en klar stige. Kunden vælger antal 1–30 med automatisk
// mængderabat. Priser står direkte på hver vare herunder; mængderabatten
// styres ét sted (VOLUME_DISCOUNTS). Alt væves automatisk ud i katalog,
// produktsider og checkout.
// ===========================================================================

/**
 * Maksimalt antal standere i selvbetjeningen. Ikke en forretningsgrænse, men en
 * sikkerhedsventil: større ordrer skal aftales med os, ikke klikkes igennem.
 * Antalsvælgeren viser en kontaktbesked, når loftet er nået.
 */
export const MAX_QTY = 100;

/**
 * Mængderabat: rabat pr. stander når man køber mindst `minQty` stk. Rediger frit
 * — sæt discountPct: 0 for at slå et trin fra, eller tilføj/fjern trin. Rabatten
 * gælder pr. stander (og evt. månedspris).
 */
export const VOLUME_DISCOUNTS: { minQty: number; discountPct: number }[] = [
  { minQty: 1, discountPct: 0 },
  { minQty: 3, discountPct: 10 },
  { minQty: 10, discountPct: 15 },
  { minQty: 20, discountPct: 20 },
];

/** Alle priser i shoppen vises ex moms. */
export const PRICES_EX_VAT = true;

/**
 * De tre varer — REDIGÉR pris/opsætning direkte på hver vare herunder.
 * 1) Reviewstander (engangskøb, selvvalgt link)
 * 2) Reviewstander Pro (review-platform: smart flow + dynamiske links, abonnement)
 * 3) LoyalSum Komplet (alt inkl. stempelkort & opslag, abonnement)
 */
export const PRODUCTS: Product[] = [
  {
    slug: "reviewstander",
    platform: "multi",
    name: "Reviewstander",
    keyword: "reviewstander",
    metaTitle: "Reviewstander med selvvalgt link (QR + NFC)",
    price: 399,
    interval: "one_time",
    includesLoyalSum: false,
    tagline: "Selvvalgt anmeldelseslink",
    description:
      "Elegant bordstander i sort akryl med QR og NFC. Du sætter selv linket — til Google, Trustpilot, Tripadvisor, Facebook eller din egen side. Indsæt dit logo og link, sæt den på disken, og du er klar. Ingen abonnement.",
    image: "/mockups/stander-reviewstander.svg",
    features: [
      "Selvvalgt link (Google, Trustpilot, Tripadvisor, Facebook…)",
      "QR + NFC — kunden scanner eller tapper",
      "Dit logo & link",
      "Klar til brug — ingen abonnement",
    ],
    shoppable: true,
    stripe: {
      test: {
        productId: "prod_V60HuKNAn27bkH",
        priceId: "price_1U5oH7Rr2uZmH0wdNTNoPm6T",
      },
      live: {
        productId: "prod_V60HuKNAn27bkH",
        priceId: "price_1U5tgC2LQpGDZNEWAR6ngZBB",
      },
    },
    mpn: "LS-REVIEW",
    productType: "LoyalSum > Standere > Reviewstander",
  },
  {
    slug: "reviewstander-pro",
    platform: "multi",
    name: "Reviewstander Pro",
    keyword: "reviewstander abonnement",
    metaTitle: "Reviewstander Pro — din egen anmeldelsesside & dynamiske links",
    price: 399,
    interval: "one_time",
    monthlyPrice: 99,
    includesLoyalSum: false,
    tagline: "Egen anmeldelsesside + dynamiske links",
    description:
      "Standeren med LoyalSum review-platformen oveni. På din dedikerede anmeldelsesside vælger du selv, hvilke platforme kunderne kan anmelde dig på (Google, Trustpilot, Facebook) — plus et eget link til fx dit menukort eller booking. Kunden kan også vælge at sende feedback direkte til dig i stedet, så du hører om en dårlig oplevelse og kan rette op. Skift links når som helst, og følg det hele i realtid.",
    image: "/mockups/stander-reviewstander-pro.svg",
    features: [
      "Dedikeret anmeldelsesside — vælg selv platforme (Google, Trustpilot, Facebook)",
      "Eget link til fx menukort eller booking",
      "Kunden vælger selv: offentlig anmeldelse eller feedback direkte til dig",
      "Dynamiske links — skift når som helst",
      "Privat feedback-indbakke & statistik",
    ],
    shoppable: false,
    stripe: {
      test: {
        productId: "prod_V60HMfPVGevsVG",
        priceId: "price_1U5oH8Rr2uZmH0wdDsW9uYPy",
        monthlyPriceId: "price_1U5oH8Rr2uZmH0wdyDTaXF1J",
      },
      live: {
        productId: "prod_V60HMfPVGevsVG",
        priceId: "price_1U5tg72LQpGDZNEWcadzuRAa",
        monthlyPriceId: "price_1U5tg72LQpGDZNEW8omPhStB",
      },
    },
    mpn: "LS-REVIEW-PRO",
    productType: "LoyalSum > Abonnement > Reviewstander Pro",
  },
  {
    slug: "loyalsum-komplet",
    platform: "multi",
    name: "LoyalSum Komplet",
    keyword: "digitalt stempelkort og anmeldelser",
    metaTitle: "LoyalSum Komplet — stempelkort, anmeldelser & opslag",
    price: 399,
    interval: "one_time",
    monthlyPrice: 399,
    includesLoyalSum: true,
    featured: true,
    tagline: "Hele platformen — reviews + stempelkort",
    description:
      "Alt i Reviewstander Pro — plus et digitalt stempelkort uden app for dine kunder. Kunderne tilmelder sig selv på standeren, personalet giver stempler med ét scan, og du laver opslag af dine bedste anmeldelser. Flere nye kunder, og flere der kommer igen — samlet ét sted.",
    image: "/mockups/stander-loyalsum-komplet.svg",
    features: [
      "Alt i Reviewstander Pro",
      "Digitalt stempelkort — uden app",
      "Scan-til-stempel over disken",
      "Opslag af dine bedste anmeldelser",
      "Kundeklub & belønninger",
    ],
    shoppable: false,
    stripe: {
      test: {
        productId: "prod_V60HgN0EFCzxre",
        priceId: "price_1U5oH9Rr2uZmH0wdOE6p6lJ1",
        monthlyPriceId: "price_1U5oH9Rr2uZmH0wdVzW1v3Wc",
      },
      live: {
        productId: "prod_V60HgN0EFCzxre",
        priceId: "price_1U5tg82LQpGDZNEWOBzAMmvu",
        monthlyPriceId: "price_1U5tg82LQpGDZNEWTFSgdiEe",
      },
    },
    mpn: "LS-KOMPLET",
    productType: "LoyalSum > Abonnement > LoyalSum Komplet",
  },

  // -------------------------------------------------------------- TILKØB --
  // Står i PRODUCTS og ikke for sig selv, fordi hele betalingsmaskineriet —
  // priceFor, stripeIdsFor, canSell, mængderabatten — arbejder på `Product`.
  // At lave en parallel type ville betyde en parallel checkout.
  //
  // `addon: true` er det, der holder den ude af de offentlige lister. Brug
  // KATALOG dér, hvor kunder skal se varer; brug PRODUCTS til opslag og køb.
  {
    slug: "ekstra-stander",
    platform: "multi",
    name: "Ekstra stander",
    keyword: "ekstra reviewstander",
    price: 399,
    interval: "one_time",
    addon: true,
    tagline: "Endnu et skilt til disken",
    description:
      "En stander mere til din forretning — samme sorte akryl med QR og NFC, med dit logo. Den kan pege på en ny QR-adresse eller på den samme som dine andre. Købes uanset hvilket abonnement du har, og ændrer ikke noget ved det.",
    image: "/mockups/stander-reviewstander.svg",
    features: [
      "Samme stander som dine nuværende",
      "QR + NFC",
      "Dit logo",
      "Påvirker ikke dit abonnement",
    ],
    shoppable: false,
    mpn: "LS-EKSTRA",
    stripe: {
      test: {
        productId: "prod_V77rcHM3RsTaUq",
        priceId: "price_1U6tc6Rr2uZmH0wddf9e17pl",
      },
      // LIVE MANGLER MED VILJE. Live-tilstanden er ikke åbnet, og id'erne
      // oprettes med scripts/setup-stripe-products.mjs og live-nøglen, når den
      // dag kommer — TILFØJ dem her ved siden af test, erstat aldrig.
      // Indtil da svarer canSell() falsk i live, og knappen vises ikke.
    },
  },
];

/**
 * Varerne kunder skal kunne SE.
 *
 * PRODUCTS er den fulde liste og bruges til opslag og køb. KATALOG er den
 * offentlige delmængde og driver katalogside, produktsider, prissektion,
 * footer og sitemap. Et tilkøb hører ingen af de steder hjemme: det giver kun
 * mening for en, der allerede er kunde, og en produktside for "Ekstra stander"
 * ville være en blindgyde for enhver anden.
 */
export const KATALOG: Product[] = PRODUCTS.filter((p) => !p.addon);

/**
 * Har virksomheden købt et produkt, der indeholder stempelkortet?
 *
 * `plan` kan ikke svare på det: både Reviewstander Pro og LoyalSum Komplet er
 * niveau `pro`, fordi de har samme review-funktioner. Forskellen er netop
 * stempelkortet, og den kendes kun via det købte produkt.
 */
export function hasLoyaltyAccess(
  productSlug: string | null | undefined,
): boolean {
  if (!productSlug) return false;
  return Boolean(getProduct(productSlug)?.includesLoyalSum);
}

/**
 * Fast dansk moms pr. Stripe-tilstand.
 *
 * BEVIDST ikke Stripe Tax (`automatic_tax`): den kræver en aktiv
 * momsregistrering i Stripe, og uden den opkræver Stripe slet ingen moms —
 * uden at fejle. En fast sats kan ikke fejle stille. Oprettes af
 * scripts/setup-stripe-products.mjs.
 */
export const STRIPE_TAX_RATES: Partial<Record<StripeMode, string>> = {
  test: "txr_1U5oRfRr2uZmH0wdIbfWhyuN",
  live: "txr_1U64CL2LQpGDZNEWyQ4Ty36P",
};

/**
 * Hvilket adgangsniveau følger med et produkt?
 *
 * Reviewstander uden abonnement giver ingen dashboardfunktioner — standeren
 * virker med sit eget link. Begge abonnementsvarer giver Pro; forskellen på
 * dem er stempelkortet, som styres af product_slug (se hasLoyaltyAccess).
 */
export function planForProduct(slug: string | null | undefined): Tier {
  const p = slug ? getProduct(slug) : undefined;
  return p?.monthlyPrice ? "pro" : "basic";
}

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

// ===========================================================================
// MATERIALER PÅ VEJ  —  PLACEHOLDERE
// Kommende fysiske varer ud over standeren. De er BEVIDST holdt uden for
// PRODUCTS, fordi den liste driver sitemap, footer-links, produktsider
// (generateStaticParams) og et kommende Google Shopping-feed — placeholdere
// hører ingen af de steder hjemme.
//
// Ingen af dem har pris endnu. Sæt ikke et tal på her: prisen ville blive vist
// som en rigtig pris på en offentlig side. Når en vare er klar, flyttes den
// over i PRODUCTS med rigtig pris, billede og egen side.
// ===========================================================================

export interface UpcomingItem {
  /** Bruges kun som React-key og til ikonvalg — ikke som URL. */
  key: string;
  name: string;
  tagline: string;
  /** Hvor i forretningen varen sidder. Holder listen konkret. */
  placering: string;
}

export const UPCOMING_MERCH: UpcomingItem[] = [
  {
    key: "bordskaaner",
    name: "Bordskåner med QR",
    tagline:
      "Ligger på bordet, mens gæsten alligevel venter. Et scan, og de er inde i dit stempelkort.",
    placering: "Bordet",
  },
  {
    key: "facadeplakat",
    name: "Facadeplakat",
    tagline:
      "Viser allerede ved døren, at I samler anmeldelser — og at der er en kundeklub indenfor.",
    placering: "Facaden",
  },
  {
    key: "vinduesmaerkat",
    name: "Vinduesmærkat",
    tagline:
      "Diskret mærkat til ruden. Fylder ingenting og virker døgnet rundt.",
    placering: "Ruden",
  },
  {
    key: "bordkort",
    name: "Bordkort",
    tagline:
      "Lille kort til hvert bord, så gæsten ikke skal hen til disken for at scanne.",
    placering: "Hvert bord",
  },
];

/** Højeste mængderabat (%) kunden opnår ved et givet antal standere. */
export function volumeDiscountPct(qty: number): number {
  let pct = 0;
  for (const b of VOLUME_DISCOUNTS) if (qty >= b.minQty) pct = b.discountPct;
  return pct;
}

export interface PriceBreakdown {
  qty: number;
  discountPct: number;
  /** Pris pr. stander efter mængderabat (engangs, afrundet). */
  standUnit: number;
  /** Listepris pr. stander før rabat. */
  standUnitBase: number;
  /** standUnit × antal — samlet engangs standerpris. */
  standTotal: number;
  /** Fast månedligt abonnement (0 hvis ingen) — UAFHÆNGIGT af antal. */
  monthly: number;
  /** Fast engangs opsætning (0 hvis ingen) — uafhængigt af antal. */
  setup: number;
  /**
   * Tillæg for egen farve på fronten (0 hvis ikke valgt).
   *
   * PR. ORDRE og UDEN mængderabat — det er én opsætning i trykket, uanset hvor
   * mange skilte der laves af den. Derfor ganges den ikke med antallet.
   */
  frontfarve: number;
  /** Samlet engangsbeløb: standere + opsætning + tilvalg. */
  oneTimeTotal: number;
}

/**
 * Beregner prisen for et antal standere. Kun standerprisen ganges med antal
 * (og får mængderabat); abonnement og opsætning er faste — uafhængigt af antal.
 */
/** Tilvalg der lægges på ORDREN og ikke på varen. */
export interface Tilvalg {
  /** Egen farve på den printede front. Fast pris pr. ordre. */
  egenFrontfarve?: boolean;
}

export function priceFor(
  product: Product,
  qty: number,
  tilvalg: Tilvalg = {},
): PriceBreakdown {
  const q = Math.max(1, Math.min(MAX_QTY, Math.floor(qty) || 1));
  const pct = volumeDiscountPct(q);
  const standUnit = Math.round(product.price * (1 - pct / 100));
  const standTotal = standUnit * q;
  const setup = product.setupPrice ?? 0;

  // Tilvalget lægges til ÉN gang og får ingen rabat: rabatten hører til
  // enheden, og der er kun én opsætning i trykket.
  const frontfarve =
    tilvalg.egenFrontfarve && harFysiskSkilt(product)
      ? EGEN_FRONTFARVE_PRIS
      : 0;

  return {
    qty: q,
    discountPct: pct,
    standUnit,
    standUnitBase: product.price,
    standTotal,
    monthly: product.monthlyPrice ?? 0,
    setup,
    frontfarve,
    oneTimeTotal: standTotal + setup + frontfarve,
  };
}

/**
 * Sender varen et fysisk skilt med posten?
 *
 * Alle varer gør det i dag, og derfor er flaget en UNDTAGELSE frem for et
 * krav: en ny vare er fysisk, medmindre nogen aktivt siger andet. Havde det
 * været omvendt, ville en glemt markering stille fjerne farvevalget og
 * logo-uploadet fra en vare, der skal sendes.
 */
export function harFysiskSkilt(product: Pick<Product, "kunDigital">): boolean {
  return !product.kunDigital;
}

/*
 * HER LÅ EN PARALLEL PRISSTIGE — `Plan`, `LOYALSUM_PLANS` og `getPlan()` —
 * med Basic 0 kr., Premium 79 kr./md. og Pro 149 kr./md.
 *
 * INGEN AF DE PRISER FANDTES. Abonnementet købes som en del af et produkt
 * (Reviewstander Pro 99 kr./md., LoyalSum Komplet 399 kr./md.), og
 * basic/premium/pro er ADGANGSNIVEAUER, der følger med købet — ikke varer.
 * Dashboardets abonnementsside blev rettet, dengang det blev opdaget, men
 * stigen blev stående og kunne rendres af den næste, der ledte efter en
 * prisliste i constants.
 *
 * Der er derfor ét sted at sælge fra: PRODUCTS, og KATALOG som den
 * offentlige delmængde.
 */

export const DESTINATION_LABELS: Record<string, string> = {
  google: "Google Anmeldelse",
  trustpilot: "Trustpilot",
  facebook: "Facebook",
  custom: "Eget link",
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  new: "Ny ordre",
  needs_onboarding: "Mangler onboarding",
  ready_for_production: "Klar til produktion",
  shipped: "Afsendt",
  cancelled: "Annulleret",
};
