import Link from "next/link";
import { KATALOG } from "@/lib/constants";
import { Badge } from "@/components/ui/badge";
import { ProductPrice } from "@/components/product-price";
import { StanderPlaceholder } from "@/components/product-placeholder";

/**
 * Produktkort over standerne, drevet af KATALOG. Hvert kort linker til
 * produktets egen SEO-side.
 *
 * BRUGES KUN PÅ /bestil. Der stod før, at den blev brugt "på forsiden og på
 * /reviewstander", og ingen af delene passede: prissektionen blev taget af
 * forsiden, dengang den blev positioneret som platform frem for som stander,
 * og /reviewstander har sin egen sammenligning. En doc-kommentar, der peger
 * på kaldesteder, der ikke findes, er værre end ingen — den bruges til at
 * vurdere, hvad en ændring rammer.
 */
export function Pricing() {
  return (
    <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
      {KATALOG.map((p) => (
        <Link
          key={p.slug}
          href={`/produkter/${p.slug}`}
          className="group box-shape flex flex-col overflow-hidden border border-border bg-card transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.4)]"
        >
          <StanderPlaceholder
            className="aspect-[4/5]"
            iconClassName="h-24 w-24 transition-transform duration-300 group-hover:scale-110"
          >
            {p.featured ? (
              <div className="absolute left-3 top-3">
                <Badge tone="accent">Mest populær</Badge>
              </div>
            ) : null}
          </StanderPlaceholder>
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
