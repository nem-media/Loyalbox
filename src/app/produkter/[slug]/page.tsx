import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { PRODUCTS, getProduct } from "@/lib/constants";
import { toProductJsonLd } from "@/lib/commerce";
import { formatCurrency } from "@/lib/utils";
import { ProductPrice } from "@/components/product-price";

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

            <div className="mt-6">
              <ProductPrice product={product} size="lg" />
            </div>

            <p className="mt-6 text-muted">{product.description}</p>

            <ul className="mt-6 space-y-2 text-sm">
              {product.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <ButtonLink
                href={`/bestil?produkt=${product.slug}`}
                size="lg"
                className="flex-1"
              >
                Bestil {product.name}
              </ButtonLink>
              <ButtonLink href="/produkter" variant="outline" size="lg">
                Se alle produkter
              </ButtonLink>
            </div>

            <div className="mt-6 box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
              Fri fragt i Danmark · Klar til brug ud af kassen ·{" "}
              {product.interval === "month"
                ? "Ingen binding ud over løbende måned"
                : "Ingen binding"}{" "}
              · Alle priser ex moms
            </div>

            {/* LoyalBox: inkluderet (komplet) eller tilkøb (standalone) */}
            {product.includesLoyalbox ? (
              <div className="mt-4 box-shape border border-accent/30 bg-accent/5 p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg text-xs font-bold">
                    L
                  </span>
                  <h2 className="font-bold">LoyalBox er inkluderet</h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Denne komplet-pakke indeholder hele LoyalBox-platformen: fuldt
                  dashboard, realtidsstatistik, dynamiske links og privat
                  feedback — sat op og klar til brug.
                </p>
              </div>
            ) : (
              <div className="mt-4 box-shape border border-border bg-card p-5">
                <div className="flex items-center gap-2">
                  <span className="grid h-6 w-6 place-items-center rounded-md bg-accent text-accent-fg text-xs font-bold">
                    L
                  </span>
                  <h2 className="font-bold">Vil du have det hele?</h2>
                </div>
                <p className="mt-2 text-sm text-muted">
                  Standeren virker helt uden abonnement. Vil du have fuldt
                  dashboard, statistik, dynamiske links og privat feedback, så
                  vælg komplet-pakken med LoyalBox-platformen oveni.
                </p>
                <Link
                  href={`/produkter/${product.slug}-komplet`}
                  className="mt-3 inline-block text-sm font-medium text-accent"
                >
                  Se komplet-pakken →
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
