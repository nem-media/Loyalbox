"use client";

import Link from "next/link";
import { useId, useState } from "react";
import { Button } from "@/components/ui/button";
import { TERMS_VERSION } from "@/lib/constants";

/**
 * Sender kunden til Stripe Checkout.
 *
 * Antallet sendes med, men prisen gør ikke: den beregnes serverside i
 * /api/checkout. Ville vi sende beløbet herfra, kunne enhver ændre det i
 * browseren og betale, hvad de havde lyst til.
 *
 * ACCEPTEN ER ET AFKRYDSNINGSFELT og ikke en sætning under knappen. Før stod
 * der bare "når du køber, indgås samtidig…", som er let at læse hen over — og
 * der blev ikke gemt noget bevis for, at betingelserne blev accepteret, kun
 * for databehandleraftalen. Nu kræver ruten et aktivt ja, og accepten gemmes
 * med sin version. Feltet var desuden skjult for varer uden databehandler-
 * aftale, så en fremtidig vare uden dataindsamling ville slet ikke vise
 * betingelserne; derfor står de to ting nu hver for sig.
 */
export function CheckoutButton({
  slug,
  qty,
  kraeverDpa = true,
  label = "Gå til betaling",
}: {
  slug: string;
  qty: number;
  /** Indgås databehandleraftalen også ved dette køb? */
  kraeverDpa?: boolean;
  label?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepteret, setAccepteret] = useState(false);
  const feltId = useId();

  async function start() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          produkt: slug,
          antal: qty,
          accepterVilkaar: accepteret,
        }),
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
      <div className="mb-3 flex items-start gap-2.5">
        <input
          id={feltId}
          type="checkbox"
          checked={accepteret}
          onChange={(e) => setAccepteret(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-accent"
        />
        <label htmlFor={feltId} className="text-sm leading-relaxed">
          Jeg accepterer{" "}
          <Link
            href="/handelsbetingelser"
            className="font-medium text-accent hover:underline"
          >
            handelsbetingelserne
          </Link>{" "}
          (version {TERMS_VERSION})
          {kraeverDpa ? (
            <>
              {" "}
              og{" "}
              <Link
                href="/databehandleraftale"
                className="font-medium text-accent hover:underline"
              >
                databehandleraftalen
              </Link>
            </>
          ) : null}
          , og at jeg køber som virksomhed.
        </label>
      </div>

      <Button
        type="button"
        size="lg"
        className="w-full"
        onClick={start}
        disabled={pending || !accepteret}
      >
        {pending ? "Åbner betaling…" : label}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
