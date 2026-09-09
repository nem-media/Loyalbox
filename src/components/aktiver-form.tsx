"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import {
  AKTIVERING_TEKSTER,
  KODE_MINIMUM,
  type AktiveringSpaerre,
} from "@/lib/aktivering";
import type { AktiveringResultat } from "@/app/aktiver/actions";

/**
 * "Vælg en adgangskode" — det eneste, der står mellem betalingen og adgangen.
 *
 * ÉN KOMPONENT TIL BEGGE VEJE. Tak-siden sender `session_id` med, mailen
 * sender `token`; resten er det samme. Skrevet to steder ville den ene før
 * eller siden mangle en fejlbesked, den anden havde.
 *
 * FELTET ER STYRET AF NAVN OG IKKE AF TILSTAND. Formularen har ét felt, og en
 * server action nulstiller ikke et ustyret felt, den ikke rører — men
 * `key` på fejlen sikrer, at beskeden gentegnes ved hvert forsøg. Det er
 * samme fælde som i bestillingsformularen: React nulstiller ved svar.
 */
export function AktiverForm({
  action,
  skjultFelt,
}: {
  action: (
    prev: AktiveringResultat,
    formData: FormData,
  ) => Promise<AktiveringResultat>;
  /** Enten `session_id` fra Stripe eller `token` fra mailen. */
  skjultFelt: { navn: "session_id" | "token"; vaerdi: string };
}) {
  const [state, formAction, pending] = useActionState<
    AktiveringResultat,
    FormData
  >(action, {});

  return (
    <div className="box-shape mt-8 border border-accent/30 bg-accent/5 p-6">
      <h2 className="font-bold tracking-tight">
        {AKTIVERING_TEKSTER.overskrift}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {AKTIVERING_TEKSTER.hjaelp}
      </p>

      <form action={formAction} className="mt-4 space-y-4">
        <input
          type="hidden"
          name={skjultFelt.navn}
          value={skjultFelt.vaerdi}
        />

        <Field
          label="Adgangskode"
          hint={`Mindst ${KODE_MINIMUM} tegn. Din e-mail er den, du betalte med.`}
        >
          <Input
            name="kode"
            type="password"
            autoComplete="new-password"
            required
            minLength={KODE_MINIMUM}
          />
        </Field>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending ? "Opretter…" : "Opret min adgang"}
          </Button>

          {state.fejl ? (
            <span className="text-sm text-danger">
              {state.fejl}{" "}
              {state.logInd ? (
                <Link href="/login" className="font-medium text-accent">
                  Log ind →
                </Link>
              ) : null}
            </span>
          ) : null}
        </div>
      </form>
    </div>
  );
}

/** Beskeden, når der ikke er noget at aktivere. Samme ordlyd begge steder. */
export function AktiveringSpaerret({ grund }: { grund: AktiveringSpaerre }) {
  const tekst =
    grund === "allerede-aktiveret"
      ? AKTIVERING_TEKSTER.alleredeAktiveret
      : grund === "udloebet"
        ? AKTIVERING_TEKSTER.udloebet
        : AKTIVERING_TEKSTER.intetToken;

  return (
    <div className="box-shape mt-8 border border-border p-6">
      <p className="leading-relaxed text-muted">{tekst}</p>
      {grund === "allerede-aktiveret" ? (
        <Link
          href="/login"
          className="mt-3 inline-block font-medium text-accent"
        >
          Log ind →
        </Link>
      ) : null}
    </div>
  );
}
