/**
 * Loyalitets-ledger — server-only kerneservice.
 *
 * Alle stempel-/belønnings-mutationer går herigennem via service-role, EFTER at
 * kalderen er valideret med getCompanyAccess(). Saldo = sum(stamps) i ledgeren;
 * historikken er uforanderlig (reversering/nulstilling er nye negative rækker).
 *
 * Idempotens: en `reference` pr. medlemskab kan kun bruges én gang (unikt DB-
 * indeks) → dobbelt-submit giver ikke dobbelt stempel.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyAccess } from "@/lib/loyalty/access";
import { stampProgress, redemptionStampDelta, type StampProgress } from "@/lib/loyalty/balance";
import type { TxnSource, TxnType } from "@/lib/loyalty/constants";

type Admin = ReturnType<typeof createAdminClient>;

export type StampResult =
  | {
      ok: true;
      balance: number;
      progress: StampProgress;
      rewardEarned: boolean;
      rewardName: string | null;
      alreadyProcessed: boolean;
    }
  | { ok: false; error: string };

export type SimpleResult =
  | { ok: true; balance: number }
  | { ok: false; error: string };

export type ActionResult = { ok: true } | { ok: false; error: string };

const todayStartIso = () => new Date().toISOString().slice(0, 10) + "T00:00:00.000Z";

/** Genberegner saldo fra ledgeren og opdaterer cachen. */
async function recompute(admin: Admin, membershipId: string): Promise<number> {
  const { data } = await admin
    .from("loyalty_transactions")
    .select("stamps")
    .eq("membership_id", membershipId);
  const balance = (data ?? []).reduce((s, r) => s + (r.stamps ?? 0), 0);
  await admin
    .from("loyalty_memberships")
    .update({ balance_cache: balance })
    .eq("id", membershipId);
  return balance;
}

async function logAudit(
  admin: Admin,
  access: CompanyAccess,
  action: string,
  targetType: string,
  targetId: string | null,
  meta: Record<string, unknown> = {},
) {
  await admin.from("loyalty_audit_log").insert({
    company_id: access.companyId,
    actor_user_id: access.actorUserId,
    actor_employee_id: access.employeeId,
    action,
    target_type: targetType,
    target_id: targetId,
    meta,
  });
}

export interface GiveStampParams {
  access: CompanyAccess;
  membershipId: string;
  stamps: number;
  type?: Extract<TxnType, "stamp_manual" | "bonus_stamp" | "stamp_earned">;
  source?: TxnSource;
  reference?: string | null;
  note?: string | null;
  amount?: number | null;
  locationId?: string | null;
  device?: string | null;
}

