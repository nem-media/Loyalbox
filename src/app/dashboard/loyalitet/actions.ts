"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyAccess } from "@/lib/loyalty/access";
import {
  giveStamp,
  redeemReward,
  reverseStamp,
  grantDiscount,
  redeemDiscount,
} from "@/lib/loyalty/service";
import type {
  EarnModel,
  ProgramStatus,
  RewardType,
  DiscountType,
  DiscountStatus,
} from "@/lib/loyalty/constants";

export interface FormResult {
  ok?: boolean;
  error?: string;
}

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
function int(v: FormDataEntryValue | null, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

/**
 * Opretter et stempelkort (program + primær belønning). Config skrives af ejer
 * via RLS. Kun brugere med canManage må oprette.
 */
export async function createProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) {
    return { error: "Du har ikke adgang til at oprette stempelkort." };
  }

  const name = str(formData.get("name"));
  if (!name) return { error: "Giv stempelkortet et navn." };

  const requiredStamps = int(formData.get("required_stamps"), 10);
  if (requiredStamps < 1) {
    return { error: "Antal stempler til belønning skal være mindst 1." };
  }
  const stampsPerEarn = Math.max(1, int(formData.get("stamps_per_earn"), 1));
  const earnModel = str(formData.get("earn_model")) as EarnModel;
  const rewardType = str(formData.get("reward_type")) as RewardType;
  const status = (str(formData.get("status")) || "draft") as ProgramStatus;

  const supabase = await createClient();
  const { data: program, error } = await supabase
    .from("loyalty_programs")
    .insert({
      company_id: access.companyId,
      name,
      internal_name: str(formData.get("internal_name")) || null,
      description: str(formData.get("description")) || null,
      status,
      earn_model: earnModel,
      stamps_per_earn: stampsPerEarn,
      amount_per_stamp:
        earnModel === "per_amount" ? numOrNull(formData.get("amount_per_stamp")) : null,
      start_date: str(formData.get("start_date")) || null,
      end_date: str(formData.get("end_date")) || null,
      reset_on_redeem: bool(formData.get("reset_on_redeem")),
      keep_overflow: bool(formData.get("keep_overflow")),
      color: str(formData.get("color")) || "#19375c",
      icon: str(formData.get("icon")) || "star",
      card_text: str(formData.get("card_text")) || null,
      max_stamps_per_txn: Math.max(1, int(formData.get("max_stamps_per_txn"), 1)),
      max_stamps_per_day: numOrNull(formData.get("max_stamps_per_day")) ?? null,
      min_minutes_between: Math.max(0, int(formData.get("min_minutes_between"), 0)),
      require_staff_confirm: bool(formData.get("require_staff_confirm")),
      stamps_expire: bool(formData.get("stamps_expire")),
      stamp_expiry_days: numOrNull(formData.get("stamp_expiry_days")) ?? null,
    })
    .select("id")
    .single();

  if (error || !program) {
    return { error: error?.message ?? "Kunne ikke oprette stempelkortet." };
  }

  if (rewardType !== "none") {
    const rewardName = str(formData.get("reward_name")) || "Belønning";
    const { error: rewardErr } = await supabase.from("loyalty_rewards").insert({
      company_id: access.companyId,
      program_id: program.id,
      name: rewardName,
      description: str(formData.get("reward_description")) || null,
      type: rewardType,
      value: numOrNull(formData.get("reward_value")),
      required_stamps: requiredStamps,
      terms: str(formData.get("reward_terms")) || null,
      is_primary: true,
      status: "active",
    });
    if (rewardErr) return { error: rewardErr.message };
  }

  revalidatePath("/dashboard/loyalitet/programmer");
  redirect(`/dashboard/loyalitet/programmer/${program.id}`);
}

/** Ændrer et programs status (kladde/aktivt/pauset/arkiveret). */
export async function setProgramStatus(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) return;

  const id = str(formData.get("program_id"));
  const status = str(formData.get("status")) as ProgramStatus;
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("loyalty_programs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", access.companyId);

  revalidatePath("/dashboard/loyalitet/programmer");
  revalidatePath(`/dashboard/loyalitet/programmer/${id}`);
}

/**
 * Tilmelder en kunde til et program (opretter medlem + medlemskab + samtykke).
 * Medlemsdata skrives via service-role efter adgangsvalidering.
 */
