import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";
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

      <Card>
        <CardBody className="p-0">
          {companies && companies.length ? (
            <table className="w-full text-sm">
              <thead className="border-b border-border text-left text-muted">
                <tr>
                  <th className="p-4 font-medium">Navn</th>
                  <th className="p-4 font-medium">Kontakt</th>
                  <th className="p-4 font-medium">Oprettet</th>
                </tr>
              </thead>
              <tbody>
                {companies.map((c) => (
                  <tr
                    key={c.id}
                    className="border-b border-border last:border-0 hover:bg-accent/5"
                  >
                    <td className="p-4">
                      <Link
                        href={`/admin/virksomheder/${c.id}`}
                        className="font-medium text-accent"
                      >
                        {c.name}
                      </Link>
                    </td>
                    <td className="p-4 text-muted">
                      {c.contact_email ?? "–"}
                    </td>
                    <td className="p-4 text-muted">
                      {formatDate(c.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-8 text-center text-muted">
              Ingen virksomheder endnu.
            </p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
