import { PRODUCTS } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";

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

export function Pricing() {
  return (
    <div className="grid gap-6 md:grid-cols-3">
      {PRODUCTS.map((p) => (
        <Card
          key={p.slug}
          className={
            p.featured
              ? "relative border-accent shadow-sm ring-1 ring-accent"
              : "relative"
          }
        >
          {p.featured ? (
            <div className="absolute -top-3 left-5">
              <Badge tone="accent">Mest populær</Badge>
            </div>
          ) : null}
          <div className="flex h-full flex-col p-6">
            <h3 className="text-lg font-semibold tracking-tight">{p.name}</h3>
            <p className="mt-1 text-sm text-muted">{p.tagline}</p>
            <div className="mt-4 flex items-baseline gap-1">
              <span className="text-3xl font-semibold tracking-tight">
                {formatCurrency(p.price)}
              </span>
              <span className="text-sm text-muted">
                {p.interval === "month" ? "/md" : "engangs"}
              </span>
            </div>
            <ul className="mt-6 space-y-2 text-sm">
              {p.features.map((f) => (
                <li key={f} className="flex gap-2">
                  <CheckIcon />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
            <div className="mt-6 pt-2">
              <ButtonLink
                href={`/bestil?produkt=${p.slug}`}
                variant={p.featured ? "primary" : "outline"}
                className="w-full"
              >
                Vælg {p.name.replace("ReviewStand ", "")}
              </ButtonLink>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}
