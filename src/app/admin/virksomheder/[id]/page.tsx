import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { CompanyInfo } from "./company-info";
import { AdminStandLinks } from "./admin-stand-links";
import { AddStand } from "./add-stand";
import { PlanSelect } from "./plan-select";

export const metadata = { title: "Admin — Virksomhed" };

export default async function AdminCompanyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!company) notFound();

  const [{ data: stands }, { data: feedback }, { count: scans }] =
    await Promise.all([
      supabase
        .from("stands")
        .select("*")
        .eq("company_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("feedback")
        .select("*")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("company_id", id),
    ]);

  return (
    <>
      <div className="mb-4">
        <Link href="/admin/virksomheder" className="text-sm text-accent">
          ← Alle virksomheder
        </Link>
      </div>
      <PageHeader
        title={company.name}
        description={`${scans ?? 0} scanninger · ${stands?.length ?? 0} standere`}
      />

      <Card className="mb-6">
        <CardBody className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <CardTitle>Plan / abonnement</CardTitle>
            <p className="mt-1 text-sm text-muted">
              Op- eller nedgrader kundens løsning. Ændringen slår igennem med det
              samme i kundens kontrolpanel.
            </p>
          </div>
          <PlanSelect companyId={company.id} plan={company.plan} />
        </CardBody>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Virksomhedsinfo</CardTitle>
          </CardHeader>
          <CardBody>
            <CompanyInfo company={company} />
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Seneste feedback</CardTitle>
          </CardHeader>
          <CardBody className="pt-0">
            <FeedbackList items={feedback ?? []} />
          </CardBody>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Standere & links</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <AddStand companyId={company.id} />
          {stands && stands.length ? (
            stands.map((s) => <AdminStandLinks key={s.id} stand={s} />)
          ) : (
            <p className="text-sm text-muted">Ingen standere endnu.</p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
