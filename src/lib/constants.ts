export const SITE_NAME = "LoyalBox.dk";
export const SITE_TAGLINE =
  "Få flere anmeldelser, forstå dine kunder og styrk din lokale forretning.";

/**
 * Målsøgeord kunder skal finde os på (organisk + Shopping). Væves naturligt ind
 * i titler/beskrivelser — ikke keyword-stuffing.
 */
export const SEO_KEYWORDS = [
  "reviewstander",
  "review stander",
  "google review skilt",
  "google anmeldelse skilt",
  "anmeldelsesstander",
  "NFC anmeldelse stander",
  "QR anmeldelse skilt",
  "anmeldelsesskilt til butik",
  "flere google anmeldelser",
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
  price: number; // DKK ex moms (månedspris hvis interval = "month")
  interval: "one_time" | "month";
  /** Engangs-opsætningsgebyr (DKK ex moms) for komplet/abonnement-pakker. */
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

/** Fælles data pr. platform. Hver base bliver til to produkter: standalone + komplet. */
interface ProductBase {
  key: string;
  platform: Platform;
  slug: string;
  name: string;
  label: string;
  keyword: string;
  metaTitle: string;
  tagline: string;
  description: string;
  features: string[];
  mpn: string;
  standalonePrice: number;
}

const PRODUCT_BASES: ProductBase[] = [
  {
    key: "google",
    platform: "google",
    slug: "google-review-stander",
    name: "Google Review Stander",
    label: "Google",
    keyword: "google review stander",
    metaTitle: "Google Review Stander med QR & NFC",
    tagline: "Flere Google-anmeldelser",
    description:
      "Elegant bordstander i sort akryl, der sender dine kunder direkte til din Google-anmeldelse. Gæsten scanner QR-koden eller tapper med NFC — du indsætter blot dit link og logo, og standeren er klar til kassen eller bordet.",
    features: ["Sender direkte til Google", "QR + NFC", "Dit logo & link", "Klar til brug"],
    mpn: "LB-GOOGLE",
    standalonePrice: 399,
  },
  {
    key: "trustpilot",
    platform: "trustpilot",
    slug: "trustpilot-stander",
    name: "Trustpilot Stander",
    label: "Trustpilot",
    keyword: "trustpilot stander",
    metaTitle: "Trustpilot Stander med QR & NFC",
    tagline: "Flere Trustpilot-anmeldelser",
    description:
      "Saml flere Trustpilot-anmeldelser med en stilren stander i sort akryl. Kunden scanner eller tapper og sendes direkte til din Trustpilot-side — du indsætter blot dit link og logo.",
    features: ["Sender direkte til Trustpilot", "QR + NFC", "Dit logo & link", "Klar til brug"],
    mpn: "LB-TRUSTPILOT",
    standalonePrice: 399,
  },
  {
    key: "tripadvisor",
    platform: "tripadvisor",
    slug: "tripadvisor-stander",
    name: "Tripadvisor Stander",
    label: "Tripadvisor",
    keyword: "tripadvisor stander",
    metaTitle: "Tripadvisor Stander med QR & NFC",
    tagline: "Flere Tripadvisor-anmeldelser",
    description:
      "Perfekt til restauranter, caféer og hoteller. Standeren sender dine gæster direkte til din Tripadvisor-side med et scan eller tap — du indsætter blot dit link og logo.",
    features: ["Sender direkte til Tripadvisor", "QR + NFC", "Dit logo & link", "Klar til brug"],
    mpn: "LB-TRIPADVISOR",
    standalonePrice: 399,
  },
  {
    key: "facebook",
    platform: "facebook",
    slug: "facebook-stander",
    name: "Facebook Stander",
    label: "Facebook",
    keyword: "facebook anmeldelser stander",
    metaTitle: "Facebook Stander med QR & NFC",
    tagline: "Flere Facebook-anbefalinger",
    description:
      "Få flere anbefalinger på din Facebook-side. Standeren i sort akryl sender kunden direkte til Facebook med et scan eller tap — du indsætter blot dit link og logo.",
    features: ["Sender direkte til Facebook", "QR + NFC", "Dit logo & link", "Klar til brug"],
    mpn: "LB-FACEBOOK",
    standalonePrice: 399,
  },
  {
    key: "alt-i-en",
    platform: "multi",
    slug: "alt-i-en-stander",
    name: "Alt-i-én Stander",
    label: "Alt-i-én",
    keyword: "review stander",
    metaTitle: "Alt-i-én Review Stander — Google, Trustpilot & Facebook",
    tagline: "Alle platforme på ét kort",
    description:
      "Lad kunden selv vælge platform. Denne stander viser Google, Trustpilot og Facebook på ét kort — så alle kan anmelde dig, hvor de foretrækker. Sort akryl med QR og NFC, klar med dit logo og dine links.",
    features: [
      "Google, Trustpilot & Facebook",
      "QR + NFC",
      "Dit logo & links",
      "Kunden vælger selv",
    ],
    mpn: "LB-MULTI",
    standalonePrice: 499,
  },
];

/** Komplet-pakkens pris: månedspris (ex moms) + engangs opsætning (ex moms). */
export const KOMPLET_MONTHLY = 399;
export const KOMPLET_SETUP = 895;

/** Alle priser i shoppen vises ex moms. */
export const PRICES_EX_VAT = true;

const KOMPLET_FEATURES = [
  "Standeren inkl. alt",
  "Fuldt LoyalBox-dashboard",
  "Realtidsstatistik",
  "Dynamiske links",
  "Privat feedback-indbakke",
];

export const PRODUCTS: Product[] = PRODUCT_BASES.flatMap((b): Product[] => [
  {
    slug: b.slug,
    platform: b.platform,
    name: b.name,
    keyword: b.keyword,
    metaTitle: b.metaTitle,
    price: b.standalonePrice,
    interval: "one_time",
    includesLoyalbox: false,
    tagline: b.tagline,
    description: b.description,
    image: `/mockups/stander-${b.key}.svg`,
    features: b.features,
    shoppable: true,
    mpn: b.mpn,
    productType: `LoyalBox > Standere > ${b.label}`,
  },
  {
    slug: `${b.slug}-komplet`,
    platform: b.platform,
    name: `${b.name} – Komplet`,
    keyword: `${b.keyword} inkl. loyalbox`,
    metaTitle: `${b.name} inkl. LoyalBox — komplet pakke`,
    price: KOMPLET_MONTHLY,
    interval: "month",
    setupPrice: KOMPLET_SETUP,
    includesLoyalbox: true,
    featured: b.key === "alt-i-en",
    tagline: "Komplet pakke med LoyalBox",
    description: `${b.description} Komplet-pakken inkluderer hele LoyalBox-platformen: fuldt dashboard, realtidsstatistik, dynamiske links du kan ændre når som helst, og privat feedback — sat op og klar til brug.`,
    image: `/mockups/stander-${b.key}-komplet.svg`,
    features: KOMPLET_FEATURES,
    shoppable: false,
    mpn: `${b.mpn}-K`,
    productType: `LoyalBox > Komplet > ${b.label}`,
  },
]);

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
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
