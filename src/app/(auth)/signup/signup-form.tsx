"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signup, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export function SignupForm() {
  const [state, action, pending] = useActionState<AuthState, FormData>(
    signup,
    {},
  );

  return (
    <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Opret virksomhed
          </h1>
          <p className="mt-1 text-sm text-muted">
            Kom i gang med at samle anmeldelser på minutter.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <Field label="Firmanavn">
            <Input name="company_name" required />
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
