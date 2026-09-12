import type { Product } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Ensartet prisvisning på katalog-kort. Priser er ex moms. Standerprisen er
 * engangs pr. stander; abonnement og opsætning er faste (uafhængigt af antal).
 */
export function ProductPrice({
  product,
  size = "sm",
}: {
  product: Product;
  size?: "sm" | "lg";
}) {
  const amountClass = size === "lg" ? "text-4xl" : "text-2xl";
  return (
    <div>
      <div className="flex items-baseline gap-1">
        <span className={`${amountClass} font-bold tracking-tight`}>
          {formatCurrency(product.price)}
        </span>
        <span className="text-sm text-muted">pr. stander</span>
      </div>
      {product.monthlyPrice ? (
        <p className="mt-1 text-sm text-muted">
          + {formatCurrency(product.monthlyPrice)}/md i abonnement
        </p>
      ) : (
        /*
          LINJEN STÅR ALTID — også på varen uden abonnement.
          Kortene ligger side om side, og uden den sad engangsvarens pris én
          linje lavere end de to andres, så beløbene ikke kunne sammenlignes
          på tværs. Pladsholderen er ikke tom: "Ingen abonnement" er dét, der
          ER forskellen, og en usynlig afstandsklods ville sige det samme med
          ingenting.
        */
        <p className="mt-1 text-sm text-muted">Ingen abonnement</p>
      )}
      {product.setupPrice ? (
        <p className="text-sm text-muted">
          + {formatCurrency(product.setupPrice)} i opsætning (engangs)
        </p>
      ) : null}
      <p className="mt-1 text-xs text-muted">ex moms</p>
    </div>
  );
}
