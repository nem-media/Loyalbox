"use client";

import { useActionState } from "react";
import { enrollMember, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";

const selectClass =
  "box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function EnrollForm({
  programs,
}: {
  programs: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    enrollMember,
    {},
  );

  return (
    <form action={action} className="max-w-lg space-y-5">
      <Field label="Navn">
        <Input name="name" placeholder="Kundens navn" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="E-mail">
          <Input type="email" name="email" />
        </Field>
        <Field label="Telefon">
          <Input name="phone" />
        </Field>
      </div>
      <Field label="Stempelkort">
        <select name="program_id" className={selectClass} defaultValue="">
          <option value="" disabled>
            Vælg stempelkort
          </option>
          {programs.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
      </Field>

      <div className="box-shape border border-border p-4 space-y-2">
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent_terms" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>Kunden accepterer vilkårene for stempelkortet (påkrævet).</span>
        </label>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="consent_marketing" className="mt-0.5 h-4 w-4 accent-[var(--accent)]" />
          <span>Kunden vil gerne modtage tilbud og nyheder (valgfrit).</span>
        </label>
      </div>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Tilmelder…" : "Tilmeld kunde"}
      </Button>
    </form>
  );
}
