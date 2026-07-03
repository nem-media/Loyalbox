import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";

export const metadata = { title: "Admin — Feedback" };

export default async function AdminFeedbackPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("feedback")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  return (
    <>
      <PageHeader
        title="Al feedback"
        description="Seneste feedback fra alle virksomheder."
      />
      <Card>
        <CardBody>
          <FeedbackList items={data ?? []} />
        </CardBody>
      </Card>
    </>
  );
}
