"use client";

import { useActionState } from "react";
import { createCompany, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function CreateCompany() {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createCompany,
    {},
  );

  return (
    <form action={action} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
      <Input name="name" placeholder="Firmanavn" required />
      <Input name="contact_email" type="email" placeholder="Kontaktmail" />
      <Button type="submit" disabled={pending}>
        {pending ? "Opretter…" : "Opret virksomhed"}
      </Button>
      {state.error ? (
        <p className="text-sm text-danger sm:col-span-3">{state.error}</p>
      ) : null}
    </form>
  );
}
