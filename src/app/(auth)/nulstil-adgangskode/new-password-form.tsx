"use client";

import { useActionState } from "react";
import { updatePassword, type NewPasswordState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export function NewPasswordForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState<NewPasswordState, FormData>(
    updatePassword,
    {},
  );

  return (
    <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">
            Vælg ny adgangskode
          </h1>
          <p className="mt-1 text-sm text-muted">
            {email ? `Du er ved at ændre adgangskoden for ${email}.` : null}
          </p>
        </div>

        <form action={action} className="space-y-4">
          {/* Skjult felt med brugernavnet, så password managers gemmer den nye
              kode på den rigtige konto. */}
          <input
            type="text"
            name="username"
            autoComplete="username"
            value={email}
            readOnly
            hidden
          />
          <Field label="Ny adgangskode" hint="Mindst 6 tegn.">
            <Input
              type="password"
              name="password"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </Field>
          <Field label="Gentag adgangskode">
            <Input
              type="password"
              name="password_repeat"
              autoComplete="new-password"
              minLength={6}
              required
            />
          </Field>

          {state.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Gemmer…" : "Gem ny adgangskode"}
          </Button>
        </form>
      </CardBody>
    </Card>
  );
}
