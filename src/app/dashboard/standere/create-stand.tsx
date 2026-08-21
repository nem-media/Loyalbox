"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStand, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Opretter en QR-adresse og en side — IKKE et fysisk skilt.
 *
 * Sondringen stod ingen steder, og kunderne troede rimeligt nok, at "Opret
 * stander" bestilte et skilt. Teksten siger det nu, og BestilStander lige
 * under formularen er vejen til det fysiske.
 */
export function CreateStand() {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createStand,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="flex flex-wrap gap-2">
      <Input
        name="name"
        placeholder="Navn på ny stander (fx “Butik – kassen”)"
        required
        className="min-w-56 flex-1"
      />
      <Button type="submit" disabled={pending}>
        {pending ? "Opretter…" : "Opret QR-adresse"}
      </Button>
      <p className="w-full text-xs text-muted">
        Du får en QR-adresse og en side til dine kunder. Det fysiske skilt
        bestiller du herunder.
      </p>
      {state.error ? (
        <p className="w-full text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
