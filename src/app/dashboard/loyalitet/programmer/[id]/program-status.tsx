"use client";

import { useRef } from "react";
import { setProgramStatus } from "../../actions";
import {
  PROGRAM_STATUS_LABELS,
  type ProgramStatus,
} from "@/lib/loyalty/constants";

const STATUSES: ProgramStatus[] = ["draft", "active", "paused", "archived"];

export function ProgramStatusControl({
  programId,
  status,
}: {
  programId: string;
  status: ProgramStatus;
}) {
  const formRef = useRef<HTMLFormElement>(null);
  return (
    <form ref={formRef} action={setProgramStatus}>
      <input type="hidden" name="program_id" value={programId} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="box-shape h-9 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {PROGRAM_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
