"use client";

import { useActionState, useEffect, useId, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { tilfoejButik } from "./actions";
import type { FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { formatCurrency } from "@/lib/utils";
import { TERMS_VERSION } from "@/lib/constants";
import { ADRESSE_TEKSTER } from "@/lib/abonnement";

export interface DesignValgmulighed {
  id: string;
  navn: string;
  /** Fx "Hvid stander · Fronten matcher". */
  beskrivelse: string;
  /** Engangsprisen for skiltet med netop dette design, ex moms. */
  pris: number;
}

/**
 * "Har du åbnet en butik mere?"
 *
 * PRISEN STÅR FØR KNAPPEN, OG BEGGE BELØB STÅR DER. Købet trækker penge på
 * det kort, der i forvejen bruges til abonnementet — der er ingen
 * betalingsside imellem, hvor man kan nå at fortryde. Så skal skærmen sige
 * præcis hvad der sker, før der trykkes: et engangsbeløb for skiltet, og en
 * månedspris mere fra nu af.
 *
 * DESIGNET VÆLGES BLANDT DEM, BUTIKKEN HAR. Butik nummer to skal se ud som
 * butik nummer ét, og et nyt design hører til den almindelige bestilling inde
 * på adressen bagefter. Er der kun ét, er valget truffet, og så vises der en
 * linje i stedet for en liste — et radiofelt med én mulighed er en beslutning,
 * der ikke findes.
 */
export function TilfoejButik({
  designs,
  adresseNummer,
  maanedsprisPrAdresse,
  maanedsprisEfter,
}: {
  designs: DesignValgmulighed[];
  /** Hvilken adresse i rækken bliver den nye — 2, 3, … */
  adresseNummer: number;
  maanedsprisPrAdresse: number;
  maanedsprisEfter: number;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    tilfoejButik,
    {},
  );
  const [valgt, setValgt] = useState(designs[0]?.id ?? "");
  const [accepteret, setAccepteret] = useState(false);
  const feltId = useId();
  const router = useRouter();

  /*
   * Den nye butik åbnes med det samme — samme grund som ved `CreateStand`:
   * adressen er ikke færdig, når den er oprettet. Den skal have sit
   * destinationslink, og dét arbejde fortsætter inde på siden.
   *
   * MEN IKKE, NÅR DER ER EN BESKED AT LÆSE. Kræver betalingen en godkendelse
   * i banken, står linket til fakturaen i beskeden, og et skift af side ville
   * tage det væk, før nogen nåede at se det.
   */
  useEffect(() => {
    if (state.ok && state.gaaTil && !state.message) router.push(state.gaaTil);
  }, [state.ok, state.gaaTil, state.message, router]);

  const design = designs.find((d) => d.id === valgt) ?? designs[0];

  if (!design) {
    return (
      <>
        <p className="font-semibold tracking-tight">
          {ADRESSE_TEKSTER.koebOverskrift}
        </p>
        <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
          {ADRESSE_TEKSTER.koebHjaelp} Vi mangler bare at vide, hvordan skiltet
          skal se ud — design det først, så kan du tilføje butikken herfra.
        </p>
      </>
    );
  }

  return (
    <>
      <p className="font-semibold tracking-tight">
        {ADRESSE_TEKSTER.koebOverskrift}
      </p>
      <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
        {ADRESSE_TEKSTER.koebHjaelp}
      </p>

      <form action={action} className="mt-4 space-y-4">
        <Input
          name="name"
          placeholder="Navn på den nye butik (fx “Nørrebro”)"
          required
          className="max-w-sm"
        />

        {designs.length > 1 ? (
          <fieldset className="space-y-2">
            <legend className="etiket text-muted">
              Skiltet trykkes med dette design
            </legend>
            {designs.map((d) => (
              <label
                key={d.id}
                className="flex cursor-pointer items-center gap-3 text-sm"
              >
                <input
                  type="radio"
                  name="design_id"
                  value={d.id}
                  checked={valgt === d.id}
                  onChange={() => setValgt(d.id)}
                />
                <span>
                  {d.navn}
                  <span className="text-muted"> · {d.beskrivelse}</span>
                </span>
              </label>
            ))}
          </fieldset>
        ) : (
          <>
            <input type="hidden" name="design_id" value={design.id} />
            <p className="text-sm text-muted">
              Skiltet trykkes med dit design «{design.navn}» ({design.beskrivelse}
              ).
            </p>
          </>
        )}

        {/* BEGGE BELØB, OG HVAD DE DÆKKER. Engangsbeløbet er skiltet, og
            månedsprisen er butikken. Stod der kun ét tal, ville det andet
            komme som en overraskelse på kontoudskriften. */}
        <div className="box-shape border border-border bg-[var(--app-bg)] p-4 text-sm">
          <p className="flex justify-between gap-4">
            <span>Skilt til den nye butik (engangs)</span>
            <span className="font-medium">{formatCurrency(design.pris)}</span>
          </p>
          <p className="mt-1 flex justify-between gap-4">
            <span>QR-adresse nr. {adresseNummer}</span>
            <span className="font-medium">
              {formatCurrency(maanedsprisPrAdresse)} pr. måned
            </span>
          </p>
          <p className="mt-3 border-t border-border pt-3 text-muted">
            Alle beløb er ex moms. Skiltet og de resterende dage af denne måned
            trækkes nu på det kort, dit abonnement kører på. Fra næste træk er
            abonnementet {formatCurrency(maanedsprisEfter)} pr. måned.
          </p>
        </div>

        {/* ACCEPTEN SPØRGES HER SOM VED ETHVERT ANDET KØB.
            Der er ingen betalingsside imellem — knappen trækker penge på
            kortet med det samme — så det er den ENESTE lejlighed til at
            spørge. Et køb uden en registreret accept er værre end et
            besværligt køb. */}
        <div className="flex items-start gap-2.5">
          <input
            id={feltId}
            name="accepterVilkaar"
            type="checkbox"
            checked={accepteret}
            onChange={(e) => setAccepteret(e.target.checked)}
            className="mt-1 h-4 w-4 shrink-0 accent-accent"
          />
          <label htmlFor={feltId} className="text-sm leading-relaxed">
            Jeg accepterer{" "}
            <Link
              href="/handelsbetingelser"
              className="font-medium text-accent hover:underline"
            >
              handelsbetingelserne
            </Link>{" "}
            (version {TERMS_VERSION}), og at beløbet trækkes på det kort, mit
            abonnement kører på.
          </label>
        </div>

        <Button type="submit" disabled={pending || !accepteret}>
          {pending ? "Opretter butikken…" : "Tilføj butik og bestil skilt"}
        </Button>

        {state.error ? (
          <p className="text-sm text-danger">{state.error}</p>
        ) : null}
        {state.message ? (
          <p className="text-sm font-medium">{state.message}</p>
        ) : null}
      </form>
    </>
  );
}
