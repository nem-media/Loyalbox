"use client";

import { useActionState } from "react";
import Link from "next/link";
import { login, type AuthState } from "../actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { Card, CardBody } from "@/components/ui/card";

export function LoginForm({
  next,
  notice,
}: {
  next: string;
  /** Besked fra et udløbt eller allerede brugt link i en auth-mail. */
  notice?: string;
}) {
  const [state, action, pending] = useActionState<AuthState, FormData>(login, {});

  return (
    <Card className="shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)]">
      <CardBody className="space-y-5">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Log ind</h1>
          <p className="mt-1 text-sm text-muted">
            Velkommen tilbage. Samme login til dit dashboard og dine
            stempelkort.
          </p>
        </div>

        {notice ? (
          <p className="box-shape border border-secondary/30 bg-secondary/10 p-3 text-sm">
            {notice}
          </p>
        ) : null}

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

        <div className="space-y-1 text-center text-sm text-muted">
          <p>
            <Link
              href="/glemt-adgangskode"
              className="font-medium text-accent"
            >
              Glemt adgangskode?
            </Link>
          </p>
          <p>
            Har du ikke en konto?{" "}
            <Link href="/signup" className="font-medium text-accent">
              Opret virksomhed
            </Link>
          </p>
          <p>
            Kunde med et stempelkort?{" "}
            <Link href="/opret-konto" className="font-medium text-accent">
              Opret kundekonto
            </Link>
          </p>
        </div>
      </CardBody>
    </Card>
  );
}
