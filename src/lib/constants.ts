export const SITE_NAME = "ReviewStand.dk";
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

export interface Product {
  slug: string;
  tier: Tier;
  name: string;
  price: number; // DKK
  interval: "one_time" | "month";
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
  /** Vises som product_type i feedet, fx "ReviewStand > Standere > Basic". */
  productType?: string;
  /** Ekstra produktbilleder (additional_image_link). Stier under /public. */
  additionalImages?: string[];
}

/**
 * Globale handelsdata delt af hele kataloget — til Stripe-checkout og et kommende
 * Google Shopping-feed. Ét sted, så vi ikke gentager dem pr. produkt.
 */
export const COMMERCE = {
  brand: SITE_NAME.replace(".dk", ""), // "ReviewStand"
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

export const PRODUCTS: Product[] = [
  {
    slug: "basic",
    tier: "basic",
    name: "ReviewStand Basic",
    price: 299,
    interval: "one_time",
    tagline: "Kom i gang med anmeldelser",
    description:
      "Den enkle vej til flere anmeldelser. En elegant bordstander i sort akryl med QR-kode og NFC, klar til at stå ved kassen eller på bordet. Gæsten scanner eller tapper og bliver sendt direkte til din Google-anmeldelse.",
    image: "/produkt-basic.png",
    features: ["1 stander", "QR + NFC", "Standard design"],
    shoppable: true,
    mpn: "RS-BASIC",
    productType: "ReviewStand > Standere > Basic",
  },
  {
    slug: "premium",
    tier: "premium",
    name: "ReviewStand Premium",
    price: 499,
    interval: "one_time",
    tagline: "Din egen branding",
    description:
      "Samme robuste stander — nu med dit eget logo og et design tilpasset din forretning. Skil dig ud på bordet og gør oplevelsen til din egen, mens du samler flere anmeldelser.",
    image: "/produkt-basic.png",
    features: ["1 stander", "QR + NFC", "Dit logo", "Tilpasset design"],
    featured: true,
    shoppable: true,
    mpn: "RS-PREMIUM",
    productType: "ReviewStand > Standere > Premium",
  },
  {
    slug: "pro",
    tier: "pro",
    name: "ReviewStand Pro",
    price: 149,
    interval: "month",
    tagline: "Fuld indsigt og fleksibilitet",
    description:
      "Alt i Premium plus et abonnement med fuldt dashboard, realtidsstatistik og dynamiske links, du kan ændre når som helst — uden at genoptrykke standeren. Til dig der vil forstå dine kunder for alvor.",
    image: "/produkt-basic.png",
    features: [
      "Stander",
      "Dashboard",
      "Statistik",
      "Dynamisk link",
      "Abonnement",
    ],
    // Abonnement (ikke et fysisk engangsprodukt) — ikke med i Shopping-feedet.
    shoppable: false,
    mpn: "RS-PRO",
    productType: "ReviewStand > Abonnement > Pro",
  },
];

export function getProduct(slug: string): Product | undefined {
  return PRODUCTS.find((p) => p.slug === slug);
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
