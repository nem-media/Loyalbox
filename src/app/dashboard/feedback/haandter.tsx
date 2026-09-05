"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { saetHaandteret, type FormResult } from "../omdoemme/actions";

/**
 * "Markér som fulgt op" på en enkelt feedback.
 *
 * DEN FLYTTER SCOREN, og derfor står der ikke "løst" eller "besvaret". Vi kan
 * ikke måle, om kunden blev glad igen — kun at nogen har taget fat i det. En
 * knap, der lod som om den vidste mere, ville gøre en af de fire dele af
 * Reputation Score til et ønske frem for en måling.
 *
 * KAN FORTRYDES. Et fejlklik må ikke kunne pynte på tallet permanent.
 */
export function Haandter({
  id,
  haandteret,
}: {
  id: string;
  haandteret: boolean;
}) {
  const [state, action, pending] = useActionState<FormResult, FormData>(
    saetHaandteret,
    {},
  );

  return (
    <form action={action} className="flex items-center gap-2">
      <input type="hidden" name="id" value={id} />
      {haandteret ? <input type="hidden" name="fortryd" value="1" /> : null}
      <Button type="submit" size="sm" variant="ghost" disabled={pending}>
        {pending
          ? "Gemmer…"
          : haandteret
            ? "Fortryd opfølgning"
            : "Markér som fulgt op"}
      </Button>
      {state.error ? (
        <span className="text-xs text-danger">{state.error}</span>
      ) : null}
    </form>
  );
}
