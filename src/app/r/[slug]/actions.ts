"use server";

import { createAdminClient } from "@/lib/supabase/admin";

export interface FeedbackInput {
  standId: string;
  companyId: string;
  rating: number;
  comment?: string;
  customerName?: string;
  customerEmail?: string;
  publicReviewClicked?: boolean;
}

/**
 * Public write path — no authenticated user, so we use the service-role
 * client (bypasses RLS). Validates inputs before insert.
 */
export async function submitFeedback(
  input: FeedbackInput,
): Promise<{ ok: boolean; error?: string }> {
  const rating = Number(input.rating);
  if (!input.standId || !input.companyId) {
    return { ok: false, error: "Ugyldig stander." };
  }
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return { ok: false, error: "Ugyldig vurdering." };
  }

  const supabase = createAdminClient();
  const { error } = await supabase.from("feedback").insert({
    stand_id: input.standId,
    company_id: input.companyId,
    rating,
    comment: input.comment?.trim() || null,
    customer_name: input.customerName?.trim() || null,
    customer_email: input.customerEmail?.trim() || null,
    is_public_review_clicked: Boolean(input.publicReviewClicked),
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
