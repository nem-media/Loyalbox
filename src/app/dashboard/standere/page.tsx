import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUrl } from "@/lib/site";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { DesignListe } from "./design-liste";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStand } from "./create-stand";
import { BestilStander } from "@/components/bestil-stander";
import { GuideHint } from "@/components/guide";
import { EmptyState } from "@/components/ui/empty-state";
import { StandIcon } from "@/components/nav-icons";

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
        description="Hver stander har sit eget dynamiske link og QR-kode. Det fysiske skilt bestilles for sig."
      />

      <GuideHint id="standere" className="mb-6" />

      <Card className="mb-4">
        <CardBody>
          <CreateStand />
        </CardBody>
      </Card>

      {/* Det, der oprettes ovenfor, er en QR-adresse og en side. Skiltet til
          disken er en vare, og den vej manglede helt. */}
      <BestilStander className="mb-6" />

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
        <EmptyState
          icon={StandIcon}
          title="Ingen standere endnu"
          description="Opret din første ovenfor — giv den et navn du kan kende den på, fx “Disken”. Bagefter sætter du de links på, kunden skal kunne vælge imellem, og bestiller det fysiske skilt."
        />
      )}

      {/* Designet hørte før til et selvstændigt menupunkt med SAMME ikon som
          Standere. Det giver kun mening sammen med den stander, det trykkes
          på, så det hører hjemme her. */}
      {company ? (
        <Sektion titel="Design" id="design">
          <DesignListe companyId={company.id} />
        </Sektion>
      ) : null}
    </>
  );
}
