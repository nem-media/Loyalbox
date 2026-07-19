import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import {
  PROGRAM_STATUS_LABELS,
  EARN_MODEL_LABELS,
  type ProgramStatus,
} from "@/lib/loyalty/constants";

export const metadata = { title: "Programmer" };

const statusTone: Record<ProgramStatus, "success" | "neutral" | "warning"> = {
  active: "success",
  draft: "neutral",
  paused: "warning",
  archived: "neutral",
};

export default async function ProgramsPage() {
  const access = await getCompanyAccess();
  if (!access) return null;

  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("loyalty_programs")
    .select("*")
    .eq("company_id", access.companyId)
    .order("created_at", { ascending: false });

  const { data: rewards } = await supabase
    .from("loyalty_rewards")
    .select("program_id, name, required_stamps")
    .eq("company_id", access.companyId)
    .eq("is_primary", true);
  const rewardByProgram = new Map(
    (rewards ?? []).map((r) => [r.program_id, r]),
  );

  return (
    <>
      <PageHeader
        title="Programmer"
        description="Dine stempelkort."
        action={
          <ButtonLink href="/dashboard/loyalitet/programmer/nyt" size="sm">
            Opret stempelkort
          </ButtonLink>
        }
      />

      {!programs || programs.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center">
            <p className="font-medium">Du har endnu ikke oprettet et stempelkort.</p>
            <p className="mt-1 text-sm text-muted">
              Kom i gang på få minutter — vælg en skabelon og en belønning.
            </p>
            <div className="mt-4">
              <ButtonLink href="/dashboard/loyalitet/programmer/nyt">
                Opret dit første stempelkort
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {programs.map((p) => {
            const reward = rewardByProgram.get(p.id);
            return (
              <Link
                key={p.id}
                href={`/dashboard/loyalitet/programmer/${p.id}`}
                className="flex items-center justify-between gap-3 py-4 hover:bg-muted-bg/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <Badge tone={statusTone[p.status]}>
                      {PROGRAM_STATUS_LABELS[p.status]}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted">
                    {EARN_MODEL_LABELS[p.earn_model]}
                    {reward
                      ? ` · ${reward.name} efter ${reward.required_stamps} stempler`
                      : ""}
                  </p>
                </div>
                <span className="text-sm text-accent">Åbn →</span>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}
