import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  FOTO_FARVETEKST,
  KATALOG,
  PRODUKT_FOTO,
  PRODUKT_FOTO_TEKST,
  UPCOMING_MERCH,
} from "@/lib/constants";
import { ProductPrice } from "@/components/product-price";
import { PurchaseNotice } from "@/components/purchase-notice";
import {
  PlaceholderPanel,
  StanderPlaceholder,
  UPCOMING_ICONS,
} from "@/components/product-placeholder";

export const metadata = {
  title: "Standere og materialer til din forretning",
  description:
    "Bestil din LoyalSum-reviewstander med QR og NFC — med mængderabat fra 3 stk. Flere materialer til disken, døren og bordet er på vej.",
  alternates: { canonical: "/produkter" },
};

/* -------------------------------------------------------------------- page */

export default function ProductsPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        <div className="mb-12 text-center">
          <p className="text-sm font-semibold text-accent">Materialer</p>
          <h1 className="mt-1 text-3xl font-bold tracking-tight sm:text-4xl">
            Standere og materialer til din forretning
          </h1>
          <p className="mx-auto mt-3 max-w-xl text-muted">
            Det fysiske, der får kunderne til at scanne. Standeren kan bestilles
            nu — resten af materialerne til disken, døren og bordet er på vej.
          </p>
        </div>

        {/* ------------------------------------------------ kan bestilles nu */}
        <section aria-labelledby="kan-bestilles">
          <div className="mb-6 flex items-baseline justify-between gap-4">
            <h2 id="kan-bestilles" className="text-xl font-bold tracking-tight">
              Kan bestilles nu
            </h2>
            <p className="text-xs text-muted">
              Alle priser er ex moms · mængderabat fra 3 stk.
            </p>
          </div>

          <PurchaseNotice className="mb-6" />

          <div className="grid gap-6 md:grid-cols-3">
            {KATALOG.map((p) => (
              <Link
                key={p.slug}
                href={`/produkter/${p.slug}`}
                className="group box-shape flex flex-col overflow-hidden border border-border bg-card transition-shadow hover:shadow-[0_20px_40px_-24px_rgba(0,0,0,0.4)]"
              >
                {PRODUKT_FOTO[p.slug] ? (
                  <div className="relative aspect-[4/5] overflow-hidden">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={PRODUKT_FOTO[p.slug]}
                      alt={`${p.name} — reviewstander i brug`}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                    />
                    {/* SOLIDT mærke, ikke <Badge>: den er bg-accent/10
                        (næsten gennemsigtig) og forsvinder over et foto. Her
                        skal det kunne læses over et hvilket som helst billede. */}
                    {p.featured ? (
                      <span className="box-shape absolute left-3 top-3 bg-accent px-2.5 py-1 text-xs font-semibold text-accent-fg shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]">
                        Mest populær
                      </span>
                    ) : p.includesLoyalSum ? (
                      <span className="box-shape absolute left-3 top-3 bg-dark px-2.5 py-1 text-xs font-semibold text-white shadow-[0_4px_12px_-4px_rgba(0,0,0,0.5)]">
                        Komplet
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
                    ) : p.includesLoyalSum ? (
                      <div className="absolute left-3 top-3">
                        <Badge tone="neutral">Komplet</Badge>
                      </div>
                    ) : null}
                  </StanderPlaceholder>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h3 className="font-bold tracking-tight">{p.name}</h3>
                  <p className="mt-1 text-sm text-muted">{p.tagline}</p>
                  {/* Billedtekst. Alle tre kort viser den SAMME stander, så
                      fotoet kan ikke længere skille varerne ad — det gør de
                      to linjer her: hvad man vælger på skiltet (fælles), og
                      hvad QR-koden fører hen til (varens egen). */}
                  {PRODUKT_FOTO_TEKST[p.slug] ? (
                    <p className="mt-3 text-xs leading-relaxed text-muted">
                      {PRODUKT_FOTO_TEKST[p.slug]}
                    </p>
                  ) : null}
                  <p className="mt-2 text-xs leading-relaxed text-muted">
                    {FOTO_FARVETEKST}
                  </p>
                  {/* mt-auto: billedteksterne er ikke lige lange, og uden den
                      stod pris og "Se produkt" i tre forskellige højder på
                      tværs af de tre kort. */}
                  <div className="mt-auto pt-4">
                    <ProductPrice product={p} />
                  </div>
                  <span className="mt-4 text-sm font-medium text-accent">
                    Se produkt →
                  </span>
                </div>
              </Link>
            ))}
          </div>
        </section>

        {/* ------------------------------------------------------------ på vej */}
        <section aria-labelledby="paa-vej" className="mt-20">
          <div className="mb-6">
            <h2 id="paa-vej" className="text-xl font-bold tracking-tight">
              På vej
            </h2>
            <p className="mt-2 max-w-2xl text-sm text-muted">
              Vi er i gang med flere materialer, så kunderne møder dig flere
              steder end ved disken. De kan ikke bestilles endnu, og priserne er
              ikke fastlagt.
            </p>
          </div>

          <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {UPCOMING_MERCH.map((m) => (
              <li
                key={m.key}
                className="box-shape flex flex-col border border-dashed border-border bg-card"
              >
                <PlaceholderPanel
                  className="aspect-[4/3]"
                  icon={UPCOMING_ICONS[m.key]}
                >
                  <div className="absolute left-3 top-3">
                    <Badge tone="warning">På vej</Badge>
                  </div>
                </PlaceholderPanel>
                <div className="flex flex-1 flex-col p-5">
                  <p className="text-xs font-medium uppercase tracking-wide text-muted">
                    {m.placering}
                  </p>
                  <h3 className="mt-1 font-bold tracking-tight">{m.name}</h3>
                  <p className="mt-2 flex-1 text-sm text-muted">{m.tagline}</p>
                  <p className="mt-4 text-sm text-muted">Pris annonceres senere</p>
                </div>
              </li>
            ))}
          </ul>
        </section>

        <div className="mt-16 text-center">
          <ButtonLink href="/signup" size="lg">
            Kom i gang
          </ButtonLink>
          <p className="mt-3 text-sm text-muted">
            Du kan altid tilføje materialer senere.
          </p>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
