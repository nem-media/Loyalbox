"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saetOffentligKundescore, type FormResult } from "./actions";

/**
 * Kontakten, der slår den offentlige kundescore til og fra.
 *
 * ÉN KNAP MED ÉN TILSTAND, ikke en switch, der skifter udseende før serveren
 * har svaret. Det her er et valg om, hvad der står offentligt om butikken —
 * og så skal knappen sige, hvad der SKER, ikke hvad der er sat.
 *
 * Ingen bekræftelse ved at slå TIL: det kan fortrydes med det samme, og en
 * dialog på et frivilligt tilvalg er i vejen. Ved at slå FRA er der heller
 * ingen — at fjerne noget offentligt er den forsigtige retning.
 */
export function OffentligKontakt({
  til,
  label,
}: {
  til: boolean;
  /** Overskriv knapteksten — nudgen siger "Vis min kundescore". */
  label?: string;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    saetOffentligKundescore,
    {},
  );

  return (
    <form action={action} className="flex flex-wrap items-center gap-3">
      <input type="hidden" name="til" value={til ? "0" : "1"} />
      <Button
        type="submit"
        size="sm"
        variant={til ? "outline" : "primary"}
        disabled={pending}
      >
        {pending
          ? "Gemmer…"
          : (label ?? (til ? "Slå visningen fra" : "Vis kundescoren offentligt"))}
      </Button>
      {state.error ? (
        <span className="text-sm text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}
