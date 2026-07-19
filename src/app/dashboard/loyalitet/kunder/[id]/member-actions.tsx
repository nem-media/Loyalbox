"use client";

import {
  redeemRewardAction,
  reverseStampAction,
  redeemDiscountAction,
} from "../../actions";

/** Indløs-knap med bekræftelse (irreversibel handling). */
export function RedeemButton({
  customerRewardId,
  memberId,
  rewardName,
}: {
  customerRewardId: string;
  memberId: string;
  rewardName: string;
}) {
  return (
    <form
      action={redeemRewardAction}
      onSubmit={(e) => {
        if (!confirm(`Indløs "${rewardName}"? Handlingen kan ikke fortrydes.`)) {
          e.preventDefault();
        }
      }}
    >
      <input type="hidden" name="customer_reward_id" value={customerRewardId} />
      <input type="hidden" name="member_id" value={memberId} />
      <button className="btn-shape bg-accent px-3 py-1.5 text-sm font-medium text-accent-fg hover:bg-accent-hover">
        Indløs
      </button>
    </form>
  );
}

/** Tilbagefør-knap med bekræftelse. */
export function ReverseButton({
  transactionId,
  memberId,
}: {
  transactionId: string;
  memberId: string;
}) {
  return (
    <form
      action={reverseStampAction}
      onSubmit={(e) => {
        if (!confirm("Tilbagefør denne transaktion?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="transaction_id" value={transactionId} />
      <input type="hidden" name="member_id" value={memberId} />
      <button className="text-xs text-muted hover:text-danger">Tilbagefør</button>
    </form>
  );
}

/** Indløs en tildelt rabat. */
export function RedeemDiscountButton({
  customerDiscountId,
  memberId,
}: {
  customerDiscountId: string;
  memberId: string;
}) {
  return (
    <form
      action={redeemDiscountAction}
      onSubmit={(e) => {
        if (!confirm("Marker rabatten som brugt?")) e.preventDefault();
      }}
    >
      <input type="hidden" name="customer_discount_id" value={customerDiscountId} />
      <input type="hidden" name="member_id" value={memberId} />
      <button className="btn-shape border border-border px-3 py-1.5 text-sm hover:bg-muted-bg">
        Indløs
      </button>
    </form>
  );
}
