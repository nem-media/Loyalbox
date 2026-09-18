import { harFysiskSkilt, type Product } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Ensartet prisvisning på katalog-kort. Priser er ex moms. Standerprisen er
 * engangs pr. stander; abonnement og opsætning er faste (uafhængigt af antal).
 *
 * EN VARE UDEN SKILT HAR INGEN STANDERPRIS, og den må ikke stå som et nul.
 * MÅLT på /produkter, før grenen fandtes: LoyalSum Komplet Online stod med
 * "0 kr. pr. stander + 399 kr./md i abonnement" — og det store, fede tal, som
 * øjet går til først, var nullet. Ved siden af tre kort, hvor samme tal er
 * 499, læses det som "gratis", og den rigtige pris stod med småt nedenunder.
 *
 * DERFOR BYTTER DE TO LINJER PLADS frem for at den ene bare skjules:
 * månedsprisen bliver det store tal, og linjen under siger, at der ikke er
 * en engangspris. Rytmen er den samme — to linjer, tal foroven, forklaring
 * forneden — så kortene kan stadig sammenlignes side om side. Det var netop
 * dét, "Ingen abonnement" blev opfundet til på engangsvaren; her er behovet
 * det samme, bare spejlvendt.
 */
export function ProductPrice({
  product,
  size = "sm",
}: {
  product: Product;
  size?: "sm" | "lg";
}) {
  const amountClass = size === "lg" ? "text-4xl" : "text-2xl";

  if (!harFysiskSkilt(product)) {
    return (
      <div>
        <div className="flex items-baseline gap-1">
          <span className={`${amountClass} font-bold tracking-tight`}>
            {formatCurrency(product.monthlyPrice ?? 0)}
          </span>
          <span className="text-sm text-muted">/md i abonnement</span>
        </div>
        <p className="mt-1 text-sm text-muted">Ingen engangspris</p>
        {product.setupPrice ? (
          <p className="text-sm text-muted">
            + {formatCurrency(product.setupPrice)} i opsætning (engangs)
          </p>
        ) : null}
        <p className="mt-1 text-xs text-muted">ex moms</p>
      </div>
    );
  }

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
