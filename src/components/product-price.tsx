import type { Product } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Ensartet prisvisning. Alle priser i shoppen er ex moms. Komplet-pakker vises
 * som månedspris + engangs opsætning.
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
        <span className="text-sm text-muted">
          {product.interval === "month" ? "/md ex moms" : "ex moms"}
        </span>
      </div>
      {product.setupPrice ? (
        <p className="mt-1 text-sm text-muted">
          + {formatCurrency(product.setupPrice)} i opsætning (ex moms)
        </p>
      ) : null}
    </div>
  );
}
