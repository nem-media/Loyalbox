"use client";

import { useActionState, useEffect, useRef } from "react";
import {
  opretStempelkort,
  saetStempelkortStatus,
  type StempelkortResultat,
} from "./actions";
import type { ProgramStatus } from "@/lib/loyalty/constants";

export interface ProgramRaekke {
  id: string;
  name: string;
  status: ProgramStatus;
  /** Tilstanden til visning, med datovinduet lagt oveni (fx "Planlagt"). */
  tilstand: string;
  required_stamps: number | null;
}

/**
 * Medarbejderens stempelkort-flade.
 *
 * BEVIDST SIMPEL. Ejeren har hele guiden i dashboardet; her får medarbejderen
 * kun det, `canManage` lover: lave et kort og tænde/slukke det. Avancerede
 * regler (optjeningsmodel, udløb, dagsgrænser) står på fornuftige
 * standardværdier og kan finpudses af ejeren.
 */
export function StempelkortAdmin({ programmer }: { programmer: ProgramRaekke[] }) {
  return (
    <div className="space-y-8">
      <Opret />
      <Liste programmer={programmer} />
    </div>
  );
}

function Opret() {
  const [state, action, pending] = useActionState<StempelkortResultat, FormData>(
    opretStempelkort,
    {},
  );
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state.ok]);

  return (
    <section className="box-shape border border-border bg-background p-5">
      <h2 className="font-bold tracking-tight">Opret et stempelkort</h2>
      <p className="mt-1 text-sm text-muted">
        Det bliver til med det samme. Du kan sætte det på pause igen når som
        helst.
      </p>

      <form ref={formRef} action={action} className="mt-4 space-y-4">
        <label className="block">
          <span className="text-sm font-medium">Navn på kortet</span>
          <input
            name="name"
            required
            placeholder="Fx Kaffekort"
            className="box-shape mt-1.5 h-11 w-full border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          />
          <span className="mt-1 block text-xs text-muted">
            Det står på kundens kort.
          </span>
        </label>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="text-sm font-medium">Stempler til en belønning</span>
            <input
              name="required_stamps"
              type="number"
              min={1}
              defaultValue={10}
              className="box-shape mt-1.5 h-11 w-full border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
          <label className="block">
            <span className="text-sm font-medium">Belønning</span>
            <input
              name="reward_name"
              placeholder="Fx Gratis kaffe"
              className="box-shape mt-1.5 h-11 w-full border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
          </label>
        </div>

        <label className="flex items-center gap-2.5">
          {/* Et afkrydsningsfelt sendes kun med, når det er sat — derfor
              value="active". Er det ikke sat, ryger feltet slet ikke med, og
              handlingen laver kortet som kladde. */}
          <input
            type="checkbox"
            name="status"
            value="active"
            defaultChecked
            className="h-4 w-4 accent-[color:var(--color-accent,#26616e)]"
          />
          <span className="text-sm">
            Gør kortet aktivt med det samme
            <span className="block text-xs text-muted">
              Slå fra for at gemme det som kladde, kunderne ikke kan se endnu.
            </span>
          </span>
        </label>

        {state.error ? (
          <p className="text-sm text-red-600">{state.error}</p>
        ) : null}
        {state.ok ? (
          <p className="text-sm text-accent">Stempelkortet er oprettet.</p>
        ) : null}

        <button
          type="submit"
          disabled={pending}
          className="btn-shape h-11 bg-accent px-5 font-medium text-accent-fg disabled:opacity-60"
        >
          {pending ? "Opretter…" : "Opret stempelkort"}
        </button>
      </form>
    </section>
  );
}

function Liste({ programmer }: { programmer: ProgramRaekke[] }) {
  if (!programmer.length) {
    return (
      <section>
        <h2 className="font-bold tracking-tight">Jeres stempelkort</h2>
        <p className="mt-2 text-sm text-muted">
          Der er ingen stempelkort endnu. Opret det første ovenfor.
        </p>
      </section>
    );
  }

  return (
    <section>
      <h2 className="font-bold tracking-tight">Jeres stempelkort</h2>
      <ul className="mt-3 divide-y divide-border border-y border-border">
        {programmer.map((p) => (
          <StatusRaekke key={p.id} program={p} />
        ))}
      </ul>
    </section>
  );
}

function StatusRaekke({ program }: { program: ProgramRaekke }) {
  const [state, action, pending] = useActionState<StempelkortResultat, FormData>(
    saetStempelkortStatus,
    {},
  );
  const aktiv = program.status === "active";
  // Aktivt kort kan sættes på pause; alt andet (kladde/pause) kan aktiveres.
  const nyStatus = aktiv ? "paused" : "active";
  const knap = aktiv ? "Sæt på pause" : "Aktivér";

  return (
    <li className="flex flex-wrap items-center justify-between gap-3 py-4">
      <div>
        <p className="font-medium">{program.name}</p>
        <p className="text-sm text-muted">
          {program.tilstand}
          {program.required_stamps
            ? ` · ${program.required_stamps} stempler til en belønning`
            : ""}
          {state.error ? (
            <span className="block text-red-600">{state.error}</span>
          ) : null}
        </p>
      </div>
      <form action={action}>
        <input type="hidden" name="program_id" value={program.id} />
        <input type="hidden" name="status" value={nyStatus} />
        <button
          type="submit"
          disabled={pending}
          className="box-shape border border-border px-3 py-1.5 text-sm font-medium transition-colors hover:border-accent disabled:opacity-60"
        >
          {pending ? "Gemmer…" : knap}
        </button>
      </form>
    </li>
  );
}
