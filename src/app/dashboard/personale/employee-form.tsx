"use client";

import { useActionState, useEffect, useRef } from "react";
import { addEmployee } from "./actions";
import type { FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PERMISSION_FIELDS } from "@/lib/employees";

/**
 * Tilføj en medarbejder.
 *
 * Rettighederne står som afkrydsningsfelter med en forklaring under, fordi en
 * butiksejer ikke nødvendigvis ved, hvad "indløse" dækker over. Stemple og
 * indløse er slået til fra start — det er det, personalet skal i hverdagen —
 * mens rabatter kræver et bevidst valg.
 */
export function EmployeeForm() {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    addEmployee,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Navn</span>
          <Input
            name="name"
            placeholder="Fx Anne"
            required
            className="mt-1.5 w-full"
          />
        </label>
        <label className="block">
          <span className="text-sm font-medium">E-mail</span>
          <Input
            name="email"
            type="email"
            placeholder="anne@eksempel.dk"
            required
            className="mt-1.5 w-full"
          />
          <span className="mt-1 block text-xs text-muted">
            De logger ind med denne adresse.
          </span>
        </label>
      </div>

      <fieldset>
        <legend className="text-sm font-medium">Hvad må de?</legend>
        <div className="mt-2 space-y-2">
          {PERMISSION_FIELDS.map((f) => (
            <label key={f.name} className="flex gap-2.5">
              <input
                type="checkbox"
                name={f.name}
                defaultChecked={f.name !== "can_discount"}
                className="mt-0.5 h-4 w-4 accent-[color:var(--color-accent,#26616e)]"
              />
              <span className="text-sm">
                {f.label}
                <span className="block text-xs text-muted">{f.help}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Tilføjer…" : "Tilføj medarbejder"}
        </Button>
        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.ok && state.message ? (
          <p className="text-sm text-accent">{state.message}</p>
        ) : null}
      </div>
    </form>
  );
}
