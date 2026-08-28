"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export function SignupForm({
  produkt,
  antal,
}: {
  /** Varen, kunden stod på, da de trykkede "Opret konto". */
  produkt?: string;
  /** Antallet, de havde valgt. */
  antal?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    {},
  );

  // Er e-mailbekræftelse slået til i Supabase, kommer der ingen session med
  // oprettelsen. Virksomheden er allerede gemt, så brugeren skal blot bekræfte
  // og logge ind.
  if (state.needsConfirmation) {
    return (
      <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
        <CardBody className="space-y-3 text-center">
          <h1 className="text-xl font-bold tracking-tight">Tjek din e-mail</h1>
          <p className="text-sm text-muted">
            Vi har sendt dig et bekræftelseslink. Åbn det, og log derefter ind —
            så ligger din virksomhed klar i dashboardet.
            {produkt ? " Din bestilling venter, hvor du slap." : ""}
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-accent"
          >
            Gå til log ind
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Opret virksomhed</h1>
          <p className="mt-1 text-sm text-muted">
            Kom i gang med at samle anmeldelser på minutter.
          </p>
        </div>

        <form action={action} className="space-y-4">
          {/* Valget fra bestillingen. `signup()` sender kunden tilbage hertil
              bagefter — også via bekræftelseslinket i mailen. */}
          {produkt ? (
            <input type="hidden" name="produkt" value={produkt} />
          ) : null}
          {antal ? <input type="hidden" name="antal" value={antal} /> : null}

          <Field label="Firmanavn">
            <Input name="company_name" required />
          </Field>
          <Field
            label="CVR-nummer (valgfrit)"
            hint="Otte cifre, og priserne er ex moms. Har du ikke et nummer endnu, kan du tilføje det senere under Virksomhedsprofil."
          >
            <Input
              name="cvr"
              inputMode="numeric"
              autoComplete="off"
              placeholder="12345678"
            />
          </Field>
          <Field label="E-mail">
            <Input type="email" name="email" autoComplete="email" required />
          </Field>
          <Field label="Adgangskode" hint="Mindst 6 tegn.">
            <Input
              type="password"
              name="password"
              autoComplete="new-password"
              required
            />
          </Field>

          {state.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Opretter…" : "Opret konto"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted">
          Har du allerede en konto?{" "}
          <Link href="/login" className="font-medium text-accent">
            Log ind
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
