import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { ProgramWizard, type ProgramInitial } from "../../program-wizard";
import type { EarnModel, RewardType } from "@/lib/loyalty/constants";

export const metadata = { title: "Rediger stempelkort" };

/** DB-værdi → wizardens strengfelt. null/undefined bliver til "". */
const s = (v: unknown): string => (v == null ? "" : String(v));

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getCompanyAccess();
  if (!access) notFound();

  const supabase = await createClient();
  const { data: program } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("id", id)
    .eq("company_id", access.companyId)
    .maybeSingle();
  if (!program) notFound();

  const { data: reward } = await supabase
    .from("loyalty_rewards")
    .select("*")
    .eq("program_id", program.id)
    .eq("is_primary", true)
    .maybeSingle();

  const user = await getCurrentUser();

  const initial: ProgramInitial = {
    id: program.id,
    name: program.name,
    internalName: s(program.internal_name),
    cardText: s(program.card_text),
    startDate: s(program.start_date),
    endDate: s(program.end_date),
    earnModel: (program.earn_model as EarnModel) ?? "per_purchase",
    stampsPerEarn: s(program.stamps_per_earn) || "1",
    amountPerStamp: s(program.amount_per_stamp),
    // Uden en primær belønning redigeres kortet som "ingen belønning".
    rewardType: (reward?.type as RewardType) ?? "none",
    rewardName: s(reward?.name),
    requiredStamps: s(reward?.required_stamps) || "10",
    rewardDescription: s(reward?.description),
    rewardValue: s(reward?.value),
    color: s(program.color) || "#1e1c1a",
    icon: s(program.icon) || "star",
    resetOnRedeem: program.reset_on_redeem ?? true,
    keepOverflow: program.keep_overflow ?? false,
    maxPerTxn: s(program.max_stamps_per_txn) || "1",
    maxPerDay: s(program.max_stamps_per_day),
    minMinutes: s(program.min_minutes_between) || "0",
    requireStaffConfirm: program.require_staff_confirm ?? true,
    stampsExpire: program.stamps_expire ?? false,
    stampExpiryDays: s(program.stamp_expiry_days),
  };

  return (
    <>
      <div className="mb-4">
        <Link
          href={`/dashboard/loyalitet/programmer/${program.id}`}
          className="text-sm text-accent"
        >
          ← Tilbage til kortet
        </Link>
      </div>
      <PageHeader
        title="Rediger stempelkort"
        description="Ret alt — også start- og slutdato. Ændringerne gemmes, når du er igennem."
      />
      <ProgramWizard
        mode="edit"
        initial={initial}
        companyName={user?.company?.name ?? null}
      />
    </>
  );
}
