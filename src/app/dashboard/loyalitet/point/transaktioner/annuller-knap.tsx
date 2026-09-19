"use client";

import { useActionState, useState } from "react";
import { Besked } from "@/components/ui/besked";
import { annullerPointAction } from "../actions";
import type { FormResult } from "@/app/dashboard/loyalitet/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Annullering af en pointtransaktion.
 *
 * DER SLETTES IKKE — der laves en MODPOST, og begge linjer bliver stående.
 * Knappen folder derfor en begrundelse ud frem for at handle med det samme:
 * en annullering er ikke et fortryd-klik, det er en rettelse, nogen skal kunne
 * forstå om et halvt år.
 */
export function AnnullerKnap({
  txnId,
  memberId,
  beskrivelse,
}: {
  txnId: string;
  memberId: string;
  /** Fx "+25 point til Maria Jensen" — så det er tydeligt hvad der rulles tilbage. */
  beskrivelse: string;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    annullerPointAction,
    {},
  );
  const [aaben, setAaben] = useState(false);

  if (state.ok) {
    return <span className="text-sm text-success">Annulleret</span>;
  }

  if (!aaben) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setAaben(true)}
      >
        Annullér
      </Button>
    );
  }

  return (
    <form action={action} className="w-full max-w-sm space-y-2">
      <input type="hidden" name="txn_id" value={txnId} />
      <input type="hidden" name="member_id" value={memberId} />
      <p className="text-sm">
        Annullér <span className="font-medium">{beskrivelse}</span>? Der laves
        en modpost — begge linjer bliver stående i historikken.
      </p>
      <Input
        name="reason"
        placeholder="Hvorfor? Fx “tastefejl”"
        aria-label="Begrundelse"
      />
      {state.error ? (
        <Besked slags="fejl">{state.error}</Besked>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="danger" disabled={pending}>
          {pending ? "Annullerer…" : "Ja, annullér"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setAaben(false)}
        >
          Fortryd
        </Button>
      </div>
    </form>
  );
}
