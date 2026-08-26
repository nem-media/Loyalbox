/**
 * Handels-hjælpere: koblingspunkter til Stripe og Google Shopping.
 *
 * KLARGØRING — der er endnu ingen Stripe-konto og intet Merchant Center-feed.
 * Alt herinde er rene funktioner uden eksterne afhængigheder eller endpoints, så
 * de kan tages i brug uændret, når integrationerne bygges.
 */
import { getSiteUrl } from "@/lib/site";
import {
  COMMERCE,
  STRIPE_TAX_RATES,
  harFysiskSkilt,
  tierCan,
  type Product,
  type StripeIds,
  type StripeMode,
  type Tier,
} from "@/lib/constants";

/** True hvis Stripe-nøglen er sat i miljøet (server-only). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Hvilken Stripe-tilstand kører vi i? Afgøres af nøglen, ikke af en separat
 * indstilling — så kan de to ikke komme i utakt.
 */
export function stripeMode(): StripeMode {
  return process.env.STRIPE_SECRET_KEY?.startsWith("sk_live_")
    ? "live"
    : "test";
}

/**
 * Seed-testdomænet. Så længe Stripe kører på testnøglen, accepterer checkouten
 * kun testkort — en rigtig besøgende ville indtaste sit eget kort og få det
 * afvist. Derfor er betaling i testtilstand forbeholdt testkontiene.
 */
const TEST_BUYER_DOMAIN = "@loyalbox.test";

/** Er e-mailen en testkonto fra seed-data? */
export function isTestBuyer(email: string | null | undefined): boolean {
  return Boolean(email?.toLowerCase().endsWith(TEST_BUYER_DOMAIN));
}

/**
 * Kan varen overhovedet sælges i den aktuelle Stripe-tilstand?
 *
 * Tilstandene er adskilte verdener: id'er oprettet med testnøglen findes ikke i
 * live. Skifter man nøgle uden først at køre scripts/setup-stripe-products.mjs,
 * fejler salget — og de tre måder det fejler på er alle STILLE, hvilket er
 * derfor de spærres her frem for at blive opdaget på en faktura:
 *
 *  1. Produktet mangler   → checkout kan slet ikke oprettes.
 *  2. Månedsprisen mangler → købet bliver et ENGANGSKØB. Kunden betaler for
 *     standeren, får Pro-adgang via webhooken og trækkes aldrig igen.
 *  3. Momssatsen mangler  → der lægges INGEN moms på. Vi ville skylde SKAT 25 %
 *     af hvert salg uden at have opkrævet dem.
 */
export function canSell(product: Product): boolean {
  const ids = stripeIdsFor(product);
  if (!ids) return false;
  if (product.monthlyPrice && !ids.monthlyPriceId) return false;
  return Boolean(STRIPE_TAX_RATES[stripeMode()]);
}

/**
 * Må brugeren starte en betaling for denne vare?
 *
 * Der kræves en virksomhed at knytte købet til — uden den ved vi ikke, hvem der
 * skal have adgangen bagefter. Bemærk at rollen IKKE kan bruges her: admin er
 * ikke knyttet til en virksomhed (se getCurrentUser i src/lib/auth.ts), så et
 * admin-krav i testtilstand ville lukke for alle.
 *
 * Varen skal desuden være klar i den aktuelle tilstand, jf. canSell — ellers
 * ville live-nøglen åbne en købsknap, der fejler for enhver rigtig kunde.
 *
 * CVR SPÆRRER IKKE LÆNGERE. Vi sælger fortsat kun til virksomheder, men et
 * tomt felt er ikke længere en lukket dør: Stripe spørger selv om
 * momsnummeret ved betalingen (`tax_id_collection`), og momsen opkræves
 * uanset hvad via en fast sats. Kravet stod i vejen for en kunde, der bare
 * ikke havde nummeret ved hånden — og det er en dårlig grund til at afvise en
 * betaling. Nummeret valideres stadig med modulus 11, når det ER udfyldt.
 */
export type KoebSpaerre =
  /** Ingen virksomhed at knytte købet til. */
  | "ingen-virksomhed"
  /** Varen er ikke klar i denne tilstand, eller salget er ikke åbnet endnu. */
  | "ikke-aabnet";

/**
 * Hvad spærrer for et køb — eller null, hvis der ikke er noget i vejen.
 *
 * ÉN funktion, fordi knappen og ruten ellers kommer i utakt. Returnerer den en
 * GRUND og ikke bare falsk, kan /bestil skrive noget brugbart: "du har ingen
 * virksomhed" er en anden besked end "vi har ikke åbnet for salg endnu", og en
 * knap, der bare forsvinder, forklarer ingen af delene.
 */
export function koebSpaerre(
  user:
    | { email: string; company: { cvr?: string | null } | null }
    | null
    | undefined,
  product: Product | undefined,
): KoebSpaerre | null {
  if (!user?.company) return "ingen-virksomhed";

  // FØRST AF ALT: findes der en Stripe-nøgle i dette miljø?
  //
  // Uden den kaster stripe() ved første kald, og /api/checkout svarer 500.
  // canSell() fanger det IKKE: den kontrollerer kun, at id'erne og momssatsen
  // står i constants.ts for den aktuelle tilstand — og stripeMode() falder
  // tilbage til "test", netop når nøglen mangler. Resultatet var en købsknap,
  // der så helt normal ud og fejlede for enhver, der trykkede på den.
  //
  // isStripeConfigured() har ligget i denne fil hele tiden uden at blive brugt.
  if (!isStripeConfigured()) return "ikke-aabnet";

  if (!product || !canSell(product)) return "ikke-aabnet";
  if (stripeMode() !== "live" && !isTestBuyer(user.email)) return "ikke-aabnet";

  return null;
}

