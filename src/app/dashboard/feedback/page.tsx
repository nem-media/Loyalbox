import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { tierCan, type Tier } from "@/lib/constants";

export const metadata = { title: "Feedback" };

export default async function FeedbackPage() {
  const user = await getCurrentUser();
  const company = user!.company;
  const plan = (company?.plan ?? "basic") as Tier;

  if (!tierCan(plan, "feedbackInbox")) {
    return (
      <>
        <PageHeader
          title="Feedback"
          description="Al privat feedback fra dine kunder — også dem der ikke gik videre til en offentlig anmeldelse."
        />
        <UpgradeNotice
          requiredTier="pro"
          title="Privat feedback-indbakke"
          description="Fang kritik internt, før den bliver en offentlig 1-stjerne. Den private feedback-indbakke er en del af Pro-abonnementet."
        />
      </>
    );
  }

  let items: Awaited<ReturnType<typeof loadFeedback>> = [];
  if (company) items = await loadFeedback(company.id);

  return (
    <>
      <PageHeader
        title="Feedback"
        description="Al privat feedback fra dine kunder — også dem der ikke gik videre til en offentlig anmeldelse."
      />
      <Card>
        <CardBody>
          <FeedbackList items={items} />
        </CardBody>
      </Card>
    </>
  );
}

async function loadFeedback(companyId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback")
    .select("*")
    .eq("company_id", companyId)
    .order("created_at", { ascending: false });
  return data ?? [];
}
