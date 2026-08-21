"use client";

import { useActionState, useState } from "react";
import { bestilSletning, annullerSletning } from "./actions";
import type { FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

/**
 * Formularen der bestiller en sletning.
 *
 * Knappen er slået fra, indtil navnet er skrevet rigtigt. Det er ikke for at
 * være besværlig: det er den ene spærre, der virker mod det klik, man ikke
 * mente — og en knap, man ikke kan trykke på, er tydeligere end en advarsel,
 * man kan læse hen over.
 *
 * Sammenligningen her er kun for knappens skyld. Den rigtige kontrol sker på
 * serveren i navnPasser(); en knap i en browser er ikke sikkerhed.
 */
export function SletForm({ firmanavn }: { firmanavn: string }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    bestilSletning,
    {},
  );
  const [skrevet, setSkrevet] = useState("");

  const passer =
    skrevet.trim().toLocaleLowerCase("da-DK") ===
    firmanavn.trim().toLocaleLowerCase("da-DK");

  if (state.ok) {
    return (
      <div className="box-shape border border-accent/40 bg-accent/5 p-5">
        <p className="font-medium">Tjek din mail</p>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          {state.message}
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field
        label="Skriv virksomhedens navn for at fortsætte"
        hint={`Præcis som det står: ${firmanavn}`}
      >
        <Input
          name="firmanavn"
          value={skrevet}
          onChange={(e) => setSkrevet(e.target.value)}
          autoComplete="off"
          required
        />
      </Field>

      {state.error ? (
        <p className="text-sm text-danger">{state.error}</p>
      ) : null}

      <Button type="submit" variant="danger" disabled={!passer || pending}>
        {pending ? "Sender bekræftelse…" : "Bestil sletning af alt"}
      </Button>
    </form>
  );
}

/**
 * Fortryd-knappen. Ingen spærrer, ingen bekræftelse.
 *
 * En fejlagtig annullering koster et par klik. En fejlagtig sletning koster
 * butikkens kundeklub. De to skal ikke være lige svære.
 */
export function AnnullerKnap() {
  // Handlingen tager ingen felter — der er ingenting at udfylde for at
  // fortryde. Den pakkes derfor ind, frem for at bære to ubrugte parametre
  // rundt bare for at passe til formularens facon.
  const [state, action, pending] = useActionState<FormResult, FormData>(
    () => annullerSletning(),
    {},
  );

  return (
    <form action={action}>
      <Button type="submit" disabled={pending}>
        {pending ? "Annullerer…" : "Fortryd sletningen"}
      </Button>
      {state.error ? (
        <p className="mt-2 text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