export function canStartCheckout(
  user:
    | { email: string; company: { cvr?: string | null } | null }
    | null
    | undefined,
  product: Product | undefined,
): boolean {
  return koebSpaerre(user, product) === null;
}

/**
 * Produktets Stripe-id'er for den aktuelle tilstand.
 *
 * Returnerer undefined, hvis produktet ikke er oprettet i den tilstand — fx
 * hvis man skifter til live-nøglen uden at have kørt
 * scripts/setup-stripe-products.mjs med den. Checkout skal fejle tydeligt dér
 * frem for at sende et test-id til live-API'et.
 */
export function stripeIdsFor(product: Product): StripeIds | undefined {
  return product.stripe?.[stripeMode()];
}

/**
 * Stripe Checkout-mode: abonnement for løbende produkter (Pro), engangsbetaling
 * for resten. Bruges når checkout-sessionen skal oprettes.
 */
export function checkoutMode(product: Product): "subscription" | "payment" {
  return product.monthlyPrice ? "subscription" : "payment";
}

/** Produkter der skal med i et Google Shopping-feed. */
export function shoppableProducts(products: Product[]): Product[] {
  return products.filter((p) => p.shoppable);
}

/** Google Shopping-lagerstatus → schema.org URL (til Product JSON-LD). */
function schemaAvailability(): string {
  return COMMERCE.availability === "in_stock"
    ? "https://schema.org/InStock"
    : "https://schema.org/OutOfStock";
}

/**
 * Product JSON-LD (schema.org) til produktsiden. Giver Google struktureret data
 * om pris, tilgængelighed og brand → mulighed for rich results i søgeresultater.
 */
export function toProductJsonLd(product: Product) {
  const base = getSiteUrl();
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: `${base}${product.image}`,
    brand: { "@type": "Brand", name: COMMERCE.brand },
    sku: product.mpn,
    mpn: product.mpn,
    category: product.productType,
    offers: {
      "@type": "Offer",
      price: product.price,
      priceCurrency: COMMERCE.currency,
      availability: schemaAvailability(),
      url: `${base}/produkter/${product.slug}`,
    },
  };
}

/**
 * Mapper et produkt til Google Shopping-attributter (Merchant Center-feedspec).
 * Ren funktion — klar til at blive serialiseret til XML/JSON, når feed-endpointet
 * engang bygges. Absolutte URL'er udledes fra site-URL'en.
 */
export function toGoogleShoppingItem(product: Product) {
  const base = getSiteUrl();
  const hasIdentifier = Boolean(product.gtin) || Boolean(product.mpn);
  return {
    id: product.slug,
    title: product.name,
    description: product.description,
    link: `${base}/produkter/${product.slug}`,
    image_link: `${base}${product.image}`,
    additional_image_link: (product.additionalImages ?? []).map(
      (src) => `${base}${src}`,
    ),
    availability: COMMERCE.availability,
    price: `${product.price}.00 ${COMMERCE.currency}`,
    brand: COMMERCE.brand,
    condition: COMMERCE.condition,
    google_product_category: COMMERCE.googleProductCategory,
    product_type: product.productType,
    gtin: product.gtin,
    mpn: product.mpn,
    // Google kræver identifier_exists=no, når hverken GTIN eller brand+MPN findes.
    identifier_exists: hasIdentifier ? "yes" : "no",
  };
}

/**
 * Skal bestillingen oplyse, hvad skiltet peger på?
 *
 * REGLEN: et fysisk skilt uden abonnement kan IKKE omdirigeres bagefter.
 * Kunden har ingen dynamiske links, QR-koden er trykt, og destinationen er
 * dermed afgjort én gang for alle i det øjeblik, skiltet gaar i trykken.
 * Oplyses den ikke ved bestillingen, findes den aldrig — og resultatet er et
 * skilt, der fører ingen steder hen og kun kan rettes med et nyt tryk.
 *
 * MED ABONNEMENT er det harmløst at vente: destinationen sættes i
 * dashboardet når som helst, og QR'en peger på /r/<slug>, som vi styrer.
 *
 * TO KILDER TIL ET ABONNEMENT, og begge skal med:
 *
 *  - Varen, der købes nu (`monthlyPrice`) — førstegangskøb af Pro/Komplet.
 *  - Kundens BESTÅENDE forhold (`plan`) — et tilkøb som "Ekstra stander"
 *    har ingen månedspris, men køberen kan sagtens være Pro-kunde i
 *    forvejen. Uden dette led ville en Pro-kunde blive tvunget til at
 *    oplyse en destination, de kan skifte fem minutter senere.
 *
 * Bruges BÅDE af bestillingsformularen og af /api/checkout — ét sted, så
 * feltet ikke kan blive vist uden at blive krævet, eller omvendt.
 */
export function kraeverDestination(
  product: Product | undefined,
  company: { plan?: string | null } | null | undefined,
): boolean {
  if (!product || !harFysiskSkilt(product)) return false;
  if (product.monthlyPrice) return false;
  return !tierCan((company?.plan ?? "basic") as Tier, "dynamicLinks");
}
