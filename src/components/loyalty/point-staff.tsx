"use client";

import { useActionState, useState } from "react";
import { Besked } from "@/components/ui/besked";
import {
  givPointAction,
  justerPointAction,
  indloesPointAction,
} from "@/app/dashboard/loyalitet/point/actions";
import type { FormResult } from "@/app/dashboard/loyalitet/actions";
import { Button } from "@/components/ui/button";
import { Input, Field } from "@/components/ui/input";
import { beregnPoint, pointTekst, type PointEarnModel } from "@/lib/loyalty/point";

/**
 * Personalets tre handlinger på en kundes pointkonto.
 *
 * DE LIGGER SAMLET, fordi de bruges samme sted: butikkens kundeside og kundens
 * eget kort i personale-tilstand. To udgaver ville betyde, at en rettelse i
 * previewet eller i idempotensnøglen kun nåede den ene disk.
 *
 * NØGLEN KOMMER FRA SERVEREN. Det er tredje gang i dette projekt, den lektie
 * skal læres: `useId()` er FÆLLES for alle, der har siden åben (to
 * medarbejdere ville dele nøgle, og den enes point blev slugt som et
 * gentaget), og `crypto.randomUUID()` i komponenten giver server og browser
 * hver sin værdi. Siderne er `force-dynamic`, så hver visning får sin egen.
 */

export function GivPointForm({
  programId,
  memberId,
  reference,
  earnModel,
  earnValue,
  saldo,
}: {
  programId: string;
  memberId: string;
  reference: string;
  earnModel: PointEarnModel;
  earnValue: number;
  saldo: number;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    givPointAction,
    {},
  );
  const [beloeb, setBeloeb] = useState("");
  const [manuelle, setManuelle] = useState("");

  const tal = Number(beloeb.replace(",", "."));
  const point =
    earnModel === "per_amount"
      ? beregnPoint({ model: earnModel, earnValue, amount: tal })
      : earnModel === "per_visit"
        ? beregnPoint({ model: earnModel, earnValue })
        : Math.floor(Number(manuelle) || 0);

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="reference" value={reference} />

      {earnModel === "per_amount" ? (
        <Field label="Købets beløb" hint="Kroner. Pointene regnes ud herfra.">
          <Input
            name="amount"
            type="number"
            min="0"
            step="0.01"
            inputMode="decimal"
            placeholder="250"
            value={beloeb}
            onChange={(e) => setBeloeb(e.target.value)}
            className="max-w-40"
          />
        </Field>
      ) : null}

      {earnModel === "manual" ? (
        <Field label="Antal point">
          <Input
            name="points"
            type="number"
            min="1"
            step="1"
            inputMode="numeric"
            placeholder="10"
            value={manuelle}
            onChange={(e) => setManuelle(e.target.value)}
            className="max-w-40"
          />
        </Field>
      ) : null}

      {/*
        PREVIEWET ER DET, PERSONALET SIGER HØJT, før de trykker. Tallet regnes
        på serveren igen — dette er en visning og aldrig kilden.
      */}
      {point > 0 ? (
        <div className="box-shape border border-border bg-muted-bg p-3 text-sm">
          <p>
            Kunden optjener{" "}
            <span className="font-medium">{pointTekst(point)}</span>
          </p>
          <p className="text-muted">
            {pointTekst(saldo)} nu → {pointTekst(saldo + point)} bagefter
          </p>
        </div>
      ) : null}

      {state.error ? (
        <Besked slags="fejl">{state.error}</Besked>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">
          Pointene er givet. Genindlæs for at se den nye saldo.
        </p>
      ) : null}

      <Button type="submit" size="sm" disabled={pending || point < 1}>
        {pending
          ? "Giver…"
          : point > 0
            ? `Giv ${pointTekst(point)}`
            : "Giv point"}
      </Button>
    </form>
  );
}

export function IndloesKnap({
  programId,
  memberId,
  rewardId,
  rewardNavn,
  pris,
  saldo,
  reference,
}: {
  programId: string;
  memberId: string;
  rewardId: string;
  rewardNavn: string;
  pris: number;
  saldo: number;
  reference: string;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    indloesPointAction,
    {},
  );
  const [bekraeft, setBekraeft] = useState(false);

  if (state.ok) {
    return (
      <p className="text-sm font-medium text-success">
        {rewardNavn} indløst · {pointTekst(pris)} brugt
      </p>
    );
  }

  if (!bekraeft) {
    return (
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => setBekraeft(true)}
      >
        Indløs
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="reward_id" value={rewardId} />
      <input type="hidden" name="reference" value={reference} />
      <p className="text-sm">
        Indløs <span className="font-medium">{rewardNavn}</span> for{" "}
        {pointTekst(pris)}?
        <span className="block text-muted">
          {pointTekst(saldo)} → {pointTekst(Math.max(0, saldo - pris))}
        </span>
      </p>
      {state.error ? (
        <Besked slags="fejl">{state.error}</Besked>
      ) : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Indløser…" : "Ja, indløs"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setBekraeft(false)}
        >
          Annullér
        </Button>
      </div>
    </form>
  );
}

/**
 * Manuel justering — kun for ejer og medarbejdere med administratoradgang.
 *
 * SALDOEN REDIGERES ALDRIG DIREKTE. Der findes ikke et felt, hvor tallet kan
 * skrives om; der lægges en linje i ledgeren med en begrundelse, og saldoen
 * følger af den. Det er hele forskellen på en kvitteringsbog og et regneark.
 */
export function JusterPointForm({
  programId,
  memberId,
  reference,
}: {
  programId: string;
  memberId: string;
  reference: string;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    justerPointAction,
    {},
  );
  const [aaben, setAaben] = useState(false);
  const [retning, setRetning] = useState<"plus" | "minus">("plus");

  if (!aaben) {
    return (
      <Button
        type="button"
        size="sm"
        variant="ghost"
        onClick={() => setAaben(true)}
      >
        Justér point
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="program_id" value={programId} />
      <input type="hidden" name="member_id" value={memberId} />
      <input type="hidden" name="reference" value={reference} />
      <input type="hidden" name="retning" value={retning} />

      <div className="flex gap-2">
        <Button
          type="button"
          size="sm"
          variant={retning === "plus" ? "primary" : "outline"}
          onClick={() => setRetning("plus")}
        >
          Tilføj
        </Button>
        <Button
          type="button"
          size="sm"
          variant={retning === "minus" ? "primary" : "outline"}
          onClick={() => setRetning("minus")}
        >
          Træk fra
        </Button>
      </div>

      <Field label="Antal point">
        <Input
          name="points"
          type="number"
          min="1"
          step="1"
          required
          className="max-w-32"
        />
      </Field>

      <Field label="Begrundelse" hint="Står i historikken — fx “kompensation”.">
        <Input name="reason" required placeholder="Kompensation" />
      </Field>

      {state.error ? (
        <Besked slags="fejl">{state.error}</Besked>
      ) : null}
      {state.ok ? (
        <p className="text-sm font-medium text-success">Justeringen er gemt.</p>
      ) : null}

      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Gemmer…" : "Gem justering"}
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={() => setAaben(false)}
        >
          Luk
        </Button>
      </div>
    </form>
  );
}
