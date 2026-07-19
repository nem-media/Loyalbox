"use client";

import { useActionState } from "react";
import { selfEnroll, type EnrollState } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

export function SelfEnrollForm({ slug }: { slug: string }) {
  const [state, action, pending] = useActionState<EnrollState, FormData>(
    selfEnroll,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="slug" value={slug} />
      <Field label="Navn">
        <Input name="name" placeholder="Dit navn" />
      </Field>
      <Field label="E-mail">
        <Input type="email" name="email" placeholder="din@email.dk" />
      </Field>
      <Field label="Telefon (valgfri)">
        <Input name="phone" />
      </Field>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent_terms" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>Jeg accepterer vilkårene for stempelkortet.</span>
      </label>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="consent_marketing" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
        <span>Send mig gerne tilbud og nyheder (valgfrit).</span>
      </label>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Opretter…" : "Opret mit stempelkort"}
      </Button>
    </form>
  );
}
