import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { EnrollForm } from "./enroll-form";

export const metadata = { title: "Tilmeld kunde" };

export default async function EnrollPage() {
  const access = await getCompanyAccess();
  if (!access) return null;

  const supabase = await createClient();
  const { data: programs } = await supabase
    .from("loyalty_programs")
    .select("id, name")
    .eq("company_id", access.companyId)
    .in("status", ["active", "draft"])
    .order("created_at", { ascending: false });

  return (
    <>
      <div className="mb-4">
        <Link href="/dashboard/loyalitet/kunder" className="text-sm text-accent">
          ← Alle kunder
        </Link>
      </div>
      <PageHeader
        title="Tilmeld kunde"
        description="Opret et digitalt stempelkort til kunden."
      />

      {!programs || programs.length === 0 ? (
        <Card>
          <CardBody className="py-8 text-center text-muted">
            <p className="font-medium text-foreground">
              Du skal først oprette et stempelkort.
            </p>
            <div className="mt-4">
              <ButtonLink href="/dashboard/loyalitet/programmer/nyt">
                Opret stempelkort
              </ButtonLink>
            </div>
          </CardBody>
        </Card>
      ) : (
        <EnrollForm programs={programs} />
      )}
    </>
  );
}
