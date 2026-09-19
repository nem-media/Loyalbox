"use client";

import Link from "next/link";
import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import {
  AKTIVERING_TEKSTER,
  KODE_MINIMUM,
  type AktiveringSpaerre,
  type AktiveringsForm,
} from "@/lib/aktivering";
import type { AktiveringResultat } from "@/app/aktiver/actions";

/**
 * Det sidste skridt mellem betalingen og adgangen.
 *
 * ÉN KOMPONENT TIL BEGGE VEJE. Tak-siden sender `session_id` med, mailen
 * sender `token`; resten er det samme. Skrevet to steder ville den ene før
 * eller siden mangle en fejlbesked, den anden havde.
 *
 * MEN DER ER TO SLAGS KUNDER HER, og de må ikke få samme skærm. Har
 * e-mailen allerede en konto, kan vi ikke sætte en ny adgangskode — så
 * ville tokenet kunne overtage en bestående konto — og så må vi heller
 * ikke SPØRGE om en. Det gjorde siden før: den viste kodefeltet til alle,
 * tog imod koden og smed den væk uden et ord, og kunden kunne ikke logge
 * ind bagefter. `form` afgøres på serveren, før skærmen tegnes, netop for
 * at feltet aldrig vises til nogen, det ikke gælder for.
 *
 * FELTET ER STYRET AF NAVN OG IKKE AF TILSTAND. Formularen har ét felt, og
 * en server action nulstiller ikke et ustyret felt, den ikke rører — men
 * `key` på fejlen sikrer, at beskeden gentegnes ved hvert forsøg. Det er
 * samme fælde som i bestillingsformularen: React nulstiller ved svar.
 */
export function AktiverForm({
  action,
  skjultFelt,
  form = "ny-konto",
  email,
}: {
  action: (
    prev: AktiveringResultat,
    formData: FormData,
  ) => Promise<AktiveringResultat>;
  /** Enten `session_id` fra Stripe eller `token` fra mailen. */
  skjultFelt: { navn: "session_id" | "token"; vaerdi: string };
  /** Afgjort på serveren: har betalingens e-mail allerede en konto? */
  form?: AktiveringsForm;
  /** Vises, så kunden kan se HVILKEN konto købet lander på. */
  email?: string | null;
}) {
  const [state, formAction, pending] = useActionState<
    AktiveringResultat,
    FormData
  >(action, {});

  const eksisterende = form === "eksisterende-konto";

  return (
    <div className="box-shape mt-8 border border-accent/25 bg-card p-6 shadow-[var(--hoejde-1)]">
      <h2 className="font-bold tracking-tight">
        {eksisterende
          ? AKTIVERING_TEKSTER.eksisterendeOverskrift
          : AKTIVERING_TEKSTER.overskrift}
      </h2>
      <p className="mt-1 text-sm leading-relaxed text-muted">
        {eksisterende
          ? AKTIVERING_TEKSTER.eksisterendeHjaelp
          : AKTIVERING_TEKSTER.hjaelp}
      </p>

      {eksisterende && email ? (
        <p className="mt-2 text-sm">
          Købet knyttes til <span className="font-medium">{email}</span>.
        </p>
      ) : null}

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name={skjultFelt.navn} value={skjultFelt.vaerdi} />

        {/* INTET KODEFELT til en kendt e-mail. Feltet er ikke bare skjult
            og deaktiveret: der er ingen kode at tage imod, og et felt, der
            ikke bliver brugt, er præcis dét, der gik galt før. */}
        {eksisterende ? null : (
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
        )}

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" size="lg" disabled={pending}>
            {pending
              ? "Et øjeblik…"
              : eksisterende
                ? AKTIVERING_TEKSTER.eksisterendeKnap
                : "Opret min adgang"}
          </Button>

          {eksisterende ? (
            <Link
              href="/glemt-adgangskode"
              className="text-sm font-medium text-accent"
            >
              Glemt din adgangskode?
            </Link>
          ) : null}

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
