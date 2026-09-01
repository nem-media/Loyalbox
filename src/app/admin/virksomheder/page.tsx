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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { SearchIcon } from "@/components/nav-icons";
import { abonnementTilstand, harAbonnement } from "@/lib/abonnement";
import { TILSTAND_ETIKET } from "@/lib/abonnenter";
import { CreateCompany } from "./create-company";

export const metadata = { title: "Admin — Virksomheder" };

/**
 * SØGNINGEN ER IKKE PYNT. Listen hentede HVER eneste virksomhed uden grænse
 * og uden nogen måde at finde én bestemt på — den fungerede, så længe der var
 * tyve, og ville være ubrugelig ved tusind, uden at noget gik i stykker
 * undervejs. Nu er der et loft OG en vej uden om det.
 *
 * Der søges på CVR og telefon ved siden af navn og e-mail, fordi det er dem,
 * man har foran sig: et CVR fra en faktura, et nummer fra en indgående opkald.
 */
const MAKS_RAEKKER = 100;

export default async function AdminCompaniesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(MAKS_RAEKKER);

  const term = (q ?? "").replace(/[,%]/g, "").trim();
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,cvr.ilike.%${term}%,contact_email.ilike.%${term}%,billing_email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const { data: companies } = await query;

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

      <form className="mb-6 flex gap-2" action="/admin/virksomheder">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Søg på navn, CVR, e-mail eller telefon"
        />
        <Button type="submit" variant="outline">
          Søg
        </Button>
      </form>

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
                  <TH>Abonnement</TH>
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
                    {/* KUN for dem, der HAR et abonnement. En tom celle på en
                        engangskøber er sandheden; en "Aktiv"-badge ville love
                        en månedlig betaling, der ikke findes. */}
                    <TD className="whitespace-nowrap">
                      {harAbonnement(c) ? (
                        <Badge tone={TILSTAND_ETIKET[abonnementTilstand(c)].tone}>
                          {TILSTAND_ETIKET[abonnementTilstand(c)].label}
                        </Badge>
                      ) : (
                        <span className="text-muted">–</span>
                      )}
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
      ) : term ? (
        <EmptyState
          icon={SearchIcon}
          title="Ingen virksomheder matchede søgningen"
          description="Prøv med et navn, et CVR-nummer, en e-mail eller et telefonnummer."
        />
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
