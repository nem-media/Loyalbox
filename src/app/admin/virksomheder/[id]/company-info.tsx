"use client";

import { useActionState } from "react";
import { updateCompanyAdmin, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import type { Database } from "@/lib/types/database";

type Company = Database["public"]["Tables"]["companies"]["Row"];

export function CompanyInfo({ company }: { company: Company }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    updateCompanyAdmin,
    {},
  );

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="company_id" value={company.id} />
      <Field label="Firmanavn">
        <Input name="name" defaultValue={company.name} required />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Kontaktmail">
          <Input name="contact_email" type="email" defaultValue={company.contact_email ?? ""} />
        </Field>
        <Field label="Telefon">
          <Input name="phone" defaultValue={company.phone ?? ""} />
        </Field>
      </div>
      <Field label="Adresse">
        <Input name="address" defaultValue={company.address ?? ""} />
      </Field>
      <div className="flex items-center gap-3">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Gemmer…" : "Gem"}
        </Button>
        {state.ok ? <span className="text-sm text-success">Gemt!</span> : null}
        {state.error ? <span className="text-sm text-danger">{state.error}</span> : null}
      </div>
    </form>
  );
}
