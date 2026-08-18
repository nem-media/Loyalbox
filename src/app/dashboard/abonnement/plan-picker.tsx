"use client";

import { useActionState } from "react";
import { changePlan, type FormResult } from "../actions";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import {
  CAPABILITY_LABELS,
  CAPABILITY_ORDER,
  TIER_LABELS,
  TIER_ORDER,
  tierCan,
  type Tier,
} from "@/lib/constants";

/**
 * Skifter adgangsniveau. Viser bevidst INGEN priser: abonnementet købes som en
 * del af et produkt, og priserne står på produktkortene ovenfor. Tidligere stod
 * her 79 og 149 kr./md, som ikke svarede til noget, kunden kunne købe.
 *
 * NÅR BETALING ÅBNER: denne komponent og `changePlan` skal væk. I dag kan
 * enhver butiksejer sætte sig selv til Pro med ét klik — det er med vilje,
 * mens der ikke kan betales, men det bliver et hul i omsætningen den dag der
 * kan. Niveauet skal derefter sættes af Stripe-webhooken, ikke af brugeren.
 */
export function PlanPicker({ currentPlan }: { currentPlan: Tier }) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    changePlan,
    {},
  );

  return (
    <form action={action}>
      <div className="grid gap-4 md:grid-cols-3">
        {TIER_ORDER.map((tier) => {
          const isCurrent = tier === currentPlan;
          const unlocks = CAPABILITY_ORDER.filter((cap) => tierCan(tier, cap));

          return (
            <Card
              key={tier}
              className={
                isCurrent ? "relative border-accent ring-1 ring-accent" : "relative"
              }
            >
              {isCurrent ? (
                <div className="absolute -top-3 left-5">
                  <Badge tone="accent">Dit niveau</Badge>
                </div>
              ) : null}
              <div className="flex h-full flex-col p-5">
                <h3 className="font-bold tracking-tight">
                  {TIER_LABELS[tier]}
                </h3>

                <ul className="mt-3 flex-1 space-y-1.5 text-sm text-muted">
                  {unlocks.length ? (
                    unlocks.map((cap) => (
                      <li key={cap}>{CAPABILITY_LABELS[cap]}</li>
                    ))
                  ) : (
                    <li>Standeren med dit eget link</li>
                  )}
                </ul>

                <div className="mt-5">
                  {isCurrent ? (
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      disabled
                    >
                      Nuværende
                    </Button>
                  ) : (
                    <Button
                      type="submit"
                      name="plan"
                      value={tier}
                      variant="outline"
                      className="w-full"
                      disabled={pending}
                    >
                      {pending ? "Skifter…" : `Skift til ${TIER_LABELS[tier]}`}
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
