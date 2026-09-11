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

  function vaelg(next: string) {
    setValue(next);
    start(async () => {
      const fd = new FormData();
      fd.set("order_id", orderId);
      fd.set("status", next);
      await setOrderStatus(fd);
      router.refresh();
    });
  }

  return (
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
  );
}
