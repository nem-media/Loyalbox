"use client";

import { useActionState } from "react";
import { redeemRewardByToken, type RedeemByTokenState } from "../actions";
import { Button } from "@/components/ui/button";

/**
 * Personale-panel til at indløse en optjent belønning direkte fra kundens kort.
 * Vises kun når den besøgende er logget ind som personale med `canRedeem` for
 * kortets virksomhed OG kunden har en tilgængelig belønning. Rettigheds- og
 * ejerskabstjek sker server-side i `redeemRewardByToken`; dette er blot UI'et.
 */
export function StaffRedeemPanel({
  token,
  customerRewardId,
  rewardName,
}: {
  token: string;
  customerRewardId: string;
  rewardName: string;
}) {
  const [state, action, pending] = useActionState<RedeemByTokenState, FormData>(
    redeemRewardByToken,
    {},
  );

  return (
    <form
      action={action}
      className="box-shape border border-secondary/40 bg-secondary/10 p-3"
    >
      <input type="hidden" name="token" value={token} />
      <input type="hidden" name="customer_reward_id" value={customerRewardId} />
      <div className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wide text-muted">
          Indløs belønning
        </span>
        <Button type="submit" size="sm" variant="secondary" disabled={pending}>
          {pending ? "Indløser…" : `Indløs: ${rewardName}`}
        </Button>
      </div>
      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : null}
      {state.ok ? (
        <p className="mt-2 text-sm font-medium text-success">
          ✓ Belønning indløst. Kortet er nulstillet efter programmets regler.
        </p>
      ) : null}
    </form>
  );
}
