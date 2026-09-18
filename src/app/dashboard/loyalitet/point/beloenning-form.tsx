"use client";

import { useActionState } from "react";
import { opretPointBeloenning } from "./actions";
import type { FormResult } from "@/app/dashboard/loyalitet/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { REWARD_TYPE_LABELS, type RewardType } from "@/lib/loyalty/constants";

/**
 * Tilføj en belønning.
 *
 * FLERE BELØNNINGER ER HELE FORSKELLEN på et pointprogram og et stempelkort:
 * kunden vælger selv, hvad saldoen skal bruges på. Derfor er formularen kort
 * og kan bruges igen med det samme — en butik opretter typisk tre-fire i træk,
 * første gang de sætter programmet op.
 *
 * FELTERNE ER USTYREDE MED `defaultValue` OG EN `key`, og det er et bevidst
 * valg frem for styrede felter:
 *
 *  - Ved en AFVISNING lægger serveren det indtastede tilbage i `udfyldt`, så
 *    butikken ikke skal skrive det hele igen (femte gang den lektie i dette
 *    projekt — se `formular-hukommelse.test.ts`).
 *  - Ved et JA skal felterne stå tomme, klar til den næste belønning. Første
 *    udkast ryddede dem ved at kalde `setState` inde i selve handlingen, og
 *    dét afviser React Compiler med rette: en tilstandsændring hører til i en
 *    hændelse, ikke i en gengivelse. `key` gentegner felterne i stedet.
 */
export function BeloenningForm({ programId }: { programId: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    opretPointBeloenning,
    {},
  );

  // Ny nøgle ved hvert svar → felterne tegnes forfra med det, serveren sendte
  // tilbage (tomt ved et ja, det indtastede ved en afvisning).
  const noegle = state.forsoeg ?? 0;
  const udfyldt = state.udfyldt ?? {};

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="program_id" value={programId} />

      <div className="grid gap-3 sm:grid-cols-[1fr_8rem]">
        <Field label="Belønning">
          <Input
            key={`navn-${noegle}`}
            name="name"
            required
            placeholder="Gratis kaffe"
            defaultValue={udfyldt.name ?? ""}
          />
        </Field>
        <Field label="Pris i point">
          <Input
            key={`pris-${noegle}`}
            name="points_cost"
            type="number"
            min="1"
            step="1"
            required
            placeholder="50"
            defaultValue={udfyldt.points_cost ?? ""}
          />
        </Field>
      </div>

      <Field label="Beskrivelse (valgfri)">
        <Input
          key={`beskrivelse-${noegle}`}
          name="description"
          placeholder="Enhver kaffe på menuen"
          defaultValue={udfyldt.description ?? ""}
        />
      </Field>

      <Field label="Type">
        <select
          key={`type-${noegle}`}
          name="type"
          defaultValue="free_product"
          className="box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {(Object.keys(REWARD_TYPE_LABELS) as RewardType[])
            .filter((t) => t !== "none")
            .map((t) => (
              <option key={t} value={t}>
                {REWARD_TYPE_LABELS[t]}
              </option>
            ))}
        </select>
      </Field>

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">
          Belønningen er tilføjet.
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Tilføjer…" : "Tilføj belønning"}
      </Button>
    </form>
  );
}
