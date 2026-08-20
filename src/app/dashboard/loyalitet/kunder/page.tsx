import Link from "next/link";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { GuideHint } from "@/components/guide";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchIcon, StaffIcon } from "@/components/nav-icons";
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
        term ? (
          <EmptyState
            icon={SearchIcon}
            title="Ingen kunder matchede søgningen"
            description="Prøv med et navn, en e-mail eller et telefonnummer."
          />
        ) : (
          <EmptyState
            icon={StaffIcon}
            title="Ingen kunder er tilmeldt endnu"
            description={
              <>
                Kunderne tilmelder sig selv ved at scanne QR-koden på din
                stander — eller du kan oprette kortet ved disken.
                <GuideHint id="kunder" className="mt-2 block" />
              </>
            }
            action={
              <ButtonLink href="/dashboard/loyalitet/kunder/ny" variant="outline">
                Opret kunde ved disken
              </ButtonLink>
            }
          />
        )
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
