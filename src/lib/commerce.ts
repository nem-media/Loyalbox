/**
 * Handels-hjælpere: koblingspunkter til Stripe og Google Shopping.
 *
 * KLARGØRING — der er endnu ingen Stripe-konto og intet Merchant Center-feed.
 * Alt herinde er rene funktioner uden eksterne afhængigheder eller endpoints, så
 * de kan tages i brug uændret, når integrationerne bygges.
 */
import { getSiteUrl } from "@/lib/site";
import { COMMERCE, type Product } from "@/lib/constants";

/** True hvis Stripe-nøglen er sat i miljøet (server-only). */
export function isStripeConfigured(): boolean {
  return Boolean(process.env.STRIPE_SECRET_KEY);
}

/**
 * Stripe Checkout-mode: abonnement for løbende produkter (Pro), engangsbetaling
 * for resten. Bruges når checkout-sessionen skal oprettes.
 */
export function checkoutMode(product: Product): "subscription" | "payment" {
  return product.interval === "month" ? "subscription" : "payment";
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
