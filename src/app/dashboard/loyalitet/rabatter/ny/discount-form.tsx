"use client";

import { useActionState, useState } from "react";
import { createDiscount, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Textarea, Field } from "@/components/ui/input";
import {
  DISCOUNT_TYPE_LABELS,
  type DiscountType,
} from "@/lib/loyalty/constants";

const selectClass =
  "box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent";

export function DiscountForm() {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createDiscount,
    {},
  );
  const [type, setType] = useState<DiscountType>("percent");

  const showValue = type === "percent" || type === "fixed_amount";

  return (
    <form action={action} className="max-w-lg space-y-5">
      <Field label="Navn på rabat">
        <Input name="name" placeholder="Fx Velkomstrabat" />
      </Field>
      <Field label="Type">
        <select
          name="type"
          className={selectClass}
          value={type}
          onChange={(e) => setType(e.target.value as DiscountType)}
        >
          {(Object.keys(DISCOUNT_TYPE_LABELS) as DiscountType[]).map((t) => (
            <option key={t} value={t}>
              {DISCOUNT_TYPE_LABELS[t]}
            </option>
          ))}
        </select>
      </Field>
      {showValue ? (
        <Field
          label={type === "percent" ? "Værdi (procent)" : "Værdi (kroner)"}
        >
          <Input type="number" name="value" min={0} />
        </Field>
      ) : (
        <input type="hidden" name="value" value="0" />
      )}
      <Field label="Beskrivelse (valgfri)">
        <Textarea name="description" />
      </Field>
      <div className="grid gap-5 sm:grid-cols-2">
        <Field label="Min. køb (kr., valgfri)">
          <Input type="number" name="min_purchase" min={0} />
        </Field>
        <Field label="Maks. pr. kunde (valgfri)">
          <Input type="number" name="per_customer_limit" min={1} />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="requires_approval" className="h-4 w-4 accent-[var(--accent)]" />
        Kræver ejer-godkendelse
      </label>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Opretter…" : "Opret rabat"}
      </Button>
    </form>
  );
}
