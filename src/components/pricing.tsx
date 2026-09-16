import Link from "next/link";
import { KATALOG, PRODUKT_FOTO } from "@/lib/constants";
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
          {/*
            FOTOET FINDES — OG STOD KUN PÅ /produkter. Her blev attrappen
            tegnet ubetinget, så de tre varer havde et rigtigt billede på
            katalogsiden og badgen "Foto på vej" ét klik senere, på den side
            man faktisk køber fra. Badgen var altså ikke længere sand, og den
            stod netop dér, hvor den kostede mest. `PRODUKT_FOTO` er kilden
            begge steder, og attrappen bliver stående som reserve for en vare
            uden foto (plakater, mærkater og flyers, når de kommer).
          */}
          {PRODUKT_FOTO[p.slug] ? (
            <div className="relative aspect-[4/5] overflow-hidden">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={PRODUKT_FOTO[p.slug]}
                alt={`${p.name} — reviewstander i brug`}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {/* SOLIDT mærke og ikke <Badge>: den er bg-accent/10 og
                  forsvinder over et foto. Samme greb som på /produkter. */}
              {p.featured ? (
                <span className="box-shape absolute left-3 top-3 bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]">
                  Mest populær
                </span>
              ) : null}
            </div>
          ) : (
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
          )}
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
