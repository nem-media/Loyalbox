import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUrl } from "@/lib/site";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStand } from "./create-stand";

export const metadata = { title: "Standere" };

export default async function StandsPage() {
  const user = await getCurrentUser();
  const company = user!.company;
  const supabase = await createClient();

  const { data: stands } = company
    ? await supabase
        .from("stands")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  return (
    <>
      <PageHeader
        title="Standere"
        description="Hver stander har sit eget dynamiske link og QR-kode."
      />

      <Card className="mb-6">
        <CardBody>
          <CreateStand />
        </CardBody>
      </Card>

      {stands && stands.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {stands.map((s) => (
            <Link key={s.id} href={`/dashboard/standere/${s.id}`}>
              <Card className="h-full transition-colors hover:border-accent">
                <CardBody className="space-y-3">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge tone={s.is_active ? "success" : "neutral"}>
                      {s.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-accent">
                    {reviewUrl(s.slug)}
                  </p>
                  <p className="text-xs text-muted">
                    Destination: {s.destination_type}
                  </p>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <Card>
          <CardBody className="text-center text-muted">
            Ingen standere endnu. Opret din første ovenfor.
          </CardBody>
        </Card>
      )}
    </>
  );
}
