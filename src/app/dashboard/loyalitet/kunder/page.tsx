import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button, ButtonLink } from "@/components/ui/button";

export const metadata = { title: "Kunder" };

export default async function CustomersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const access = await getCompanyAccess();
  if (!access) return null;

  const supabase = await createClient();
  let query = supabase
    .from("loyalty_members")
    .select("*")
    .eq("company_id", access.companyId)
    .order("created_at", { ascending: false })
    .limit(50);

  const term = (q ?? "").replace(/[,%]/g, "").trim();
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }
  const { data: members } = await query;

  return (
    <>
      <PageHeader
        title="Kunder"
        description="Find en kunde for at give stempler eller indløse belønninger."
        action={
          <ButtonLink href="/dashboard/loyalitet/kunder/ny" size="sm">
            Tilmeld kunde
          </ButtonLink>
        }
      />

      <form className="mb-6 flex gap-2" action="/dashboard/loyalitet/kunder">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Søg på navn, e-mail eller telefon"
        />
        <Button type="submit" variant="outline">
          Søg
        </Button>
      </form>

      {!members || members.length === 0 ? (
        <Card>
          <CardBody className="py-10 text-center text-muted">
            {term ? (
              <p>Ingen kunder matchede søgningen.</p>
            ) : (
              <>
                <p className="font-medium text-foreground">
                  Ingen kunder er tilmeldt endnu.
                </p>
                <p className="mt-1 text-sm">
                  Del QR-koden eller brug din LoyalBox-stander for at få de første
                  medlemmer.
                </p>
              </>
            )}
          </CardBody>
        </Card>
      ) : (
        <div className="divide-y divide-border border-y border-border">
          {members.map((m) => (
            <Link
              key={m.id}
              href={`/dashboard/loyalitet/kunder/${m.id}`}
              className="flex items-center justify-between gap-3 py-3 hover:bg-muted-bg/40"
            >
              <div>
                <p className="font-medium">{m.name || "Uden navn"}</p>
                <p className="text-sm text-muted">
                  {[m.email, m.phone].filter(Boolean).join(" · ") || "—"}
                </p>
              </div>
              <span className="text-sm text-accent">Åbn →</span>
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
