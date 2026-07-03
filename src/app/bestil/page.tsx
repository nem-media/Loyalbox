import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Pricing } from "@/components/pricing";
import { PRODUCTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Bestil din stander" };

export default async function OrderPage({
  searchParams,
}: {
  searchParams: Promise<{ produkt?: string }>;
}) {
  const { produkt } = await searchParams;
  const selected = PRODUCTS.find((p) => p.slug === produkt);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-6xl px-4 py-16">
        {selected ? (
          <Card className="mx-auto max-w-lg">
            <CardBody className="space-y-4">
              <Badge tone="accent">Valgt produkt</Badge>
              <h1 className="text-2xl font-bold tracking-tight">
                {selected.name}
              </h1>
              <p className="text-muted">{selected.tagline}</p>
              <p className="text-3xl font-semibold">
                {formatCurrency(selected.price)}
                <span className="text-sm font-normal text-muted">
                  {selected.interval === "month" ? " /md" : " engangs"}
                </span>
              </p>
              <ul className="space-y-1 text-sm text-muted">
                {selected.features.map((f) => (
                  <li key={f}>• {f}</li>
                ))}
              </ul>
              <div className="box-shape border border-accent/20 bg-accent/5 p-4 text-sm text-muted">
                Betaling med kort er på vej (Stripe). Opret din konto nu, så
                står din stander klar til bestilling.
              </div>
              <div className="flex gap-2">
                <ButtonLink href="/signup" className="flex-1">
                  Opret konto & bestil
                </ButtonLink>
                <ButtonLink href="/bestil" variant="outline">
                  Se alle
                </ButtonLink>
              </div>
            </CardBody>
          </Card>
        ) : (
          <>
            <div className="mb-10 text-center">
              <h1 className="text-3xl font-bold tracking-tight">
                Bestil din stander
              </h1>
              <p className="mt-2 text-muted">
                Vælg det produkt der passer til din forretning.
              </p>
            </div>
            <Pricing />
          </>
        )}
      </main>
      <SiteFooter />
    </>
  );
}
