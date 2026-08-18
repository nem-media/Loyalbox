"use client";

import { useRef } from "react";
import { setCompanyProduct } from "../../actions";
import { PRODUCTS } from "@/lib/constants";

/**
 * Hvilket produkt virksomheden har købt.
 *
 * Adskilt fra planvælgeren med vilje: `plan` styrer review-funktionerne, mens
 * produktet afgør, om stempelkortet er låst op. Begge abonnementsvarer er
 * niveau `pro` — det er produktet, der skiller Reviewstander Pro fra LoyalSum
 * Komplet. Sælges Komplet manuelt, er det her, kunden får adgang.
 */
export function ProductSelect({
  companyId,
  productSlug,
}: {
  companyId: string;
  productSlug: string | null;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setCompanyProduct}>
      <input type="hidden" name="company_id" value={companyId} />
      <select
        name="product_slug"
        defaultValue={productSlug ?? ""}
        onChange={() => formRef.current?.requestSubmit()}
        className="box-shape h-9 w-full border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        <option value="">Intet produkt registreret</option>
        {PRODUCTS.map((p) => (
          <option key={p.slug} value={p.slug}>
            {p.name}
            {p.includesLoyalSum ? " (inkl. stempelkort)" : ""}
          </option>
        ))}
      </select>
    </form>
  );
}
