"use client";

import { useActionState, useState } from "react";
import { giveStampAction, type StampActionState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Hurtigt giv-stempel-flow. Idempotent via en reference, der genereres på
 * klienten ved hver indsendelse — så dobbelt-klik ikke giver dobbelt stempel.
 * Viser en tydelig succesbesked med saldo og evt. udløst belønning.
 */
export function GiveStampForm({
  membershipId,
  maxPerTxn,
  showAmount,
}: {
  membershipId: string;
  maxPerTxn: number;
  showAmount: boolean;
}) {
  const [state, dispatch, pending] = useActionState<StampActionState, FormData>(
    giveStampAction,
    {},
  );
  const [stamps, setStamps] = useState("1");

  // Frisk idempotens-reference pr. indsendelse.
  function action(formData: FormData) {
    formData.set("reference", crypto.randomUUID());
    dispatch(formData);
  }

  return (
    <form action={action} className="mt-4 space-y-3">
      <input type="hidden" name="membership_id" value={membershipId} />

      <div className="flex flex-wrap items-end gap-3">
        <div className="w-24">
          <label className="mb-1.5 block text-xs font-medium text-muted">
            Antal
          </label>
          <Input
            type="number"
            name="stamps"
            min={1}
            max={maxPerTxn}
            value={stamps}
            onChange={(e) => setStamps(e.target.value)}
          />
        </div>
        {showAmount ? (
          <div className="w-32">
            <label className="mb-1.5 block text-xs font-medium text-muted">
              Købsbeløb (kr.)
            </label>
            <Input type="number" name="amount" min={0} />
          </div>
        ) : null}
        <Button type="submit" disabled={pending}>
          {pending ? "Giver…" : "Giv stempel"}
        </Button>
      </div>

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}

      {state.ok ? (
        <div className="box-shape border border-success/30 bg-success/10 p-3 text-sm">
          {state.alreadyProcessed ? (
            <p>Allerede registreret.</p>
          ) : (
            <p className="font-medium">
              Stempel tilføjet. Kunden har nu {state.have} ud af {state.required}{" "}
              stempler.
            </p>
          )}
          {state.rewardEarned ? (
            <p className="mt-1 font-semibold text-success">
              🎉 Kunden har optjent: {state.rewardName}
            </p>
          ) : null}
        </div>
      ) : null}
    </form>
  );
}
