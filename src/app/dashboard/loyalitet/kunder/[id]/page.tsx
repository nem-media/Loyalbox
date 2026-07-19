import Link from "next/link";
import { notFound } from "next/navigation";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StampCardPreview } from "@/components/loyalty/stamp-card-preview";
import { TXN_TYPE_LABELS, type TxnType } from "@/lib/loyalty/constants";
import { GiveStampForm } from "./give-stamp-form";
import { GiveDiscount } from "./give-discount";
import {
  RedeemButton,
  ReverseButton,
  RedeemDiscountButton,
} from "./member-actions";

export const metadata = { title: "Kunde" };

const REVERSIBLE: TxnType[] = ["stamp_manual", "stamp_earned", "bonus_stamp"];

export default async function MemberPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const access = await getCompanyAccess();
  if (!access) notFound();

  const supabase = await createClient();
  const { data: member } = await supabase
    .from("loyalty_members")
    .select("*")
    .eq("id", id)
    .eq("company_id", access.companyId)
    .maybeSingle();
  if (!member) notFound();

  const { data: memberships } = await supabase
    .from("loyalty_memberships")
    .select("*")
    .eq("member_id", id)
    .eq("company_id", access.companyId);

  const programIds = (memberships ?? []).map((m) => m.program_id);
  const [{ data: programs }, { data: rewards }, { data: availableRewards }, { data: txns }] =
    await Promise.all([
      programIds.length
        ? supabase.from("loyalty_programs").select("*").in("id", programIds)
        : Promise.resolve({ data: [] as never[] }),
      programIds.length
        ? supabase
            .from("loyalty_rewards")
            .select("*")
            .in("program_id", programIds)
            .eq("is_primary", true)
        : Promise.resolve({ data: [] as never[] }),
      supabase
        .from("customer_rewards")
        .select("*")
        .eq("member_id", id)
        .eq("status", "available"),
      supabase
        .from("loyalty_transactions")
        .select("*")
        .eq("member_id", id)
        .order("created_at", { ascending: false })
        .limit(20),
    ]);

  const programById = new Map((programs ?? []).map((p) => [p.id, p]));
  const rewardByProgram = new Map((rewards ?? []).map((r) => [r.program_id, r]));

  const [{ data: allDiscounts }, { data: memberDiscounts }] = await Promise.all([
    supabase
      .from("discounts")
      .select("id, name, status")
      .eq("company_id", access.companyId),
    supabase
      .from("customer_discounts")
      .select("*")
      .eq("member_id", id)
      .eq("status", "available"),
  ]);
  const activeDiscounts = (allDiscounts ?? []).filter((d) => d.status === "active");
  const discountNameById = new Map((allDiscounts ?? []).map((d) => [d.id, d.name]));

  return (
    <>
      <div className="mb-4">
        <Link href="/dashboard/loyalitet/kunder" className="text-sm text-accent">
          ← Alle kunder
        </Link>
      </div>
      <PageHeader
        title={member.name || "Kunde"}
        description={[member.email, member.phone].filter(Boolean).join(" · ") || undefined}
      />

      <div className="space-y-6">
        {(memberships ?? []).map((ms) => {
          const program = programById.get(ms.program_id);
          const reward = rewardByProgram.get(ms.program_id);
          if (!program) return null;
          const rewardsForMs = (availableRewards ?? []).filter(
            (r) => r.membership_id === ms.id,
          );
          return (
            <Card key={ms.id}>
              <CardBody>
                <div className="grid gap-6 md:grid-cols-2">
                  <StampCardPreview
                    name={program.name}
                    color={program.color ?? "#19375c"}
                    requiredStamps={reward?.required_stamps ?? 10}
                    filled={ms.balance_cache}
                    rewardName={reward?.name ?? null}
                    cardText={program.card_text}
                  />
                  <div>
                    {rewardsForMs.length > 0 ? (
                      <div className="mb-4 box-shape border border-success/30 bg-success/10 p-3">
                        <p className="text-sm font-medium">
                          🎉 Belønning klar til indløsning
                        </p>
                        <div className="mt-2 space-y-2">
                          {rewardsForMs.map((cr) => (
                            <div
                              key={cr.id}
                              className="flex items-center justify-between gap-2"
                            >
                              <span className="text-sm">
                                {reward?.name ?? "Belønning"}
                              </span>
                              <RedeemButton
                                customerRewardId={cr.id}
                                memberId={member.id}
                                rewardName={reward?.name ?? "Belønning"}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ) : null}

                    <p className="text-sm font-medium">Giv stempel</p>
                    <GiveStampForm
                      membershipId={ms.id}
                      maxPerTxn={program.max_stamps_per_txn}
                      showAmount={program.earn_model === "per_amount"}
                    />
                  </div>
                </div>
              </CardBody>
            </Card>
          );
        })}

        {(!memberships || memberships.length === 0) && (
          <Card>
            <CardBody className="text-muted">
              Kunden er ikke tilmeldt noget stempelkort endnu.
            </CardBody>
          </Card>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Rabatter</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            {memberDiscounts && memberDiscounts.length > 0 ? (
              <div className="space-y-2">
                {memberDiscounts.map((cd) => (
                  <div
                    key={cd.id}
                    className="flex items-center justify-between gap-2"
                  >
                    <span className="text-sm">
                      {discountNameById.get(cd.discount_id) ?? "Rabat"}
                      {cd.note ? (
                        <span className="text-muted"> · {cd.note}</span>
                      ) : null}
                    </span>
                    <RedeemDiscountButton
                      customerDiscountId={cd.id}
                      memberId={member.id}
                    />
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted">Ingen aktive rabatter.</p>
            )}
            <div className="border-t border-border pt-4">
              <p className="mb-2 text-sm font-medium">Giv rabat</p>
              <GiveDiscount memberId={member.id} discounts={activeDiscounts} />
            </div>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Historik</CardTitle>
          </CardHeader>
          <CardBody className="pt-2">
            {!txns || txns.length === 0 ? (
              <p className="text-sm text-muted">Ingen aktivitet endnu.</p>
            ) : (
              <ul className="divide-y divide-border">
                {txns.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between gap-3 py-2.5 text-sm"
                  >
                    <div>
                      <span className="font-medium">
                        {TXN_TYPE_LABELS[t.type]}
                      </span>
                      {t.stamps !== 0 ? (
                        <Badge
                          tone={t.stamps > 0 ? "success" : "neutral"}
                          className="ml-2"
                        >
                          {t.stamps > 0 ? `+${t.stamps}` : t.stamps}
                        </Badge>
                      ) : null}
                      <span className="ml-2 text-xs text-muted">
                        {new Date(t.created_at).toLocaleString("da-DK", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                    </div>
                    {REVERSIBLE.includes(t.type) && t.stamps > 0 ? (
                      <ReverseButton transactionId={t.id} memberId={member.id} />
                    ) : null}
                  </li>
                ))}
              </ul>
            )}
          </CardBody>
        </Card>
      </div>
    </>
  );
}
