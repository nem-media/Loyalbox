"use client";

import { useRef } from "react";
import { setOrderStatus } from "../actions";
import { ORDER_STATUS_LABELS } from "@/lib/constants";

const STATUSES = [
  "new",
  "needs_onboarding",
  "ready_for_production",
  "shipped",
  "cancelled",
] as const;

export function OrderStatusSelect({
  orderId,
  status,
}: {
  orderId: string;
  status: string;
}) {
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form ref={formRef} action={setOrderStatus}>
      <input type="hidden" name="order_id" value={orderId} />
      <select
        name="status"
        defaultValue={status}
        onChange={() => formRef.current?.requestSubmit()}
        className="box-shape h-9 border border-border bg-background px-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABELS[s]}
          </option>
        ))}
      </select>
    </form>
  );
}
