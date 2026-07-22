export const SITE_NAME = "LoyalBox.dk";
export const SITE_TAGLINE =
  "Flere anmeldelser og flere faste kunder — fra ét lille skilt på disken. Digitalt stempelkort og 5-stjernede anmeldelser, uden app for dine kunder.";

/**
 * Målsøgeord kunder skal finde os på (organisk + Shopping). Dækker begge motorer:
 * loyalitet/stempelkort OG anmeldelser. Væves naturligt ind i titler/beskrivelser
 * — ikke keyword-stuffing.
 */
export const SEO_KEYWORDS = [
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

export const TIER_LABELS: Record<Tier, string> = {
  basic: "Basic",
  premium: "Premium",
  pro: "Pro",
};

export const TIER_ORDER: Tier[] = ["basic", "premium", "pro"];

/** True if the given tier unlocks the capability. Unknown tier → basic. */
export function tierCan(tier: Tier | null | undefined, cap: Capability): boolean {
  return TIER_CAPABILITIES[tier ?? "basic"]?.[cap] ?? false;
}

export type Platform =
  | "google"
  | "trustpilot"
  | "tripadvisor"
  | "facebook"
  | "multi";

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
  /** True hvis produktet inkluderer hele LoyalBox-platformen (komplet pakke). */
  includesLoyalbox?: boolean;
  tagline: string;
  description: string;
  image: string;
  features: string[];
  featured?: boolean;

  // --- Betaling (Stripe) — udfyldes når Stripe-kontoen er oprettet ---
  /** Stripe Product-ID (prod_…). Tomt indtil produktet er oprettet i Stripe. */
  stripeProductId?: string;
  /** Stripe Price-ID (price_…). Én pris pr. produkt/interval. */
  stripePriceId?: string;

  // --- Google Shopping / Merchant Center ---
  /** Med i et Google Shopping-feed? Som udgangspunkt kun fysiske engangsprodukter. */
  shoppable?: boolean;
  /** Vores eget varenummer. Bruges som identifier når produktet ikke har GTIN. */
  mpn?: string;
  /** Stregkode (EAN/UPC), hvis produktet får en. Ellers udeladt. */
  gtin?: string;
  /** Vises som product_type i feedet, fx "LoyalBox > Standere > Basic". */
  productType?: string;
  /** Ekstra produktbilleder (additional_image_link). Stier under /public. */
  additionalImages?: string[];
}

/**
 * Globale handelsdata delt af hele kataloget — til Stripe-checkout og et kommende
 * Google Shopping-feed. Ét sted, så vi ikke gentager dem pr. produkt.
 */
export const COMMERCE = {
  brand: SITE_NAME.replace(".dk", ""), // "LoyalBox"
  currency: "DKK",
  /** Google Shopping: alle standere er nye. */
  condition: "new",
  /** Google Shopping: lagerstatus (juster hvis den skal styres pr. produkt). */
  availability: "in_stock",
  /**
   * Google Merchant produktkategori. Kvalificeret bud for en bord-/displaystander
   * — verificér/justér i Merchant Center, når feedet oprettes.
   */
  googleProductCategory: "Business & Industrial > Retail > Retail Display Props",
} as const;

// ===========================================================================
// PRODUKTER & PRISER  —  REDIGÉR HER
// Tre varer i en klar stige. Kunden vælger antal 1–30 med automatisk
// mængderabat. Priser står direkte på hver vare herunder; mængderabatten
// styres ét sted (VOLUME_DISCOUNTS). Alt væves automatisk ud i katalog,
// produktsider og checkout.
// ===========================================================================

/** Maksimalt antal standere pr. ordre. */
export const MAX_QTY = 30;

/**
 * Mængderabat: rabat pr. stander når man køber mindst `minQty` stk. Rediger frit
 * — sæt discountPct: 0 for at slå et trin fra, eller tilføj/fjern trin. Rabatten
 * gælder pr. stander (og evt. månedspris).
 */
export const VOLUME_DISCOUNTS: { minQty: number; discountPct: number }[] = [
  { minQty: 1, discountPct: 0 },
  { minQty: 3, discountPct: 5 },
  { minQty: 10, discountPct: 10 },
  { minQty: 20, discountPct: 15 },
];

/** Alle priser i shoppen vises ex moms. */
export const PRICES_EX_VAT = true;

