"use client";

import { useActionState } from "react";
import { claimCard, type ClaimCardState } from "../actions";
import { Button } from "@/components/ui/button";

/**
 * "Gem kortet på min konto" — vises kun til en indlogget kunde, hvis kortet
 * endnu ikke er knyttet til en konto. Selve autorisationen ligger server-side i
 * `claimCard`; her er kun knappen.
 */
export function SaveCardPanel({ token }: { token: string }) {
  const [state, action, pending] = useActionState<ClaimCardState, FormData>(
    claimCard,
    {},
  );

  if (state.ok) {
    return (
      <div className="box-shape border border-success/30 bg-success/10 p-4 text-center text-sm font-medium text-success">
        Kortet er gemt på din konto. Du finder det nu under &laquo;Mine
        stempelkort&raquo;.
      </div>
    );
  }

  return (
    <form
      action={action}
      className="box-shape border border-border bg-card p-4 text-center"
    >
      <input type="hidden" name="token" value={token} />
      <p className="text-sm font-medium">Gem kortet på din konto</p>
      <p className="mt-1 text-xs text-muted">
        Så kan du altid finde det igen — også hvis du skifter telefon.
      </p>
      <Button type="submit" size="sm" className="mt-3" disabled={pending}>
        {pending ? "Gemmer…" : "Gem på min konto"}
      </Button>
      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
