"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signupCustomer, type CustomerAuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export function CustomerSignupForm({
  token,
  email,
}: {
  token: string;
  email: string;
}) {
  const [state, action, pending] = useActionState<CustomerAuthState, FormData>(
    signupCustomer,
    {},
  );

  if (state.needsConfirmation) {
    return (
      <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
        <CardBody className="space-y-3 text-center">
          <h1 className="text-xl font-bold tracking-tight">Tjek din e-mail</h1>
          <p className="text-sm text-muted">
            Vi har sendt dig et bekræftelseslink. Åbn det, og log derefter ind —
            så ligger dit stempelkort klar.
          </p>
          <Link href="/login" className="inline-block text-sm font-medium text-accent">
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
          <h1 className="text-xl font-bold tracking-tight">Opret kundekonto</h1>
          <p className="mt-1 text-sm text-muted">
            {token
              ? "Gem dit stempelkort, så du altid kan finde det igen — også på en ny telefon."
              : "Saml dine stempelkort fra alle butikker ét sted."}
          </p>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="token" value={token} />
          <Field label="E-mail">
            <Input
              type="email"
              name="email"
              autoComplete="email"
              defaultValue={email}
              required
            />
          </Field>
          <Field label="Adgangskode" hint="Mindst 6 tegn.">
            <Input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={6}
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
          <Link
            href={
              token
                ? `/login?next=${encodeURIComponent(`/kort/${token}`)}`
                : "/login?next=/mine-kort"
            }
            className="font-medium text-accent"
          >
            Log ind
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
