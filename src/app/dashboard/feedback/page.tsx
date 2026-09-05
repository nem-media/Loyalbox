import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { UpgradeNotice } from "@/components/upgrade-notice";
import { tierCan, type Tier } from "@/lib/constants";
import { Haandter } from "./haandter";

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
          description="Feedback kunden har valgt at sende direkte til dig i stedet for at skrive offentligt. Den private feedback-indbakke er en del af Pro-abonnementet."
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
          {/*
            OPFØLGNING KUN PÅ DE UTILFREDSE. Knappen vises ved 1-2 stjerner,
            fordi det er dem, Reputation Score måler håndteringen af — og fordi
            en "markér som fulgt op" på en femstjernet ros er støj på en liste,
            man skal kunne skimme.
          */}
          <FeedbackList
            items={items}
            handling={(f) =>
              f.rating <= 2 ? (
                <Haandter id={f.id} haandteret={Boolean(f.haandteret_den)} />
              ) : null
            }
          />
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
