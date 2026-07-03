"use client";

import { useRef } from "react";
import { setCompanyPlan } from "../../actions";
import { TIER_LABELS, TIER_ORDER } from "@/lib/constants";

export function PlanSelect({
  companyId,
  plan,
}: {
  companyId: string;
  plan: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setCompanyPlan}>
      <input type="hidden" name="company_id" value={companyId} />
      <select
        name="plan"
        defaultValue={plan}
        onChange={() => formRef.current?.requestSubmit()}
        className="box-shape h-9 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {TIER_ORDER.map((t) => (
          <option key={t} value={t}>
            {TIER_LABELS[t]}
          </option>
        ))}
      </select>
    </form>
  );
}
