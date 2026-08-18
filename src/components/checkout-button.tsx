"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Sender kunden til Stripe Checkout.
 *
 * Antallet sendes med, men prisen gør ikke: den beregnes serverside i
 * /api/checkout. Ville vi sende beløbet herfra, kunne enhver ændre det i
 * browseren og betale, hvad de havde lyst til.
 */
export function CheckoutButton({
  slug,
  qty,
  label = "Gå til betaling",
}: {
  slug: string;
  qty: number;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ produkt: slug, antal: qty }),
      });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Betalingen kunne ikke startes.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Der opstod en fejl. Prøv igen.");
      setPending(false);
    }
  }

  return (
    <div>
      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={start}
        disabled={pending}
      >
        {pending ? "Åbner betaling…" : label}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
