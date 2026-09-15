"use client";

import { useActionState, useState } from "react";
import { findMitKort, type FindKortState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { FIND_KORT_KVITTERING } from "@/lib/loyalty/kort-link";

/**
 * "Find mit kort".
 *
 * FELTET ER STYRET af samme grund som i tilmeldingen: React nulstiller
 * formularen, når en server action svarer, og en kunde, der har skrevet
 * forkert, skal ikke taste sin adresse forfra på en telefon.
 *
 * KVITTERINGEN ERSTATTER FORMULAREN. Efter et forsøg er der ikke noget at
 * gøre på siden — og bliver feltet stående, tryk folk igen og igen, fordi der
 * ikke er sket noget synligt. Det er både en dårlig oplevelse og præcis den
 * adfærd, karantænen i handlingen findes for at dæmpe.
 */
export function FindKortForm() {
  const [state, action, pending] = useActionState<FindKortState, FormData>(
    findMitKort,
    {},
  );
  const [email, setEmail] = useState("");

  if (state.sendt) {
    return (
      <div className="box-shape border border-success/30 bg-success/10 p-4 text-sm text-success">
        {FIND_KORT_KVITTERING}
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <Field label="E-mail">
        <Input
          type="email"
          name="email"
          placeholder="din@email.dk"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </Field>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}

      <Button type="submit" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sender…" : "Send mig linket"}
      </Button>

      {/*
        DER LOVES IKKE NOGET OM, HVAD VI FINDER. Siden svarer det samme,
        uanset om der er et kort eller ej — ellers kunne den bruges til at
        spørge, om en bestemt e-mail handler et bestemt sted. Sætningen her
        skal derfor heller ikke antyde et "vi tjekker om du findes".
      */}
      <p className="text-xs leading-relaxed text-muted">
        Vi sender linket til den adresse, du skrev, da du fik kortet. Er dit
        kort gemt på en konto, skal du i stedet logge ind.
      </p>
    </form>
  );
}
