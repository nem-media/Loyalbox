"use client";

import { useActionState } from "react";
import { changePlan, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  getPlan,
  TIER_LABELS,
  TIER_ORDER,
  type Tier,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className="mt-0.5 h-4 w-4 shrink-0 text-accent"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function PlanPicker({ currentPlan }: { currentPlan: Tier }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    changePlan,
    {},
  );

  return (
    <form action={action}>
      <div className="grid gap-6 md:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const plan = getPlan(tier);
          const isCurrent = tier === currentPlan;
          const currentIndex = TIER_ORDER.indexOf(currentPlan);
          const tierIndex = TIER_ORDER.indexOf(tier);
          const isUpgrade = tierIndex > currentIndex;

          return (
            <Card
              key={tier}
              className={isCurrent ? "relative border-accent ring-1 ring-accent" : "relative"}
            >
              {isCurrent ? (
                <div className="absolute -top-3 left-5">
                  <Badge tone="accent">Din plan</Badge>
                </div>
              ) : null}
              <div className="flex h-full flex-col p-6">
                <h3 className="text-lg font-semibold tracking-tight">
                  {TIER_LABELS[tier]}
                </h3>
                <p className="mt-1 text-sm text-muted">{plan.tagline}</p>
                <div className="mt-4 flex items-baseline gap-1">
                  {plan.price === 0 ? (
                    <span className="text-3xl font-semibold tracking-tight">
                      Gratis
                    </span>
                  ) : (
                    <>
                      <span className="text-3xl font-semibold tracking-tight">
                        {formatCurrency(plan.price)}
                      </span>
                      <span className="text-sm text-muted">/md ex moms</span>
                    </>
                  )}
                </div>
                <ul className="mt-6 space-y-2 text-sm">
                  {plan.features.map((f) => (
                    <li key={f} className="flex gap-2">
                      <CheckIcon />
                      <span>{f}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-6 pt-2">
                  {isCurrent ? (
                    <Button type="button" variant="outline" className="w-full" disabled>
                      Nuværende plan
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      name="plan"
                      value={tier}
                      variant={isUpgrade ? "primary" : "outline"}
                      className="w-full"
                      disabled={pending}
                    >
                      {pending
                        ? "Skifter…"
                        : isUpgrade
                          ? `Opgrader til ${TIER_LABELS[tier]}`
                          : `Skift til ${TIER_LABELS[tier]}`}
                    </Button>
                  )}
                </div>
              </div>
            </Card>
          );
        })}
      </div>

      {state.error ? (
        <p className="mt-4 text-sm text-danger">{state.error}</p>
      ) : null}
    </form>
  );
}
