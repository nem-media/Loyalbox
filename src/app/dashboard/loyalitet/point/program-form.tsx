"use client";

import { useActionState, useState } from "react";
import { opretPointProgram, opdaterPointProgram } from "./actions";
import type { FormResult } from "@/app/dashboard/loyalitet/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import {
  POINT_EARN_MODEL_LABELS,
  POINT_EARN_MODEL_HJAELP,
  earnValueLabel,
  beregnPoint,
  type PointEarnModel,
} from "@/lib/loyalty/point";

/**
 * Pointprogrammets ene formular — både til at oprette og til at rette.
 *
 * ÉN KOMPONENT, fordi felterne er de samme. To ville betyde, at en ny
 * indstilling skulle huskes to steder, og at den ene udgave stille kom bagud.
 *
 * FELTERNE ER STYREDE. React nulstiller en formular, når en server action
 * svarer — også ved en afvisning — og det er femte gang i dette projekt, den
 * lektie koster noget. Et forkert tal i optjeningsværdien må ikke tømme navn
 * og beskrivelse.
 */
export function PointProgramForm({
  program,
}: {
  program?: {
    id: string;
    name: string;
    description: string | null;
    earn_model: PointEarnModel;
    earn_value: number;
  };
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    program ? opdaterPointProgram : opretPointProgram,
    {},
  );

  const [navn, setNavn] = useState(program?.name ?? "Pointklub");
  const [beskrivelse, setBeskrivelse] = useState(program?.description ?? "");
  const [model, setModel] = useState<PointEarnModel>(
    program?.earn_model ?? "per_amount",
  );
  const [vaerdi, setVaerdi] = useState(String(program?.earn_value ?? 10));

  // Serveren regner det samme tal om lidt; dette er en VISNING, så butikken
  // kan se, hvad reglen betyder, før den gemmes.
  const tal = Number(vaerdi.replace(",", "."));
  const eksempel =
    model === "per_amount"
      ? beregnPoint({ model, earnValue: tal, amount: 250 })
      : beregnPoint({ model, earnValue: tal });

  return (
    <form action={action} className="space-y-4">
      {program ? <input type="hidden" name="id" value={program.id} /> : null}

      <Field label="Navn" hint="Det, kunden ser på sit kort.">
        <Input
          name="name"
          required
          value={navn}
          onChange={(e) => setNavn(e.target.value)}
        />
      </Field>

      <Field
        label="Kort beskrivelse (valgfri)"
        hint="Én linje om, hvad kunden får ud af det."
      >
        <Input
          name="description"
          value={beskrivelse}
          onChange={(e) => setBeskrivelse(e.target.value)}
          placeholder="Optjen point hver gang du handler"
        />
      </Field>

      <fieldset>
        <legend className="mb-2 text-sm font-medium">
          Hvordan optjener kunden point?
        </legend>
        <div className="space-y-2">
          {(
            Object.keys(POINT_EARN_MODEL_LABELS) as PointEarnModel[]
          ).map((m) => (
            <label
              key={m}
              className={
                "box-shape flex cursor-pointer items-start gap-3 border p-3 transition-colors " +
                (model === m
                  ? "border-accent bg-accent/5"
                  : "border-border hover:bg-muted-bg")
              }
            >
              <input
                type="radio"
                name="earn_model"
                value={m}
                checked={model === m}
                onChange={() => setModel(m)}
                className="mt-1"
              />
              <span>
                <span className="block text-sm font-medium">
                  {POINT_EARN_MODEL_LABELS[m]}
                </span>
                <span className="block text-xs leading-relaxed text-muted">
                  {POINT_EARN_MODEL_HJAELP[m]}
                </span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {/*
        FELTET BLIVER STÅENDE VED MANUEL TILDELING — men det siges, at det ikke
        bruges. Skjult ville tallet stadig blive gemt (kolonnen er not null), og
        den dag butikken skifter til "efter beløb", ville programmet regne med
        et tal, ingen har set.
      */}
      <Field
        label={earnValueLabel(model)}
        hint={
          model === "per_amount"
            ? "Fx 10 kr. = 1 point. Der rundes altid ned."
            : model === "per_visit"
              ? "Samme antal hver gang, uanset beløbet."
              : "Bruges først, hvis du senere skifter optjeningsmodel."
        }
      >
        <Input
          name="earn_value"
          type="number"
          min="0.01"
          step="0.01"
          required
          value={vaerdi}
          onChange={(e) => setVaerdi(e.target.value)}
          className="max-w-40"
        />
      </Field>

      {model !== "manual" && eksempel > 0 ? (
        <p className="box-shape border border-border bg-muted-bg p-3 text-sm text-muted">
          {model === "per_amount"
            ? `Et køb på 250 kr. giver ${eksempel} point.`
            : `Hvert køb giver ${eksempel} point, uanset beløbet.`}
        </p>
      ) : null}

      {state.error ? (
        <p role="alert" className="text-sm text-danger">
          {state.error}
        </p>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">Gemt.</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Gemmer…" : program ? "Gem ændringer" : "Opret pointprogram"}
      </Button>
    </form>
  );
}