export async function enrollMember(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang." };

  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const programId = str(formData.get("program_id"));
  if (!name && !email && !phone) {
    return { error: "Udfyld mindst navn, e-mail eller telefon." };
  }
  if (!programId) return { error: "Vælg et stempelkort." };
  if (!bool(formData.get("consent_terms"))) {
    return { error: "Kunden skal acceptere vilkårene." };
  }

  const admin = createAdminClient();

  // Programmet skal tilhøre virksomheden.
  const { data: program } = await admin
    .from("loyalty_programs")
    .select("id, company_id")
    .eq("id", programId)
    .maybeSingle();
  if (!program || program.company_id !== access.companyId) {
    return { error: "Ugyldigt stempelkort." };
  }

  const { data: member, error: memberErr } = await admin
    .from("loyalty_members")
    .insert({
      company_id: access.companyId,
      name: name || null,
      email: email || null,
      phone: phone || null,
    })
    .select("id")
    .single();
  if (memberErr || !member) {
    return { error: memberErr?.message ?? "Kunne ikke oprette kunden." };
  }

  await admin.from("loyalty_memberships").insert({
    company_id: access.companyId,
    program_id: programId,
    member_id: member.id,
  });

  // Samtykke: vilkår (påkrævet) + markedsføring (valgfrit, aldrig obligatorisk).
  await admin.from("consent_records").insert({
    company_id: access.companyId,
    member_id: member.id,
    type: "terms",
    granted: true,
    channel: "dashboard",
    source: "staff_enroll",
  });
  if (bool(formData.get("consent_marketing"))) {
    await admin.from("consent_records").insert({
      company_id: access.companyId,
      member_id: member.id,
      type: "marketing",
      granted: true,
      channel: "dashboard",
      source: "staff_enroll",
    });
  }

  revalidatePath("/dashboard/loyalitet/kunder");
  redirect(`/dashboard/loyalitet/kunder/${member.id}`);
}

export interface StampActionState {
  ok?: boolean;
  error?: string;
  balance?: number;
  have?: number;
  required?: number;
  reached?: boolean;
  rewardEarned?: boolean;
  rewardName?: string | null;
  alreadyProcessed?: boolean;
}

/** Giver stempel til et medlemskab via ledger-kernen (idempotent). */
export async function giveStampAction(
  _prev: StampActionState,
  formData: FormData,
): Promise<StampActionState> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang." };

  const membershipId = str(formData.get("membership_id"));
  const stamps = Math.max(1, int(formData.get("stamps"), 1));
  const reference = str(formData.get("reference")) || null;
  const note = str(formData.get("note")) || null;
  const amount = numOrNull(formData.get("amount"));
  if (!membershipId) return { error: "Ugyldigt medlemskab." };

  const result = await giveStamp({
    access,
    membershipId,
    stamps,
    type: "stamp_manual",
    source: "staff",
    reference,
    note,
    amount,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/loyalitet/kunder");
  return {
    ok: true,
    balance: result.balance,
    have: result.progress.have,
    required: result.progress.required,
    reached: result.progress.reached,
    rewardEarned: result.rewardEarned,
    rewardName: result.rewardName,
    alreadyProcessed: result.alreadyProcessed,
  };
}

/** Indløser en optjent belønning. */
export async function redeemRewardAction(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access) return;
  const id = str(formData.get("customer_reward_id"));
  const memberId = str(formData.get("member_id"));
  if (!id) return;
  await redeemReward(access, id);
  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
}

/** Tilbagefører en transaktion (fejlrettelse). */
export async function reverseStampAction(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access) return;
  const id = str(formData.get("transaction_id"));
  const memberId = str(formData.get("member_id"));
  if (!id) return;
  await reverseStamp(access, id);
  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
}

// ---------------------------------------------------------------------------
// Rabatter
// ---------------------------------------------------------------------------

/** Opretter en rabatdefinition (ejer via RLS). */
export async function createDiscount(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) {
    return { error: "Du har ikke adgang til at oprette rabatter." };
  }
  const name = str(formData.get("name"));
  if (!name) return { error: "Giv rabatten et navn." };

  const supabase = await createClient();
  const { error } = await supabase.from("discounts").insert({
    company_id: access.companyId,
    name,
    description: str(formData.get("description")) || null,
    type: str(formData.get("type")) as DiscountType,
    value: numOrNull(formData.get("value")) ?? 0,
    min_purchase: numOrNull(formData.get("min_purchase")),
    max_discount: numOrNull(formData.get("max_discount")),
    per_customer_limit: numOrNull(formData.get("per_customer_limit")),
    total_limit: numOrNull(formData.get("total_limit")),
    requires_approval: bool(formData.get("requires_approval")),
    status: (str(formData.get("status")) || "active") as DiscountStatus,
  });
  if (error) return { error: error.message };

  revalidatePath("/dashboard/loyalitet/rabatter");
  redirect("/dashboard/loyalitet/rabatter");
}

/** Ændrer en rabats status. */
export async function setDiscountStatus(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) return;
  const id = str(formData.get("discount_id"));
  const status = str(formData.get("status")) as DiscountStatus;
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("discounts")
    .update({ status })
    .eq("id", id)
    .eq("company_id", access.companyId);
  revalidatePath("/dashboard/loyalitet/rabatter");
}

/** Tildeler en rabat til en kunde (fx kompensation via feedback recovery). */
export async function grantDiscountAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang." };
  const memberId = str(formData.get("member_id"));
  const discountId = str(formData.get("discount_id"));
  if (!memberId || !discountId) return { error: "Vælg en rabat." };

  const result = await grantDiscount({
    access,
    memberId,
    discountId,
    note: str(formData.get("note")) || null,
    source: "staff",
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
  return { ok: true };
}

/** Indløser en tildelt rabat. */
export async function redeemDiscountAction(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access) return;
  const id = str(formData.get("customer_discount_id"));
  const memberId = str(formData.get("member_id"));
  if (!id) return;
  await redeemDiscount(access, id);
  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
}
