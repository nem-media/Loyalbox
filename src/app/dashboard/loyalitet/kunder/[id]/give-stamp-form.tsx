"use client";

import { useActionState, useState } from "react";
import { giveStampAction, type StampActionState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Hurtigt giv-stempel-flow. Viser saldo og evt. udløst belønning.
 *
 * REFERENCEN DÆKKER EN GENSENDT INDSENDELSE — IKKE TO KLIK. Her stod, at den
 * gjorde, "så dobbelt-klik ikke giver dobbelt stempel", og det er ikke sandt:
 * **målt i brugerfladen 2026-09-16 gav to klik på en kunde med 7 af 10 ni
 * stempler.** Nøglen laves ved hver indsendelse, så to klik er to forskellige
 * handlinger for `loyalty_txn_ref_idx` — og sådan SKAL det være: personalet
 * kan have brug for at stemple to gange i træk.
 *
 * Det, nøglen faktisk beskytter mod, er dét, personalepanelet på
 * `/kort/[token]` beskriver præcist: en POST, browseren sender igen efter en
 * netværkshikke, og en genindlæsning med formulardata — begge bærer SAMME
 * krop og dermed samme nøgle. Knappen er spærret, mens svaret er undervejs,
 * og dét dækker klikket, der kommer, fordi der ikke skete noget endnu.
 *
 * En påstand om idempotens, der ikke passer, er værre end ingen: den næste,
 * der læser den, holder op med at tænke over dobbeltindsendelse.
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
