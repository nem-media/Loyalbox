"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset, type ResetRequestState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    {},
  );

  if (state.sent) {
    return (
      <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
        <CardBody className="space-y-3 text-center">
          <h1 className="text-xl font-bold tracking-tight">Tjek din e-mail</h1>
          <p className="text-sm text-muted">
            Findes der en konto med den adresse, har vi sendt et link til at
            vælge en ny adgangskode. Linket virker i én time.
          </p>
          <Link
            href="/login"
            className="inline-block text-sm font-medium text-accent"
          >
            Tilbage til log ind
          </Link>
        </CardBody>
      </Card>
    );
  }

  return (
    <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Glemt adgangskode
          </h1>
          <p className="mt-1 text-sm text-muted">
            Skriv din e-mail, så sender vi et link til at vælge en ny.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <Field label="E-mail">
            <Input type="email" name="email" autoComplete="email" required />
          </Field>

          {state.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Sender…" : "Send nulstillingslink"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted">
          Kom du i tanke om den?{" "}
          <Link href="/login" className="font-medium text-accent">
            Log ind
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
