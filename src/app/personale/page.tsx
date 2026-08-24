import Link from "next/link";
import { redirect } from "next/navigation";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand";
import { PRIVAT_SIDE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Personale",
  ...PRIVAT_SIDE,
};

/**
 * Medarbejderens arbejdsflade.
 *
 * Før denne side landede en medarbejder på /dashboard, som kræver en
 * virksomhed, og fik beskeden "Du har endnu ingen virksomhed. Kontakt support"
 * — altså en opfordring til at ringe til supporten for at kunne passe sit
 * arbejde. Dashboardet er ejer-only og kan ikke bruges af personale.
 *
 * Herfra kan medarbejderen finde en kundes kort og komme direkte til
 * personale-panelet på /kort/[token], hvor stemplingen faktisk foregår.
 * Kortene læses med service-role, fordi de ligger bag RLS pr. virksomhed —
 * adgangen er allerede valideret af getCompanyAccess ovenfor.
 */
export default async function StaffPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/personale");

  const access = await getCompanyAccess();
  if (!access) redirect("/dashboard");
  // Ejeren har hele dashboardet og skal ikke stå på personalesiden.
  if (access.role === "owner") redirect("/dashboard/loyalitet/kunder");

  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("name, logo_url")
    .eq("id", access.companyId)
    .maybeSingle();

  const search = (q ?? "").trim();
  let members: {
    id: string;
    name: string | null;
    phone: string | null;
    public_token: string;
  }[] = [];

  if (search) {
    const { data } = await admin
      .from("loyalty_members")
      .select("id, name, phone, public_token")
      .eq("company_id", access.companyId)
      .or(`name.ilike.%${search}%,phone.ilike.%${search}%`)
      .order("created_at", { ascending: false })
      .limit(20);
    members = data ?? [];
  }

  return (
    <div className="min-h-screen bg-muted-bg">
      <header className="border-b border-border bg-dark px-4 py-4 text-dark-fg">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Logo image="light" hoejde="h-7" />
          <span className="text-sm text-white/70">Personale</span>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <h1 className="text-2xl font-bold tracking-tight">
          {company?.name ?? "Din arbejdsplads"}
        </h1>
        <p className="mt-1 text-muted">
          Du er logget ind som personale. Herfra kan du finde en kundes
          stempelkort.
        </p>

        {/* Den hurtigste vej: kunden har kortet fremme */}
        <div className="mt-6 box-shape border border-accent/30 bg-accent/5 p-5">
          <h2 className="font-bold tracking-tight">Sådan stempler du</h2>
          <ol className="mt-2 space-y-1 text-sm text-muted">
            <li>1. Bed kunden vise sit stempelkort på telefonen.</li>
            <li>2. Scan koden på kortet med dit kamera.</li>
            <li>3. Tryk på stempelknappen, der kun vises for personale.</li>
          </ol>
          <p className="mt-3 text-sm text-muted">
            Har kunden ikke kortet ved hånden, kan du finde det herunder.
          </p>
        </div>

        {/* Søgning efter kunde */}
        <form className="mt-6" action="/personale">
          <label htmlFor="q" className="text-sm font-medium">
            Find en kunde
          </label>
          <div className="mt-2 flex gap-2">
            <input
              id="q"
              name="q"
              defaultValue={search}
              placeholder="Navn eller telefonnummer"
              className="box-shape h-11 flex-1 border border-border bg-background px-3 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            />
            <button
              type="submit"
              className="btn-shape h-11 bg-accent px-5 font-medium text-accent-fg"
            >
              Søg
            </button>
          </div>
        </form>

        {search ? (
          members.length ? (
            <ul className="mt-4 divide-y divide-border border-y border-border">
              {members.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/kort/${m.public_token}`}
                    className="flex items-center justify-between gap-4 py-4"
                  >
                    <span>
                      <span className="font-medium">
                        {m.name || "Uden navn"}
                      </span>
                      {m.phone ? (
                        <span className="block text-sm text-muted">
                          {m.phone}
                        </span>
                      ) : null}
                    </span>
                    <span className="text-sm font-medium text-accent">
                      Åbn kort →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted">
              Ingen kunder matchede “{search}”. Prøv et fornavn eller de sidste
              cifre i telefonnummeret.
            </p>
          )
        ) : null}
      </main>
    </div>
  );
}
