"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";

/**
 * Åbner Stripes kundecenter.
 *
 * Derinde kan kunden selv skifte betalingskort, rette fakturamailen til
 * bogholderiet, hente kvitteringer og opsige. Alt sammen ting, vi ellers
 * skulle bygge — og fakturaerne derfra er gyldige bilag med moms.
 */
export function PortalButton() {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/portal", { method: "POST" });
      const data = await res.json();
      if (!res.ok || !data.url) {
        setError(data.error ?? "Kundecentret kunne ikke åbnes.");
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
      <Button type="button" variant="outline" onClick={open} disabled={pending}>
        {pending ? "Åbner…" : "Betaling og kvitteringer"}
      </Button>
      {error ? <p className="mt-2 text-sm text-danger">{error}</p> : null}
    </div>
  );
}
