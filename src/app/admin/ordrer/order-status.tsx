"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { setOrderStatus } from "../actions";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUSES = [
  "new",
  "needs_onboarding",
  "ready_for_production",
  "shipped",
  "cancelled",
] as const;

type OrderStatus = (typeof STATUSES)[number];

/**
 * Skift af en ordres status.
 *
 * STYRET VÆRDI + router.refresh() — samme rettelse som ProgramStatusControl:
 * den ustyrede dropdown fik ikke sidens øvrige visning til at følge med, før
 * man opdaterede manuelt. Nu opdateres værdien lokalt straks, og
 * `router.refresh()` henter de server-renderede dele på ny.
 */
export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const router = useRouter();
  const [value, setValue] = useState(status);
  const [pending, start] = useTransition();

  const [fejl, setFejl] = useState<string | null>(null);

  /*
   * VÆRDIEN SÆTTES STRAKS — OG RULLES TILBAGE, HVIS DET IKKE GIK.
   *
   * Handlingen svarede før `void`, og ingen så efter, om det lykkedes.
   * Afviste databasen værdien (målt: en status uden for enum'en giver 400),
   * blev dropdown'en STÅENDE på det, der ikke blev gemt: `router.refresh()`
   * henter godt nok serverens udgave, men den nulstiller ikke en `useState`,
   * der allerede er sat. Admin så altså en ordre som "Afsendt", mens basen
   * sagde noget andet — samme klasse som logo-previewet, der viste en fil,
   * formularen ikke havde.
   */
  function vaelg(next: string) {
    const forrige = value;
    setValue(next);
    setFejl(null);
    start(async () => {
      const fd = new FormData();
      fd.set("order_id", orderId);
      fd.set("status", next);
      const svar = await setOrderStatus({}, fd);
      if (svar.error) {
        setValue(forrige);
        setFejl(svar.error);
        return;
      }
      router.refresh();
    });
  }

  return (
    <div>
      <select
        value={value}
        disabled={pending}
        onChange={(e) => vaelg(e.target.value)}
        className="box-shape h-9 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent disabled:opacity-60"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s as OrderStatus]}
          </option>
        ))}
      </select>
      {/* Fejlen SKAL kunne ses. En status, der ikke blev gemt, må ikke se ud
          som om den blev det. */}
      {fejl ? <p className="mt-1 text-xs text-danger">{fejl}</p> : null}
    </div>
  );
}
