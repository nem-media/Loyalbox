"use client";

import { useActionState } from "react";
import { stampByToken, type StampByTokenState } from "../actions";
import { Button } from "@/components/ui/button";

/**
 * Personale-panel på kundens kort (scan-til-stempel). Vises kun når den
 * besøgende er logget ind som personale for kortets virksomhed — kunder og
 * anonyme ser aldrig denne knap. Selve rettighedstjekket sker server-side i
 * `stampByToken`; dette er blot UI'et.
 */
export function StaffStampPanel({
  token,
  membershipId,
}: {
  token: string;
  membershipId: string;
}) {
  const [state, action, pending] = useActionState<StampByTokenState, FormData>(
    stampByToken,
    {},
  );

  return (
    <form
      action={action}
      className="box-shape border border-accent/40 bg-accent/5 p-3"
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="membership_id" value={membershipId} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Personale
        </span>
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Giver…" : "Giv stempel"}
        </Button>
      </div>
      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-2 text-sm font-medium text-success">
          {/*
            KVITTERINGEN TIL PERSONALET TÆLLER OGSÅ KUN TIL TÆRSKLEN — den sagde
            før "11/10 stempler". Er der stempler ud over, siges det som en
            tilføjelse, så den, der står med kunden, kan nå at sige det højt:
            de bortfalder ved indløsningen, hvis butikken ikke beholder dem.
          */}
          {state.rewardEarned
            ? `🎉 Belønning optjent: ${state.rewardName}. Nu ${Math.min(state.have ?? 0, state.required ?? 0)}/${state.required}.`
            : `Stempel givet · ${Math.min(state.have ?? 0, state.required ?? 0)}/${state.required} stempler.`}
          {(state.have ?? 0) > (state.required ?? 0)
            ? ` (+${(state.have ?? 0) - (state.required ?? 0)} ud over kortet — indløs belønningen først.)`
            : ""}
        </p>
      ) : null}
    </form>
  );
}