/** Giver et eller flere stempler, håndhæver programreglerne og udløser belønning. */
export async function giveStamp(params: GiveStampParams): Promise<StampResult> {
  const {
    access,
    membershipId,
    stamps,
    type = "stamp_manual",
    source = "staff",
    reference = null,
    note = null,
    amount = null,
    locationId = null,
    device = null,
  } = params;

  if (!access.permissions.canStamp) {
    return { ok: false, error: "Du har ikke rettighed til at give stempler." };
  }
  if (!Number.isInteger(stamps) || stamps < 1) {
    return { ok: false, error: "Ugyldigt antal stempler." };
  }

  const admin = createAdminClient();

  const { data: membership } = await admin
    .from("loyalty_memberships")
    .select("*")
    .eq("id", membershipId)
    .maybeSingle();
  if (!membership || membership.company_id !== access.companyId) {
    return { ok: false, error: "Medlemskabet blev ikke fundet." };
  }
  if (membership.status !== "active") {
    return { ok: false, error: "Stempelkortet er ikke aktivt." };
  }

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("*")
    .eq("id", membership.program_id)
    .maybeSingle();
  if (!program || program.company_id !== access.companyId) {
    return { ok: false, error: "Programmet blev ikke fundet." };
  }
  if (program.status !== "active") {
    return { ok: false, error: "Programmet er ikke aktivt." };
  }
  if (stamps > program.max_stamps_per_txn) {
    return {
      ok: false,
      error: `Der kan højst gives ${program.max_stamps_per_txn} stempler pr. gang.`,
    };
  }

  // Daglig grænse
  if (program.max_stamps_per_day != null) {
    const { data: today } = await admin
      .from("loyalty_transactions")
      .select("stamps")
      .eq("membership_id", membershipId)
      .gt("stamps", 0)
      .gte("created_at", todayStartIso());
    const usedToday = (today ?? []).reduce((s, r) => s + (r.stamps ?? 0), 0);
    if (usedToday + stamps > program.max_stamps_per_day) {
      return { ok: false, error: "Den daglige grænse for stempler er nået." };
    }
  }

  // Minimumstid mellem stempler
  if (program.min_minutes_between > 0) {
    const { data: last } = await admin
      .from("loyalty_transactions")
      .select("created_at")
      .eq("membership_id", membershipId)
      .gt("stamps", 0)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (last) {
      const mins = (Date.now() - new Date(last.created_at).getTime()) / 60000;
      if (mins < program.min_minutes_between) {
        return {
          ok: false,
          error: `Denne kunde har allerede fået et stempel for nylig. Vent ${program.min_minutes_between} minutter mellem stempler.`,
        };
      }
    }
  }

  // Indsæt transaktion (idempotent via unikt (membership_id, reference)-indeks)
  const { error: insertErr } = await admin.from("loyalty_transactions").insert({
    company_id: access.companyId,
    program_id: program.id,
    membership_id: membershipId,
    member_id: membership.member_id,
    employee_id: access.employeeId,
    location_id: locationId,
    type,
    stamps,
    amount,
    source,
    reference,
    note,
    device,
  });

  if (insertErr) {
    // Dobbelt-submit: referencen er allerede brugt → returnér nuværende status.
    if (insertErr.code === "23505") {
      const balance = await recompute(admin, membershipId);
      const { data: reward } = await admin
        .from("loyalty_rewards")
        .select("required_stamps")
        .eq("program_id", program.id)
        .eq("is_primary", true)
        .maybeSingle();
      return {
        ok: true,
        balance,
        progress: stampProgress(balance, reward?.required_stamps ?? balance),
        rewardEarned: false,
        rewardName: null,
        alreadyProcessed: true,
      };
    }
    return { ok: false, error: "Kunne ikke gemme stemplet. Prøv igen." };
  }

  const balance = await recompute(admin, membershipId);

  // Belønning: udløs hvis tærskel nået og ingen udestående belønning findes.
  let rewardEarned = false;
  let rewardName: string | null = null;
  const { data: reward } = await admin
    .from("loyalty_rewards")
    .select("*")
    .eq("program_id", program.id)
    .eq("is_primary", true)
    .eq("status", "active")
    .maybeSingle();

  if (reward && balance >= reward.required_stamps) {
    const { data: existing } = await admin
      .from("customer_rewards")
      .select("id")
      .eq("membership_id", membershipId)
      .eq("status", "available")
      .limit(1)
      .maybeSingle();
    if (!existing) {
      const expiresAt = reward.validity_days
        ? new Date(Date.now() + reward.validity_days * 86400000).toISOString()
        : null;
      await admin.from("customer_rewards").insert({
        company_id: access.companyId,
        program_id: program.id,
        membership_id: membershipId,
        member_id: membership.member_id,
        reward_id: reward.id,
        status: "available",
        expires_at: expiresAt,
      });
      await admin.from("loyalty_transactions").insert({
        company_id: access.companyId,
        program_id: program.id,
        membership_id: membershipId,
        member_id: membership.member_id,
        type: "reward_earned",
        stamps: 0,
        source: "system",
        reward_id: reward.id,
      });
      rewardEarned = true;
      rewardName = reward.name;
    }
  }

  await logAudit(admin, access, "give_stamp", "membership", membershipId, {
    stamps,
    balance,
    rewardEarned,
  });

  return {
    ok: true,
    balance,
    progress: stampProgress(balance, reward?.required_stamps ?? balance),
    rewardEarned,
    rewardName,
    alreadyProcessed: false,
  };
}

