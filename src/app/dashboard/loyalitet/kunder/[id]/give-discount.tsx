"use client";

import { useActionState } from "react";
import { grantDiscountAction, type FormResult } from "../../actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { REVIEW_INDEPENDENCE_NOTICE } from "@/lib/loyalty/constants";

/**
 * Giv en kunde en rabat (fx kompensation via feedback recovery). Viser tydeligt
 * at rabatten aldrig må betinges af en offentlig anmeldelse.
 */
export function GiveDiscount({
  memberId,
  discounts,
}: {
  memberId: string;
  discounts: { id: string; name: string }[];
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    grantDiscountAction,
    {},
  );

  if (discounts.length === 0) {
    return (
      <p className="text-sm text-muted">
        Opret en rabat under Rabatter for at kunne give den til kunder.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <input type="hidden" name="member_id" value={memberId} />
      <div className="flex flex-wrap items-end gap-2">
        <select
          name="discount_id"
          defaultValue=""
          className="box-shape h-11 min-w-48 border border-border bg-background px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
        >
          <option value="" disabled>
            Vælg rabat
          </option>
          {discounts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.name}
            </option>
          ))}
        </select>
        <Button type="submit" variant="outline" disabled={pending}>
          {pending ? "Giver…" : "Giv rabat"}
        </Button>
      </div>
      <Input name="note" placeholder="Note (valgfri, fx årsag)" />

      <p className="text-xs text-muted">⚠️ {REVIEW_INDEPENDENCE_NOTICE}</p>

      {state.error ? <p className="text-sm text-danger">{state.error}</p> : null}
      {state.ok ? (
        <p className="text-sm text-success">Rabatten er givet til kunden.</p>
      ) : null}
    </form>
  );
}