/**
 * De tre varer — REDIGÉR pris/opsætning direkte på hver vare herunder.
 * 1) Reviewstander (engangskøb, selvvalgt link)
 * 2) Reviewstander Pro (review-platform: smart flow + dynamiske links, abonnement)
 * 3) LoyalBox Komplet (alt inkl. stempelkort & opslag, abonnement)
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
    includesLoyalbox: false,
    tagline: "Selvvalgt anmeldelseslink",
    description:
      "Elegant bordstander i sort akryl med QR og NFC. Du sætter selv linket — til Google, Trustpilot, Tripadvisor, Facebook eller din egen side. Indsæt dit logo og link, sæt den på disken, og du er klar. Ingen abonnement.",
    image: "/mockups/stander-alt-i-en.svg",
    features: [
      "Selvvalgt link (Google, Trustpilot, Tripadvisor, Facebook…)",
      "QR + NFC — kunden scanner eller tapper",
      "Dit logo & link",
      "Klar til brug — ingen abonnement",
    ],
    shoppable: true,
    mpn: "LB-REVIEW",
    productType: "LoyalBox > Standere > Reviewstander",
  },
  {
    slug: "reviewstander-pro",
    platform: "multi",
    name: "Reviewstander Pro",
    keyword: "reviewstander abonnement",
    metaTitle: "Reviewstander Pro — smart review-flow & dynamiske links",
    price: 399,
    interval: "one_time",
    monthlyPrice: 99,
    setupPrice: 495,
    includesLoyalbox: false,
    tagline: "Smart review-flow + dynamiske links",
    description:
      "Standeren med LoyalBox review-platformen oveni. På din dedikerede anmeldelsesside vælger du selv, hvilke platforme kunderne kan anmelde dig på (Google, Trustpilot, Facebook) — plus et eget link til fx dit menukort eller booking. Et smart review-flow sender glade kunder videre, mens kritik lander privat i dit dashboard, så en enkelt dårlig oplevelse ikke bliver en offentlig 1-stjerne. Skift links når som helst, og følg det hele i realtid.",
    image: "/mockups/stander-alt-i-en-komplet.svg",
    features: [
      "Dedikeret anmeldelsesside — vælg selv platforme (Google, Trustpilot, Facebook)",
      "Eget link til fx menukort eller booking",
      "Smart review-flow (glade → offentlig, kritik → privat)",
      "Dynamiske links — skift når som helst",
      "Privat feedback-indbakke & statistik",
    ],
    shoppable: false,
    mpn: "LB-REVIEW-PRO",
    productType: "LoyalBox > Abonnement > Reviewstander Pro",
  },
  {
    slug: "loyalbox-komplet",
    platform: "multi",
    name: "LoyalBox Komplet",
    keyword: "digitalt stempelkort og anmeldelser",
    metaTitle: "LoyalBox Komplet — stempelkort, anmeldelser & opslag",
    price: 399,
    interval: "one_time",
    monthlyPrice: 399,
    setupPrice: 950,
    includesLoyalbox: true,
    featured: true,
    tagline: "Hele platformen — reviews + stempelkort",
    description:
      "Alt i Reviewstander Pro — plus et digitalt stempelkort uden app for dine kunder. Kunderne tilmelder sig selv på standeren, personalet giver stempler med ét scan, og du laver opslag af dine bedste anmeldelser. Flere nye kunder, og flere der kommer igen — samlet ét sted.",
    image: "/mockups/stander-google-komplet.svg",
    features: [
      "Alt i Reviewstander Pro",
      "Digitalt stempelkort — uden app",
      "Scan-til-stempel over disken",
      "Opslag af dine bedste anmeldelser",
      "Kundeklub & belønninger",
    ],
    shoppable: false,
    mpn: "LB-KOMPLET",
    productType: "LoyalBox > Abonnement > LoyalBox Komplet",
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
}

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
  /** Samlet engangsbeløb: standere + opsætning. */
  oneTimeTotal: number;
}

/**
 * Beregner prisen for et antal standere. Kun standerprisen ganges med antal
 * (og får mængderabat); abonnement og opsætning er faste — uafhængigt af antal.
 */
export function priceFor(product: Product, qty: number): PriceBreakdown {
  const q = Math.max(1, Math.min(MAX_QTY, Math.floor(qty) || 1));
  const pct = volumeDiscountPct(q);
  const standUnit = Math.round(product.price * (1 - pct / 100));
  const standTotal = standUnit * q;
  const setup = product.setupPrice ?? 0;
  return {
    qty: q,
    discountPct: pct,
    standUnit,
    standUnitBase: product.price,
    standTotal,
    monthly: product.monthlyPrice ?? 0,
    setup,
    oneTimeTotal: standTotal + setup,
  };
}

/**
 * LoyalBox-abonnementet (tilkøb til standeren). Adskilt fra de fysiske produkter:
 * standeren virker standalone, men LoyalBox låser dashboard, statistik og
 * dynamiske links op. Driver plan-vælgeren og prissektionen.
 */
export interface Plan {
  tier: Tier;
  name: string;
  price: number; // DKK pr. måned; 0 = gratis
  tagline: string;
  features: string[];
  featured?: boolean;
}

export const LOYALBOX_PLANS: Plan[] = [
  {
    tier: "basic",
    name: "Basic",
    price: 0,
    tagline: "Standeren virker standalone",
    features: ["Link til din anmeldelsesside", "QR + NFC", "Intet abonnement"],
  },
  {
    tier: "premium",
    name: "Premium",
    price: 79,
    tagline: "Din egen branding",
    features: ["Alt i Basic", "Eget logo & design", "Prioriteret support"],
    featured: true,
  },
  {
    tier: "pro",
    name: "Pro",
    price: 149,
    tagline: "Fuld indsigt & fleksibilitet",
    features: [
      "Alt i Premium",
      "Fuldt dashboard",
      "Realtidsstatistik",
      "Dynamiske links",
      "Privat feedback-indbakke",
    ],
  },
];

export function getPlan(tier: Tier): Plan {
  return LOYALBOX_PLANS.find((p) => p.tier === tier) ?? LOYALBOX_PLANS[0];
}

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
