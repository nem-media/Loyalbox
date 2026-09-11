import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { GuideHint } from "@/components/guide";
import { EmptyState } from "@/components/ui/empty-state";
import { StampCardIcon } from "@/components/nav-icons";
import { Badge } from "@/components/ui/badge";
import { ButtonLink } from "@/components/ui/button";
import { EARN_MODEL_LABELS } from "@/lib/loyalty/constants";
import {
  programEffektivStatus,
  EFFEKTIV_STATUS_LABELS,
  type EffektivStatus,
} from "@/lib/loyalty/program-status";

export const metadata = { title: "Programmer" };

// Planlagt og udløbet får deres egen tone, så et kort, der ikke stempler lige
// nu, ikke ligner et aktivt med et grønt mærke.
const statusTone: Record<EffektivStatus, "success" | "neutral" | "warning"> = {
  aktiv: "success",
  planlagt: "warning",
  udloebet: "neutral",
  pauset: "warning",
  kladde: "neutral",
  arkiveret: "neutral",
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
        <EmptyState
          icon={StampCardIcon}
          title="Du har endnu ikke oprettet et stempelkort"
          description={
            <>
              Kom i gang på få minutter — vælg en skabelon og en belønning.
              <GuideHint id="stempelkort" className="mt-2 block" />
            </>
          }
          action={
            <ButtonLink href="/dashboard/loyalitet/programmer/nyt">
              Opret dit første stempelkort
            </ButtonLink>
          }
        />
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {programs.map((p) => {
            const reward = rewardByProgram.get(p.id);
            const effektiv = programEffektivStatus(p);
            return (
              <Link
                key={p.id}
                href={`/dashboard/loyalitet/programmer/${p.id}`}
                className="flex items-center justify-between gap-3 py-4 hover:bg-muted-bg/40"
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{p.name}</span>
                    <Badge tone={statusTone[effektiv]}>
                      {EFFEKTIV_STATUS_LABELS[effektiv]}
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
