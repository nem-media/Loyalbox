"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { justerStanderLager, saetStanderLager } from "../actions";

type Lager = { sort: number; hvid: number };

const FARVER: { farve: keyof Lager; navn: string }[] = [
  { farve: "sort", navn: "Sorte standere" },
  { farve: "hvid", navn: "Hvide standere" },
];

/**
 * Intern lagerstyring.
 *
 * Styret + `router.refresh()` (samme mønster som statusdropdownen): tallet
 * opdateres straks, uden at siden skal genindlæses. Et negativt tal er en
 * restordre og vises rødt — ikke som en fejl, men som noget at bestille hjem.
 */
export function LagerStyring({ start }: { start: Lager }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      {FARVER.map((f) => (
        <FarveKort key={f.farve} farve={f.farve} navn={f.navn} antal={start[f.farve]} />
      ))}
    </div>
  );
}

function FarveKort({
  farve,
  navn,
  antal,
}: {
  farve: keyof Lager;
  navn: string;
  antal: number;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [delta, setDelta] = useState("1");
  const [nytTal, setNytTal] = useState("");
  const [fejl, setFejl] = useState<string | null>(null);

  function kør(handling: () => Promise<{ error?: string }>) {
    setFejl(null);
    start(async () => {
      const r = await handling();
      if (r?.error) setFejl(r.error);
      else router.refresh();
    });
  }

  function juster(retning: 1 | -1) {
    const n = parseInt(delta || "0", 10);
    if (!Number.isFinite(n) || n === 0) {
      setFejl("Angiv et antal.");
      return;
    }
    const fd = new FormData();
    fd.set("farve", farve);
    fd.set("delta", String(retning * Math.abs(n)));
    kør(() => justerStanderLager({}, fd));
  }

  function sæt() {
    if (nytTal.trim() === "") {
      setFejl("Angiv et tal.");
      return;
    }
    const fd = new FormData();
    fd.set("farve", farve);
    fd.set("antal", nytTal);
    kør(async () => {
      const r = await saetStanderLager({}, fd);
      if (!r?.error) setNytTal("");
      return r;
    });
  }

  return (
    <div className="box-shape border border-border bg-card p-5">
      <p className="text-sm text-muted">{navn}</p>
      <p
        className={
          "mt-1 text-4xl font-bold tabular-nums " +
          (antal < 0 ? "text-danger" : "")
        }
      >
        {antal}
        <span className="ml-2 text-base font-normal text-muted">på lager</span>
      </p>
      {antal < 0 ? (
        <p className="mt-1 text-xs text-danger">
          Restordre — der er solgt flere, end der var på lager.
        </p>
      ) : null}

      {/* Tilføj / fjern et antal */}
      <div className="mt-4 flex items-center gap-2">
        <input
          type="number"
          min={1}
          value={delta}
          onChange={(e) => setDelta(e.target.value)}
          disabled={pending}
          className="box-shape h-9 w-20 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="button"
          onClick={() => juster(1)}
          disabled={pending}
          className="btn-shape h-9 bg-accent px-3 text-sm font-medium text-accent-fg disabled:opacity-60"
        >
          Tilføj
        </button>
        <button
          type="button"
          onClick={() => juster(-1)}
          disabled={pending}
          className="box-shape h-9 border border-border px-3 text-sm font-medium transition-colors hover:border-accent disabled:opacity-60"
        >
          Fjern
        </button>
      </div>

      {/* Ret beholdningen til et bestemt tal */}
      <div className="mt-3 flex items-center gap-2">
        <input
          type="number"
          placeholder="Ret til…"
          value={nytTal}
          onChange={(e) => setNytTal(e.target.value)}
          disabled={pending}
          className="box-shape h-9 w-24 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        />
        <button
          type="button"
          onClick={sæt}
          disabled={pending}
          className="box-shape h-9 border border-border px-3 text-sm font-medium transition-colors hover:border-accent disabled:opacity-60"
        >
          Gem
        </button>
      </div>

      {fejl ? <p className="mt-2 text-sm text-danger">{fejl}</p> : null}
    </div>
  );
}
