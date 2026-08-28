"use client";

import { useActionState, useId, useState } from "react";
import {
  skrivMigOp,
  type VentelisteResultat,
} from "@/app/venteliste/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { interesseValg, VED_IKKE } from "@/lib/venteliste";
import { COMPANY } from "@/lib/constants";

/**
 * "Skriv mig op, når salget åbner."
 *
 * FOLDET SAMMEN TIL AT BEGYNDE MED, og det er ikke pynt: beskeden om at man
 * ikke kan købe endnu står SYV steder — midt i produktsider, i bestillingen
 * og i dashboardet. En altid udfoldet formular alle de steder ville flytte
 * fokus fra det, siden handler om.
 *
 * Der gemmes intet hos os; tilmeldingen sendes som en mail. Se
 * src/lib/venteliste.ts for hvorfor.
 */
export function VentelisteForm() {
  const [aaben, setAaben] = useState(false);
  const [state, action, pending] = useActionState<VentelisteResultat, FormData>(
    skrivMigOp,
    {},
  );

  const navnId = useId();
  const mailId = useId();
  const tlfId = useId();
  const valgId = useId();

  if (state.ok) {
    return (
      <p className="mt-3 text-sm font-medium text-accent">
        Tak — vi skriver til dig, så snart du kan købe.
      </p>
    );
  }

  if (!aaben) {
    return (
      <button
        type="button"
        onClick={() => setAaben(true)}
        className="mt-3 text-sm font-medium text-accent hover:underline"
      >
        Skriv mig op, når salget åbner →
      </button>
    );
  }

  return (
    <form action={action} className="mt-4 space-y-3">
      {/* HONNINGKRUKKE. Skjult for mennesker, udfyldes af robotter, der
          udfylder alt. `aria-hidden` og tabIndex holder den ude af både
          skærmlæsere og tastaturet, så den kun rammer det, den skal. */}
      <div aria-hidden="true" className="hidden">
        <label htmlFor={`${navnId}-hp`}>Din hjemmeside</label>
        <input
          id={`${navnId}-hp`}
          name="hjemmeside"
          tabIndex={-1}
          autoComplete="off"
        />
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Navn" fejl={state.fejl?.navn}>
          <Input id={navnId} name="navn" required autoComplete="name" />
        </Field>
        <Field label="E-mail" fejl={state.fejl?.email}>
          <Input
            id={mailId}
            name="email"
            type="email"
            required
            autoComplete="email"
          />
        </Field>
      </div>

      <Field
        label="Telefon (valgfrit)"
        fejl={state.fejl?.telefon}
        hint="Kun hvis du hellere vil ringes op."
      >
        <Input id={tlfId} name="telefon" autoComplete="tel" />
      </Field>

      <div>
        <label htmlFor={valgId} className="etiket">
          Hvad er du interesseret i?
        </label>
        <select
          id={valgId}
          name="interesse"
          defaultValue={VED_IKKE}
          className="box-shape mt-1 h-11 w-full border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          {interesseValg().map((v) => (
            <option key={v.vaerdi} value={v.vaerdi}>
              {v.navn}
            </option>
          ))}
        </select>
        {state.fejl?.interesse ? (
          <p className="mt-1 text-xs text-danger">{state.fejl.interesse}</p>
        ) : null}
      </div>

      {state.fejlbesked ? (
        <p className="text-sm text-danger">{state.fejlbesked}</p>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sender…" : "Skriv mig op"}
        </Button>
        <button
          type="button"
          onClick={() => setAaben(false)}
          className="text-sm text-muted hover:underline"
        >
          Fortryd
        </button>
      </div>

      {/* Oplysningspligten skal opfyldes DÉR, hvor der indsamles — ikke kun i
          en politik, ingen åbner. Kort, og med link til resten. */}
      <p className="text-xs leading-relaxed text-muted">
        Vi bruger kun dine oplysninger til at kontakte dig om åbningen, og de
        gemmes ikke i systemet — de står i vores mailboks hos{" "}
        {COMPANY.legalName}. Se{" "}
        <a href="/privatliv" className="font-medium text-accent">
          privatlivspolitikken
        </a>
        .
      </p>
    </form>
  );
}
