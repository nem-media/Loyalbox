"use client";

import { useActionState, useState } from "react";
import { Button } from "@/components/ui/button";
import { Besked } from "@/components/ui/besked";
import { Input } from "@/components/ui/input";
import {
  afbryd,
  gemBeloenningskanal,
  gemProgramkanal,
  opretKode,
  type IntegrationsSvar,
} from "./actions";

const TOM: IntegrationsSvar = {};

function kl(iso: string) {
  return new Intl.DateTimeFormat("da-DK", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Copenhagen",
  }).format(new Date(iso));
}

/**
 * PARRINGSKODEN VISES ÉN GANG — her, i svaret på trykket. Basen har kun dens
 * hash, så en genindlæsning af siden kan ikke vise den igen; ejeren henter
 * bare en ny, og den gamle holder op med at gælde.
 */
export function Parring({ forbundet }: { forbundet: boolean }) {
  const [svar, handling, venter] = useActionState(opretKode, TOM);
  return (
    <div className="space-y-3">
      <form action={handling}>
        <Button type="submit" variant={forbundet ? "outline" : "primary"} disabled={venter}>
          {venter ? "Laver kode …" : forbundet ? "Forbind igen med en ny kode" : "Hent parringskode"}
        </Button>
      </form>
      {svar.error ? <Besked slags="fejl">{svar.error}</Besked> : null}
      {svar.kode ? <Kodevisning kode={svar.kode} udloeber={svar.udloeber!} /> : null}
    </div>
  );
}

export function Kodevisning({ kode, udloeber }: { kode: string; udloeber: string }) {
  return (
    <div className="box-shape border border-accent/25 bg-accent-tint p-4">
      <p className="text-sm text-muted">
        Skriv koden i LoyalSum-pluginet i WordPress under WooCommerce → LoyalSum.
      </p>
      <p
        className="mt-2 select-all break-all font-mono text-2xl font-bold tracking-[0.12em] text-dark"
        aria-label={`Parringskode ${kode.split("").join(" ")}`}
      >
        {kode}
      </p>
      <p className="mt-2 text-xs text-muted">
        Gælder til kl. {kl(udloeber)} og kan bruges én gang. Koden vises kun nu —
        hent en ny, hvis du mister den.
      </p>
    </div>
  );
}

/** Afbryd i to trin — ingen browserdialog, bare en knap mere. */
export function Afbryd({ integrationId }: { integrationId: string }) {
  const [svar, handling, venter] = useActionState(afbryd, TOM);
  const [sikker, setSikker] = useState(false);
  if (svar.ok) return <Besked slags="ok">{svar.message}</Besked>;
  return (
    <div className="space-y-2">
      {sikker ? (
        <form action={handling} className="flex flex-wrap items-center gap-2">
          <input type="hidden" name="integration_id" value={integrationId} />
          <Button type="submit" variant="danger" size="sm" disabled={venter}>
            {venter ? "Afbryder …" : "Ja, afbryd forbindelsen"}
          </Button>
          <Button type="button" variant="ghost" size="sm" onClick={() => setSikker(false)}>
            Fortryd
          </Button>
        </form>
      ) : (
        <Button type="button" variant="outline" size="sm" onClick={() => setSikker(true)}>
          Afbryd forbindelsen
        </Button>
      )}
      {sikker ? (
        <p className="text-xs text-muted">
          Webshoppen kan ikke sende flere ordrer. Kundernes point, stempler og
          historik bliver, som de er.
        </p>
      ) : null}
      {svar.error ? <Besked slags="fejl">{svar.error}</Besked> : null}
    </div>
  );
}

export function Programkanal({
  slags,
  programId,
  navn,
  beskrivelse,
  aktiv,
  minKr,
}: {
  slags: "points" | "stamps";
  programId: string;
  navn: string;
  beskrivelse: string;
  aktiv: boolean;
  minKr: string;
}) {
  const [svar, handling, venter] = useActionState(gemProgramkanal, TOM);
  return (
    <form action={handling} className="space-y-3">
      <input type="hidden" name="slags" value={slags} />
      <input type="hidden" name="program_id" value={programId} />
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={aktiv}
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
        />
        <span>
          <span className="block font-medium text-dark">{navn}</span>
          <span className="block text-sm text-muted">{beskrivelse}</span>
        </span>
      </label>
      {slags === "stamps" ? (
        <label className="block max-w-xs pl-7">
          <span className="mb-1.5 block text-sm font-medium">Mindste ordrebeløb for et stempel (kr.)</span>
          <Input name="min_kr" inputMode="decimal" defaultValue={minKr} placeholder="Intet minimum" />
        </label>
      ) : null}
      <div className="flex flex-wrap items-center gap-3 pl-7">
        <Button type="submit" size="sm" variant="outline" disabled={venter}>
          {venter ? "Gemmer …" : "Gem"}
        </Button>
        {svar.message ? <span role="status" className="text-sm text-success-tekst">{svar.message}</span> : null}
      </div>
      {svar.error ? <Besked slags="fejl">{svar.error}</Besked> : null}
    </form>
  );
}

export function Beloenningskanal({
  rewardId,
  navn,
  point,
  aktiv,
  type,
  beloebKr,
  procent,
}: {
  rewardId: string;
  navn: string;
  point: number;
  aktiv: boolean;
  type: "fixed_amount" | "percentage";
  beloebKr: string;
  procent: string;
}) {
  const [svar, handling, venter] = useActionState(gemBeloenningskanal, TOM);
  const [valgt, setValgt] = useState(type);
  return (
    <form action={handling} className="space-y-3">
      <input type="hidden" name="reward_id" value={rewardId} />
      <label className="flex items-start gap-3">
        <input
          type="checkbox"
          name="enabled"
          defaultChecked={aktiv}
          className="mt-1 h-4 w-4 accent-[var(--accent)]"
        />
        <span>
          <span className="block font-medium text-dark">{navn}</span>
          <span className="block text-sm text-muted">{point} point</span>
        </span>
      </label>
      <div className="flex flex-wrap items-end gap-3 pl-7">
        <label className="block">
          <span className="mb-1.5 block text-sm font-medium">Rabat i webshoppen</span>
          <select
            name="discount_type"
            value={valgt}
            onChange={(e) => setValgt(e.target.value === "percentage" ? "percentage" : "fixed_amount")}
            className="kontrol-shape h-11 border border-border bg-background px-3 text-sm"
          >
            <option value="fixed_amount">Fast beløb</option>
            <option value="percentage">Procent af kurven</option>
          </select>
        </label>
        {valgt === "fixed_amount" ? (
          <label className="block w-36">
            <span className="mb-1.5 block text-sm font-medium">Kr. inkl. moms</span>
            <Input name="amount_kr" inputMode="decimal" defaultValue={beloebKr} placeholder="50" />
          </label>
        ) : (
          <label className="block w-28">
            <span className="mb-1.5 block text-sm font-medium">Procent</span>
            <Input name="percent" inputMode="decimal" defaultValue={procent} placeholder="10" />
          </label>
        )}
        <Button type="submit" size="sm" variant="outline" disabled={venter}>
          {venter ? "Gemmer …" : "Gem"}
        </Button>
      </div>
      {svar.message ? <p role="status" className="pl-7 text-sm text-success-tekst">{svar.message}</p> : null}
      {svar.error ? <Besked slags="fejl">{svar.error}</Besked> : null}
    </form>
  );
}
