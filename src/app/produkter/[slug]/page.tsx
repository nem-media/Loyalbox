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
    title: `${product.name} – review stander med QR & NFC`,
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
          <span className="text-foreground">
            {product.name.replace("ReviewStand ", "")}
          </span>
        </nav>

        <div className="grid gap-10 lg:grid-cols-2">
          {/* Billede */}
          <div className="box-shape overflow-hidden border border-border bg-dark">
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

            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">
                {formatCurrency(product.price)}
              </span>
              <span className="text-muted">
                {product.interval === "month" ? "/md" : "engangs"}
              </span>
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
                Bestil {product.name.replace("ReviewStand ", "")}
              </ButtonLink>
              <ButtonLink href="/produkter" variant="outline" size="lg">
                Se alle produkter
              </ButtonLink>
            </div>

            <div className="mt-6 box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
              Fri fragt i Danmark · Klar til brug ud af kassen ·{" "}
              {product.interval === "month"
                ? "Ingen binding ud over løbende måned"
                : "Ingen binding"}
            </div>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
