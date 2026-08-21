"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Knappen der bringer kunden tilbage til fuld adgang.
 *
 * De to veje ser ens ud for kunden og er vidt forskellige teknisk:
 *
 *   opdater_kort     abonnementet lever stadig hos Stripe og venter på en
 *                    betaling, der kan gennemføres. Kundecentret lader kunden
 *                    lægge et nyt kort ind, og Stripe prøver den åbne faktura
 *                    igen af sig selv. Der oprettes ikke noget nyt.
 *   nyt_abonnement   abonnementet er lukket og kan ikke vækkes. Der tegnes et
 *                    nyt — kun månedsprisen, for standeren er købt og betalt.
 *
 * Kunden skal ikke kende forskellen. Derfor står valget i abonnement.ts og
 * ikke her: knappen viser den samme sætning uanset hvad.
 */
export function GenoptagKnap({
  vej,
  slug,
}: {
  vej: "opdater_kort" | "nyt_abonnement";
  slug: string | null;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function betal() {
    setPending(true);
    setError(null);
    try {
      const res =
        vej === "opdater_kort"
          ? await fetch("/api/portal", { method: "POST" })
          : await fetch("/api/checkout", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ produkt: slug, genoptag: true }),
            });

      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Betalingen kunne ikke åbnes. Prøv igen.");
        setPending(false);
        return;
      }
      window.location.href = data.url;
    } catch {
      setError("Der opstod en fejl. Prøv igen, eller skriv til os.");
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={betal} disabled={pending}>
        {pending ? "Åbner…" : "Betal udestående nu"}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
