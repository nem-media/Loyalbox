import Link from "next/link";
import { PRODUCTS } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ProductPrice } from "@/components/product-price";

/**
 * Produktkort over standerne (platform-baseret katalog). Bruges på forsiden og
 * på /reviewstander. Hvert kort linker til produktets egen SEO-side.
 */
export function Pricing() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {PRODUCTS.map((p) => (
        <Link
          key={p.slug}
          href={`/produkter/${p.slug}`}
          className="group box-shape flex flex-col overflow-hidden border border-border bg-card transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.4)]"
        >
          <div className="relative aspect-[4/5] overflow-hidden bg-[#e9ebee]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={p.image}
              alt={p.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            {p.featured ? (
              <div className="absolute left-3 top-3">
                <Badge tone="accent">Mest populær</Badge>
              </div>
            ) : null}
          </div>
          <div className="flex flex-1 flex-col p-5">
            <h3 className="font-bold tracking-tight">{p.name}</h3>
            <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            <div className="mt-4">
              <ProductPrice product={p} />
            </div>
            <span className="mt-4 text-sm font-medium text-accent">
              Se produkt →
            </span>
          </div>
        </Link>
      ))}
    </div>
  );
}
