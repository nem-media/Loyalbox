import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUrl } from "@/lib/site";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { DesignListe } from "./design-liste";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStand } from "./create-stand";
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

      {/* Bestillingen ligger nu INDE PAA den enkelte stander og ikke her.
          Den generelle boks lavede en ordre uden at sige, hvilken QR-adresse
          skiltet skulle trykkes med — og et skilt uden en QR er ingenting.
          Hver stander har sin egen vej ind via "Tilpas og bestil skilt". */}
      {stands && stands.length ? (
        <div className="grid gap-4 sm:grid-cols-2">
          {stands.map((s) => (
            /* Hele kortet er stadig ét link, men "Tilpas" står nu skrevet.
               Et kort, der bare bliver lidt grønt i kanten ved hover, kan
               kunden ikke se er en vej videre — og på en telefon findes hover
               slet ikke, så dér var der INGEN antydning af, at man kunne
               klikke. Knappen er derfor tekst og ikke kun en farve. */
            <Link
              key={s.id}
              href={`/dashboard/standere/${s.id}`}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardBody className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
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

                  <span className="mt-auto flex items-center gap-1.5 pt-1 text-sm font-medium text-accent">
                    Tilpas og bestil skilt
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
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