/** Tilbagefører en tidligere transaktion (fejlrettelse). */
export async function reverseStamp(
  access: CompanyAccess,
  transactionId: string,
): Promise<SimpleResult> {
  if (!access.permissions.canStamp) {
    return { ok: false, error: "Du har ikke rettighed til at rette stempler." };
  }
  const admin = createAdminClient();

  const { data: original } = await admin
    .from("loyalty_transactions")
    .select("*")
    .eq("id", transactionId)
    .maybeSingle();
  if (!original || original.company_id !== access.companyId) {
    return { ok: false, error: "Transaktionen blev ikke fundet." };
  }
  if (!original.membership_id) {
    return { ok: false, error: "Transaktionen kan ikke tilbageføres." };
  }

  const { data: already } = await admin
    .from("loyalty_transactions")
    .select("id")
    .eq("reversal_of", transactionId)
    .limit(1)
    .maybeSingle();
  if (already) {
    return { ok: false, error: "Transaktionen er allerede tilbageført." };
  }

  await admin.from("loyalty_transactions").insert({
    company_id: access.companyId,
    program_id: original.program_id,
    membership_id: original.membership_id,
    member_id: original.member_id,
    employee_id: access.employeeId,
    type: "reversed",
    stamps: -(original.stamps ?? 0),
    source: "system",
    reversal_of: transactionId,
    reason: "Tilbageført af personale",
  });

  const balance = await recompute(admin, original.membership_id);
  await logAudit(admin, access, "reverse_stamp", "transaction", transactionId, {
    balance,
  });
  return { ok: true, balance };
}

/** Indløser en optjent belønning og nulstiller kortet efter programmets regler. */
export async function redeemReward(
  access: CompanyAccess,
  customerRewardId: string,
): Promise<SimpleResult> {
  if (!access.permissions.canRedeem) {
    return { ok: false, error: "Du har ikke rettighed til at indløse belønninger." };
  }
  const admin = createAdminClient();

  const { data: cr } = await admin
    .from("customer_rewards")
    .select("*")
    .eq("id", customerRewardId)
    .maybeSingle();
  if (!cr || cr.company_id !== access.companyId) {
    return { ok: false, error: "Belønningen blev ikke fundet." };
  }
  if (cr.status !== "available") {
    return { ok: false, error: "Belønningen er allerede indløst." };
  }

  const [{ data: program }, { data: reward }] = await Promise.all([
    admin.from("loyalty_programs").select("*").eq("id", cr.program_id).maybeSingle(),
    admin.from("loyalty_rewards").select("*").eq("id", cr.reward_id).maybeSingle(),
  ]);
  if (!program || !reward) {
    return { ok: false, error: "Programmet blev ikke fundet." };
  }

  // Markér indløst
  await admin
    .from("customer_rewards")
    .update({
      status: "redeemed",
      redeemed_at: new Date().toISOString(),
      redeemed_by: access.employeeId,
    })
    .eq("id", customerRewardId);

  await admin.from("loyalty_transactions").insert({
    company_id: access.companyId,
    program_id: program.id,
    membership_id: cr.membership_id,
    member_id: cr.member_id,
    employee_id: access.employeeId,
    type: "reward_redeemed",
    stamps: 0,
    source: "staff",
    reward_id: reward.id,
  });

  // Nulstil kortet, hvis konfigureret
  if (program.reset_on_redeem) {
    const current = await recompute(admin, cr.membership_id);
    const delta = redemptionStampDelta(
      current,
      reward.required_stamps,
      program.keep_overflow,
    );
    if (delta !== 0) {
      await admin.from("loyalty_transactions").insert({
        company_id: access.companyId,
        program_id: program.id,
        membership_id: cr.membership_id,
        member_id: cr.member_id,
        type: "card_reset",
        stamps: delta,
        source: "system",
        reward_id: reward.id,
      });
    }
  }

  const balance = await recompute(admin, cr.membership_id);
  await logAudit(admin, access, "redeem_reward", "customer_reward", customerRewardId, {
    balance,
  });
  return { ok: true, balance };
}

