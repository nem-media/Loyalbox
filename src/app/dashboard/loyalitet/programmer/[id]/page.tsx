import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { StampCardPreview } from "@/components/loyalty/stamp-card-preview";
import {
  EARN_MODEL_LABELS,
  REWARD_TYPE_LABELS,
  type RewardType,
} from "@/lib/loyalty/constants";
import { ProgramStatusControl } from "./program-status";

export const metadata = { title: "Stempelkort" };

export default async function ProgramDetailPage({
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

  return (
    <>
      <div className="mb-4">
        <Link href="/dashboard/loyalitet/programmer" className="text-sm text-accent">
          ← Alle programmer
        </Link>
      </div>
      <PageHeader
        title={program.name}
        description={program.description ?? undefined}
        action={
          <ProgramStatusControl programId={program.id} status={program.status} />
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Sådan virker kortet</CardTitle>
            </CardHeader>
            <CardBody>
              <dl className="grid gap-3 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-muted">Optjening</dt>
                  <dd className="font-medium">
                    {EARN_MODEL_LABELS[program.earn_model]} ·{" "}
                    {program.stamps_per_earn} stempel/optjening
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Belønning</dt>
                  <dd className="font-medium">
                    {reward
                      ? `${reward.name} (${REWARD_TYPE_LABELS[reward.type as RewardType]}) efter ${reward.required_stamps} stempler`
                      : "Ingen belønning"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Ved indløsning</dt>
                  <dd className="font-medium">
                    {program.reset_on_redeem
                      ? program.keep_overflow
                        ? "Behold overskydende stempler"
                        : "Nulstil kortet til 0"
                      : "Bevar saldo"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted">Sikkerhed</dt>
                  <dd className="font-medium">
                    Maks {program.max_stamps_per_txn}/transaktion
                    {program.max_stamps_per_day
                      ? `, ${program.max_stamps_per_day}/dag`
                      : ""}
                    {program.min_minutes_between
                      ? `, min. ${program.min_minutes_between} min mellem`
                      : ""}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>
        </div>

        <div className="lg:sticky lg:top-24 lg:self-start">
          <StampCardPreview
            name={program.name}
            color={program.color ?? "#19375c"}
            requiredStamps={reward?.required_stamps ?? 10}
            filled={0}
            rewardName={reward?.name ?? null}
            cardText={program.card_text}
          />
        </div>
      </div>
    </>
  );
}
