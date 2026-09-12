"use client";

import { useActionState, useId } from "react";
import {
  sendSupport,
  type SupportResultat,
} from "@/app/dashboard/hjaelp/actions";
import { Button } from "@/components/ui/button";
import { Textarea, Field } from "@/components/ui/input";
import { EMNER, STANDARD_EMNE, SVARTID } from "@/lib/kontakt";
import { COMPANY } from "@/lib/constants";

/**
 * "Skriv til os" på hjælpesiden.
 *
 * KUN TO FELTER. Kunden er logget ind, så butik, produkt, niveau og
 * mailadresse hæfter serveren selv på — se src/app/dashboard/hjaelp/actions.ts.
 * Før stod der en `mailto:`-adresse og en opfordring til selv at fortælle,
 * hvilken side man stod på; det gør de færreste, og så gik der en runde med
 * "hvilken butik skriver du fra?".
 *
 * Mailadressen bliver stående ved siden af: nogle vil hellere skrive fra deres
 * eget mailprogram, og en formular må ikke være den eneste vej ind.
 */
export function SupportForm({
  /** Vises, så kunden kan se, hvad vi allerede ved — og hvor svaret lander. */
  afsender,
  butik,
}: {
  afsender: string;
  butik?: string | null;
}) {
  const [state, action, pending] = useActionState<SupportResultat, FormData>(
    sendSupport,
    {},
  );

  const emneId = useId();
  const beskedId = useId();

  if (state.ok) {
    return (
      <div className="box-shape border border-accent/30 bg-accent/5 p-5">
        <p className="font-bold tracking-tight">Tak — vi har din besked</p>
        <p className="mt-1 text-sm text-muted">
          {SVARTID} Svaret kommer til {afsender}.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <p className="text-sm text-muted">
        Vi kan se, hvem du skriver fra
        {butik ? (
          <>
            {" "}
            — <span className="font-medium text-foreground">{butik}</span>
          </>
        ) : null}
        , så du behøver ikke fortælle det. Svaret går til{" "}
        <span className="font-medium text-foreground">{afsender}</span>.
      </p>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Hvad handler det om?" fejl={state.fejl?.emne}>
          <select
            id={emneId}
            name="emne"
            defaultValue={state.udfyldt?.emne || STANDARD_EMNE}
            className="box-shape h-11 w-full border border-border bg-background px-3 text-sm focus-visible:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            {EMNER.map((e) => (
              <option key={e.vaerdi} value={e.vaerdi}>
                {e.navn}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <Field
        label="Hvad kan vi hjælpe med?"
        fejl={state.fejl?.besked}
        hint="Skriv gerne, hvilken side du står på, og hvad du forsøgte — så kan vi svare konkret i stedet for at spørge."
      >
        {/* `defaultValue` fra state: React nulstiller formularen, når dens
            action er kørt færdig — også når serveren afviste den. */}
        <Textarea
          id={beskedId}
          name="besked"
          rows={5}
          required
          defaultValue={state.udfyldt?.besked ?? ""}
        />
      </Field>

      {state.fejlbesked ? (
        <p role="alert" className="text-sm font-medium text-danger">
          {state.fejlbesked}
        </p>
      ) : null}

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={pending}>
          {pending ? "Sender…" : "Send besked"}
        </Button>
        <span className="text-xs text-muted">
          {SVARTID} Eller skriv til{" "}
          <a
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-accent hover:underline"
          >
            {COMPANY.email}
          </a>
          .
        </span>
      </div>
    </form>
  );
}
