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
      {/* SAMME TRE FELTER SOM I KUNDENS EGEN PROFIL (0029). Stod her kun
          vejnavnet, ville admin gemme en halv adresse — og en halv adresse
          forudfylder checkouten forkert, fordi `harKompletAdresse()` kræver
          alle tre. Ordrens egen `leveringsadresse` vises længere nede og er
          fortsat dét, der pakkes efter. */}
      <Field label="Vejnavn og nummer">
        <Input name="address" defaultValue={company.address ?? ""} />
      </Field>
      <div className="grid gap-4 sm:grid-cols-[8rem_1fr]">
        <Field label="Postnummer">
          <Input
            name="postnummer"
            defaultValue={company.postnummer ?? ""}
            inputMode="numeric"
          />
        </Field>
        <Field label="By">
          <Input name="by" defaultValue={company.by ?? ""} />
        </Field>
      </div>
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
