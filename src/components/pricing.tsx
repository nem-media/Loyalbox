import Image from "next/image";
import Link from "next/link";
import { KATALOG, PRODUKT_FOTO, harFysiskSkilt } from "@/lib/constants";
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
      {/* FØRSTE KORT ER IKKE DOVENT. På en telefon er det det eneste over
          folden og dermed sidens LCP-element — og et LCP-element, der venter
          på dovenskab, forsinker præcis dét, målingen handler om. De to andre
          er dovne: de står til højre på en skærm og langt nede på en telefon. */}
      {/*
        KUN VARERNE MED EN STANDER.
        Sektionen står på /bestil under overskriften "Bestil din stander", og
        hele blokken handler om antal og mængderabat pr. stk. LoyalSum Komplet
        Online har ingen stander at tælle og ingen mængderabat at få — den
        ville stå som et fjerde kort, hvor både prisen og antalsvælgeren
        betød noget andet end på de tre andre. Den købes fra sin egen
        produktside, og kataloget (/produkter) viser begge familier.
      */}
      {KATALOG.filter(harFysiskSkilt).map((p, nr) => (
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
              {/* `fill` + `sizes`: kortet er en kolonne i et gitter, der går
                  fra ét til tre spor, så den viste bredde er ikke ét tal.
                  Uden `sizes` ville hele filen på 109 KB blive hentet til en
                  telefon — målt 2026-09-17 gjorde den dét, og LCP på netop
                  købssiden lå på 4,7 s. */}
              <Image
                src={PRODUKT_FOTO[p.slug]}
                alt={`${p.name} — reviewstander i brug`}
                fill
                priority={nr === 0}
                sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
                className="object-cover transition-transform duration-300 group-hover:scale-105"
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
            {/*
              H2 OG IKKE H3. Kortene er `/bestil`s primære indhold og står
              direkte under sidens H1 — der er ingen H2 imellem, så et h3
              sprang et niveau over. Målt 2026-09-17: siden gik h1 → h3.
              Udseendet ligger i klassen og ikke i elementet (`.panel`-reglen
              i globals.css rammer kun dashboardet), så intet skifter visuelt.
            */}
            <h2 className="font-bold tracking-tight">{p.name}</h2>
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