/**
 * Tildeler en rabat til en kunde (fx som kompensation via feedback recovery).
 * VIGTIGT: en rabat må aldrig betinges af en offentlig anmeldelse — der findes
 * bevidst intet felt, der kobler dette til en review-handling.
 */
export async function grantDiscount(params: {
  access: CompanyAccess;
  memberId: string;
  discountId: string;
  note?: string | null;
  feedbackId?: string | null;
  source?: TxnSource;
}): Promise<ActionResult> {
  const { access, memberId, discountId, note = null, feedbackId = null } = params;
  if (!access.permissions.canDiscount) {
    return { ok: false, error: "Du har ikke rettighed til at give rabatter." };
  }
  const admin = createAdminClient();

  const { data: discount } = await admin
    .from("discounts")
    .select("*")
    .eq("id", discountId)
    .maybeSingle();
  if (!discount || discount.company_id !== access.companyId) {
    return { ok: false, error: "Rabatten blev ikke fundet." };
  }
  if (discount.status !== "active") {
    return { ok: false, error: "Rabatten er ikke aktiv." };
  }

  const { data: member } = await admin
    .from("loyalty_members")
    .select("id, company_id")
    .eq("id", memberId)
    .maybeSingle();
  if (!member || member.company_id !== access.companyId) {
    return { ok: false, error: "Kunden blev ikke fundet." };
  }

  // Grænser
  if (discount.per_customer_limit != null) {
    const { count } = await admin
      .from("customer_discounts")
      .select("*", { count: "exact", head: true })
      .eq("member_id", memberId)
      .eq("discount_id", discountId);
    if ((count ?? 0) >= discount.per_customer_limit) {
      return {
        ok: false,
        error: "Kunden har allerede fået denne rabat det maksimale antal gange.",
      };
    }
  }
  if (discount.total_limit != null) {
    const { count } = await admin
      .from("customer_discounts")
      .select("*", { count: "exact", head: true })
      .eq("discount_id", discountId);
    if ((count ?? 0) >= discount.total_limit) {
      return { ok: false, error: "Kampagnens samlede grænse er nået." };
    }
  }

  await admin.from("customer_discounts").insert({
    company_id: access.companyId,
    member_id: memberId,
    discount_id: discountId,
    status: "available",
    granted_by: access.employeeId,
    note,
    feedback_id: feedbackId,
  });

  await logAudit(admin, access, "grant_discount", "member", memberId, {
    discountId,
    feedbackId,
  });
  return { ok: true };
}

/** Indløser en tildelt rabat. */
export async function redeemDiscount(
  access: CompanyAccess,
  customerDiscountId: string,
): Promise<ActionResult> {
  if (!access.permissions.canRedeem) {
    return { ok: false, error: "Du har ikke rettighed til at indløse rabatter." };
  }
  const admin = createAdminClient();

  const { data: cd } = await admin
    .from("customer_discounts")
    .select("*")
    .eq("id", customerDiscountId)
    .maybeSingle();
  if (!cd || cd.company_id !== access.companyId) {
    return { ok: false, error: "Rabatten blev ikke fundet." };
  }
  if (cd.status !== "available") {
    return { ok: false, error: "Rabatten er allerede indløst." };
  }

  await admin
    .from("customer_discounts")
    .update({ status: "redeemed", redeemed_at: new Date().toISOString() })
    .eq("id", customerDiscountId);

  await logAudit(admin, access, "redeem_discount", "customer_discount", customerDiscountId, {});
  return { ok: true };
}
