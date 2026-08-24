"use client";

import { useActionState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createStand, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/**
 * Opretter en QR-adresse og en side — IKKE et fysisk skilt.
 *
 * Sondringen stod ingen steder, og kunderne troede rimeligt nok, at "Opret
 * stander" bestilte et skilt. Teksten siger det nu, og bestillingen ligger
 * inde på selve standeren, hvor QR-adressen er.
 */
export function CreateStand() {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    createStand,
    {},
  );
  const router = useRouter();

  /**
   * Den nye stander åbnes med det samme.
   *
   * En nyoprettet stander er ikke færdig: den har hverken destinationslink
   * eller et fysisk skilt. Før landede kunden tilbage på listen med et navn,
   * der så færdigt ud, og skulle selv gætte, at man kunne klikke sig ind og
   * gøre resten. Nu står de dér, hvor arbejdet fortsætter.
   */
  useEffect(() => {
    if (state.ok && state.gaaTil) router.push(state.gaaTil);
  }, [state.ok, state.gaaTil, router]);

  return (
    <form action={action} className="flex flex-wrap gap-2">
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
        Du får en QR-adresse og en side til dine kunder. Bagefter åbner vi den,
        så du kan sætte links på og bestille det fysiske skilt.
      </p>
      {state.error ? (
        <p className="w-full text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
