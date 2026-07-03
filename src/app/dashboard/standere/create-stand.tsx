"use client";

import { useActionState, useEffect, useRef } from "react";
import { createStand, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

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
        {pending ? "Opretter…" : "Opret stander"}
      </Button>
      {state.error ? (
        <p className="w-full text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
