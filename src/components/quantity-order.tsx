"use client";

import { useState } from "react";
import Link from "next/link";
import {
  MAX_QTY,
  VOLUME_DISCOUNTS,
  priceFor,
  type Product,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Buy-box med antal-vælger (1–30) og live mængderabat. Kun standerprisen ganges
 * med antal; abonnement og opsætning er faste — uafhængigt af antal.
 * Bruges på produktsiden (mode="order" → /bestil) og bestil-siden
 * (mode="checkout" → /signup). Product er et rent objekt (server → client OK).
 */
export function QuantityOrder({
  product,
  initialQty = 1,
  mode = "order",
  ctaLabel,
}: {
  product: Product;
  initialQty?: number;
  mode?: "order" | "checkout";
  ctaLabel?: string;
}) {
  const clamp = (n: number) => Math.max(1, Math.min(MAX_QTY, Math.floor(n) || 1));
  const [qty, setQty] = useState(clamp(initialQty));
  const p = priceFor(product, qty);

  const href =
    mode === "order"
      ? `/bestil?produkt=${product.slug}&antal=${qty}`
      : "/signup";
  const label =
    ctaLabel ?? (mode === "order" ? "Bestil" : "Opret konto & bestil");
  const tiers = VOLUME_DISCOUNTS.filter((v) => v.discountPct > 0);

  return (
    <div className="box-shape border border-border bg-card p-5">
      {/* Antal */}
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-medium">Antal standere</p>
          <p className="text-xs text-muted">Op til {MAX_QTY} stk.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Færre"
            onClick={() => setQty((q) => clamp(q - 1))}
            disabled={qty <= 1}
            className="btn-shape grid h-10 w-10 place-items-center border border-border text-lg font-bold transition-colors hover:bg-muted-bg disabled:opacity-40"
          >
            −
          </button>
          <input
            type="number"
            min={1}
            max={MAX_QTY}
            value={qty}
            onChange={(e) => setQty(clamp(Number(e.target.value)))}
            className="box-shape h-10 w-16 border border-border bg-background text-center text-base font-semibold [appearance:textfield] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent [&::-webkit-inner-spin-button]:appearance-none"
            aria-label="Antal standere"
          />
          <button
            type="button"
            aria-label="Flere"
            onClick={() => setQty((q) => clamp(q + 1))}
            disabled={qty >= MAX_QTY}
            className="btn-shape grid h-10 w-10 place-items-center border border-border text-lg font-bold transition-colors hover:bg-muted-bg disabled:opacity-40"
          >
            +
          </button>
        </div>
      </div>

      {/* Pris */}
      <div className="mt-4 space-y-1.5 border-t border-border pt-4 text-sm">
        <div className="flex items-baseline justify-between">
          <span className="text-muted">Pris pr. stander</span>
          <span className="font-medium">
            {p.discountPct > 0 ? (
              <s className="mr-2 text-muted">{formatCurrency(p.standUnitBase)}</s>
            ) : null}
            {formatCurrency(p.standUnit)}
          </span>
        </div>
        {p.discountPct > 0 ? (
          <div className="flex items-baseline justify-between text-accent">
            <span>Mængderabat ({qty} stk.)</span>
            <span>−{p.discountPct}%</span>
          </div>
        ) : null}
        <div className="flex items-baseline justify-between">
          <span className="text-muted">Standere ({qty} stk.)</span>
          <span className="font-medium">{formatCurrency(p.standTotal)}</span>
        </div>
        {p.setup > 0 ? (
          <div className="flex items-baseline justify-between">
            <span className="text-muted">Opsætning (engangs)</span>
            <span className="font-medium">{formatCurrency(p.setup)}</span>
          </div>
        ) : null}

        {/* Samlet engangsbeløb */}
        <div className="flex items-baseline justify-between border-t border-border pt-2">
          <span className="font-medium">I alt i dag</span>
          <span className="text-2xl font-bold tracking-tight">
            {formatCurrency(p.oneTimeTotal)}
          </span>
        </div>
        {p.monthly > 0 ? (
          <div className="flex items-baseline justify-between">
            <span className="text-muted">
              + abonnement{" "}
              <span className="text-xs">(fast, uanset antal)</span>
            </span>
            <span className="font-semibold">
              {formatCurrency(p.monthly)}
              <span className="text-xs font-normal text-muted">/md</span>
            </span>
          </div>
        ) : null}
        <p className="text-right text-xs text-muted">Alle priser ex moms</p>
      </div>

      {/* Mængderabat-trin */}
      {tiers.length > 0 ? (
        <p className="mt-3 text-xs text-muted">
          Køb flere, spar mere:{" "}
          {tiers.map((v) => `${v.minQty}+ stk. − ${v.discountPct}%`).join(" · ")}
        </p>
      ) : null}

      {/* CTA */}
      <Link
        href={href}
        className="btn-shape mt-4 flex h-12 w-full items-center justify-center gap-2 bg-accent px-7 text-base font-medium text-accent-fg transition-colors hover:bg-accent-hover"
      >
        {label}
        {qty > 1 ? ` · ${qty} stk.` : ""}
      </Link>
    </div>
  );
}
