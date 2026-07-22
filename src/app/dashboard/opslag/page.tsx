import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Composer } from "./composer";

export const metadata = { title: "Opslag" };

export interface OpslagReview {
  id: string;
  comment: string;
  customerName: string | null;
  createdAt: string;
}

export default async function OpslagPage() {
  const user = await getCurrentUser();
  const company = user?.company ?? null;

  let reviews: OpslagReview[] = [];
  let fiveStarCount = 0;

  if (company) {
    const supabase = await createClient();
    const [{ data: rows }, { count }] = await Promise.all([
      supabase
        .from("feedback")
        .select("id, comment, customer_name, created_at")
        .eq("company_id", company.id)
        .eq("rating", 5)
        .order("created_at", { ascending: false }),
      supabase
        .from("feedback")
        .select("*", { count: "exact", head: true })
        .eq("company_id", company.id)
        .eq("rating", 5),
    ]);
    reviews = (rows ?? [])
      .filter((r) => (r.comment ?? "").trim().length > 0)
      .map((r) => ({
        id: r.id,
        comment: r.comment as string,
        customerName: r.customer_name,
        createdAt: r.created_at,
      }));
    fiveStarCount = count ?? 0;
  }

  return (
    <>
      <PageHeader
        title="Opslag"
        description="Lav et delbart opslag ud af jeres 5-stjernede anmeldelser — vælg tekst og baggrund, download og del selv."
      />
      {company ? (
        <Composer
          companyName={company.name}
          reviews={reviews}
          fiveStarCount={fiveStarCount}
        />
      ) : (
        <Card>
          <CardBody className="text-sm text-muted">
            Opret din virksomhed først for at lave opslag.
          </CardBody>
        </Card>
      )}
    </>
  );
}
