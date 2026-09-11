"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setProgramStatus } from "../../actions";
import {
  PROGRAM_STATUS_LABELS,
  type ProgramStatus,
} from "@/lib/loyalty/constants";

const STATUSES: ProgramStatus[] = ["draft", "active", "paused", "archived"];

/**
 * Skift af programmets status.
 *
 * STYRET VÆRDI + router.refresh(). Før var feltet ustyret med `defaultValue`
 * og submittede en server-action, hvis revalidering ikke slog igennem i
 * klienten: den valgte status stod rigtigt i selve dropdownen, men resten af
 * siden (mærket "Tilstand nu", listen) blev hængende på den gamle værdi,
 * indtil man opdaterede manuelt. Nu sættes værdien lokalt med det samme, og
 * `router.refresh()` henter de server-renderede dele på ny, så alt følges ad.
 */
export function ProgramStatusControl({
  programId,
  status,
}: {
  programId: string;
  status: ProgramStatus;
}) {
  const router = useRouter();
  const [value, setValue] = useState<ProgramStatus>(status);
  const [pending, start] = useTransition();

  function vaelg(next: ProgramStatus) {
    setValue(next);
    start(async () => {
      const fd = new FormData();
      fd.set("program_id", programId);
      fd.set("status", next);
      await setProgramStatus(fd);
      router.refresh();
    });
  }

  return (
    <select
      value={value}
      disabled={pending}
      onChange={(e) => vaelg(e.target.value as ProgramStatus)}
      className="box-shape h-9 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {PROGRAM_STATUS_LABELS[s]}
        </option>
      ))}
    </select>
  );
}
