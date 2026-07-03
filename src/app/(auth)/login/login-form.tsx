"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export function LoginForm({ next }: { next: string }) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Log ind</h1>
          <p className="mt-1 text-sm text-muted">
            Velkommen tilbage. Log ind på dit dashboard.
          </p>
        </div>

        <form action={action} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <Field label="E-mail">
            <Input type="email" name="email" autoComplete="email" required />
          </Field>
          <Field label="Adgangskode">
            <Input
              type="password"
              name="password"
              autoComplete="current-password"
              required
            />
          </Field>

          {state.error ? (
            <p className="text-sm text-danger">{state.error}</p>
          ) : null}

          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Logger ind…" : "Log ind"}
          </Button>
        </form>

        <p className="text-center text-sm text-muted">
          Har du ikke en konto?{" "}
          <Link href="/signup" className="font-medium text-accent">
            Opret virksomhed
          </Link>
        </p>
      </CardBody>
    </Card>
  );
}
