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
          {/* Se `AuthState.udfyldt`: uden den her koster en forkert
              adgangskode også e-mailen. Koden lægges bevidst ikke tilbage. */}
          <Field label="E-mail">
            <Input
              type="email"
              name="email"
              autoComplete="email"
              required
              defaultValue={state.udfyldt?.email ?? ""}
            />
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

        {/*
          GENVEJEN UD AF EN GLEMT KODE STÅR FOR SIG, OG DET ER ET TRYKMÅL.
          De tre linjer lå i én stak med 4 px imellem. "Glemt adgangskode?"
          er den eneste af dem, der er en HANDLING for sig — de to andre er
          links midt i en sætning — og den målte 139 × 18 på en telefon.

          `.trykmaal` alene ville ikke have virket: MÅLT ved 390 px var der
          6 px ned til "Opret virksomhed", så de 10 px polstring ville have
          lagt trykfeltet 4 px ind over nabolinjens tekst. Et trykmål, der
          vokser ind i sin nabo, er ikke en forbedring — så rammer man bare
          det forkerte i stedet for ingenting. Derfor er handlingen skilt
          ud i sin egen blok med luft omkring, og de to oprettelseslinjer
          står tilbage som dét, de er: en sætning hver.
        */}
        <p className="text-center text-sm">
          <Link
            href="/glemt-adgangskode"
            className="trykmaal inline-block font-medium text-accent"
          >
            Glemt adgangskode?
          </Link>
        </p>

        <div className="space-y-1.5 text-center text-sm text-muted">
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
