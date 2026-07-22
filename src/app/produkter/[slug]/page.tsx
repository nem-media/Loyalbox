import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { PRODUCTS, getProduct } from "@/lib/constants";
import { toProductJsonLd } from "@/lib/commerce";
import { formatCurrency } from "@/lib/utils";
import { QuantityOrder } from "@/components/quantity-order";

export function generateStaticParams() {
  return PRODUCTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) return { title: "Produkt" };
  return {
    title: product.metaTitle ?? product.name,
    description: product.description,
    alternates: { canonical: `/produkter/${product.slug}` },
    openGraph: {
      type: "website",
      title: `${product.name} – ${formatCurrency(product.price)}`,
      description: product.description,
      url: `/produkter/${product.slug}`,
      images: [{ url: product.image }],
    },
  };
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const product = getProduct(slug);
  if (!product) notFound();

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: JSON.stringify(toProductJsonLd(product)),
        }}
      />
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:py-16">
        <nav className="mb-8 text-sm text-muted">
          <Link href="/produkter" className="hover:text-foreground">
            Produkter
          </Link>
          <span className="mx-2">/</span>
          <span className="text-foreground">{product.name}</span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Billede */}
          <div className="box-shape overflow-hidden border border-border bg-[#e9ebee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={product.image}
              alt={product.name}
              width={1024}
              height={1536}
              className="h-auto w-full"
            />
          </div>

          {/* Detaljer */}
          <div className="flex flex-col">
            {product.featured ? (
              <div className="mb-3">
                <Badge tone="accent">Mest populær</Badge>
              </div>
            ) : null}
            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              {product.name}
            </h1>
            <p className="mt-2 text-lg text-muted">{product.tagline}</p>

            <p className="mt-6 text-muted">{product.description}</p>

            <ul className="mt-6 space-y-2 text-sm">
              {product.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8">
              <QuantityOrder product={product} mode="order" />
            </div>
            <div className="mt-3">
              <Link href="/produkter" className="text-sm font-medium text-accent">
                Se alle produkter →
              </Link>
            </div>

            <div className="mt-6 box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
              Fri fragt i Danmark · Klar til brug ud af kassen ·{" "}
              {product.monthlyPrice
                ? "Ingen binding ud over løbende måned"
                : "Ingen binding"}{" "}
              · Alle priser ex moms
            </div>

            {/* LoyalBox: hele platformen inkluderet — ellers op-salg til Komplet */}
            {product.includesLoyalbox ? (
              <div className="mt-4 box-shape border border-accent/30 bg-accent/5 p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg text-xs font-bold">
                    L
                  </span>
                  <h2 className="font-bold">Hele LoyalBox er med</h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Digitalt stempelkort uden app, flere Google-anmeldelser, privat
                  feedback, opslag af dine bedste anmeldelser og statistik i
                  realtid — sat op og klar til disken.
                </p>
              </div>
            ) : (
              <div className="mt-4 box-shape border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg text-xs font-bold">
                    L
                  </span>
                  <h2 className="font-bold">Vil du også have faste kunder?</h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Med <strong>LoyalBox Komplet</strong> får du et digitalt
                  stempelkort uden app oveni — så nye kunder bliver til
                  gengangere. Plus opslag af dine bedste anmeldelser.
                </p>
                <Link
                  href="/produkter/loyalbox-komplet"
                  className="mt-3 inline-block text-sm font-medium text-accent"
                >
                  Se LoyalBox Komplet →
                </Link>
              </div>
            )}
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
