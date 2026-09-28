"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { laesBetalingssvar } from "@/lib/betalingssvar";

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
 * Kunden skal ikke kende den TEKNISKE forskel. Valget står derfor i
 * abonnement.ts og ikke her. Men ordet på knappen skal passe: "Betal
 * udestående nu" er sandt, når en faktura venter, og usandt for et abonnement,
 * der er opsagt — dér er der intet udestående, kun et abonnement at genoptage.
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

      const svar = await laesBetalingssvar(res);
      if (!svar.url) {
        setError(svar.fejl!);
        setPending(false);
        return;
      }
      window.location.href = svar.url;
    } catch {
      setError("Der opstod en fejl. Prøv igen, eller skriv til os.");
      setPending(false);
    }
  }

  return (
    <div>
      <Button type="button" onClick={betal} disabled={pending}>
        {pending
          ? "Åbner…"
          : vej === "opdater_kort"
            ? "Betal udestående nu"
            : "Genoptag abonnementet"}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
