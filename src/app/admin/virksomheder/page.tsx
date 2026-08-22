import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { StoreIcon } from "@/components/nav-icons";
import { visCvr } from "@/lib/cvr";
import { TIER_LABELS, type Tier } from "@/lib/constants";
import { CreateCompany } from "./create-company";

export const metadata = { title: "Admin — Virksomheder" };

export default async function AdminCompaniesPage() {
  const supabase = await createClient();
  const { data: companies } = await supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false });

  return (
    <>
      <PageHeader
        title="Virksomheder"
        description="Opret og administrer alle virksomheder på platformen."
      />

      <Card className="mb-6">
        <CardBody>
          <CreateCompany />
        </CardBody>
      </Card>

      {companies && companies.length ? (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Navn</TH>
                  <TH>CVR</TH>
                  <TH>Kontakt</TH>
                  <TH>Niveau</TH>
                  <TH>Oprettet</TH>
                </TR>
              </THead>
              <TBody>
                {companies.map((c) => (
                  <TR key={c.id}>
                    <TD>
                      <Link
                        href={`/admin/virksomheder/${c.id}`}
                        className="font-medium text-accent hover:underline"
                      >
                        {c.name}
                      </Link>
                      {/* En virksomhed uden bruger er bestilt uden konto. Det
                          er værd at kunne se: de har intet login og kan ikke
                          hjælpes ved at "prøve at logge ind". */}
                      {c.user_id ? null : (
                        <span className="mt-0.5 block text-xs text-muted">
                          Uden konto
                        </span>
                      )}
                    </TD>
                    <TD className="whitespace-nowrap text-muted">
                      {c.cvr ? visCvr(c.cvr) : "–"}
                    </TD>
                    <TD className="text-muted">{c.contact_email ?? "–"}</TD>
                    <TD>
                      <Badge tone={c.plan === "basic" ? "neutral" : "accent"}>
                        {TIER_LABELS[c.plan as Tier]}
                      </Badge>
                    </TD>
                    <TD className="whitespace-nowrap text-muted">
                      {formatDate(c.created_at)}
                    </TD>
                  </TR>
                ))}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      ) : (
        <EmptyState
          icon={StoreIcon}
          title="Ingen virksomheder endnu"
          description="En virksomhed oprettes, når nogen laver en konto eller bestiller en stander uden konto. Du kan også oprette en manuelt ovenfor."
        />
      )}
    </>
  );
}
