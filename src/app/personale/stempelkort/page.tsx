import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { stempelkortIPlan } from "@/lib/loyalty/plan";
import { Logo } from "@/components/brand";
import { PRIVAT_SIDE } from "@/lib/site";
import { signout } from "@/app/(auth)/actions";
import { StempelkortAdmin, type ProgramRaekke } from "./stempelkort-admin";
import type { ProgramStatus } from "@/lib/loyalty/constants";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Stempelkort",
  ...PRIVAT_SIDE,
};

/**
 * Medarbejderens stempelkort-administration.
 *
 * KUN FOR MEDARBEJDERE MED canManage. Ejeren har hele dashboardet og sendes
 * dertil; en medarbejder uden rettigheden sendes tilbage til sin egen forside.
 * Selve handlingerne tjekker canManage IGEN — denne side skjuler kun, den
 * beskytter ikke (UI er ikke sikkerhed).
 *
 * Programmerne læses med service-role, fordi de ligger bag RLS pr. virksomhed
 * (ejer-only). Adgangen er allerede valideret ovenfor, præcis som på
 * /personale, hvor kunderne læses samme vej.
 */
export default async function StaffProgramsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/personale/stempelkort");

  const access = await getCompanyAccess();
  if (!access) redirect("/dashboard");
  if (access.role === "owner") redirect("/dashboard/loyalitet/programmer");
  if (!access.permissions.canManage) redirect("/personale");

  const admin = createAdminClient();

  const iPlan = await stempelkortIPlan(access.companyId);

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", access.companyId)
    .maybeSingle();

  // Programmer, og i et andet opslag den primære belønnings antal stempler.
  // Et typet PostgREST-embed kender ikke relationen her, så vi samler i JS.
  const { data: rows } = await admin
    .from("loyalty_programs")
    .select("id, name, status")
    .eq("company_id", access.companyId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  const programIds = (rows ?? []).map((r) => r.id);
  const { data: rewards } = programIds.length
    ? await admin
        .from("loyalty_rewards")
        .select("program_id, required_stamps")
        .in("program_id", programIds)
        .eq("is_primary", true)
    : { data: [] };

  const kraevPrProgram = new Map(
    (rewards ?? []).map((r) => [r.program_id as string, r.required_stamps as number | null]),
  );

  const programmer: ProgramRaekke[] = (rows ?? []).map((r) => ({
    id: r.id as string,
    name: r.name as string,
    status: r.status as ProgramStatus,
    required_stamps: kraevPrProgram.get(r.id as string) ?? null,
  }));

  return (
    <div className="min-h-screen bg-muted-bg">
      <header className="border-b border-border bg-dark px-4 py-4 text-dark-fg">
        <div className="mx-auto flex max-w-2xl items-center justify-between">
          <Logo image="light" hoejde="h-7" />
          <div className="flex items-center gap-3">
            <span className="text-sm text-white/70">Personale</span>
            <form action={signout}>
              <button className="box-shape px-2.5 py-1.5 text-xs text-white/70 transition-colors hover:bg-white/10 hover:text-white">
                Log ud
              </button>
            </form>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        <Link href="/personale" className="text-sm text-accent">
          ← Tilbage
        </Link>
        <h1 className="mt-2 text-2xl font-bold tracking-tight">Stempelkort</h1>
        <p className="mt-1 text-muted">
          {company?.name
            ? `Opret og styr stempelkortene for ${company.name}.`
            : "Opret og styr jeres stempelkort."}
        </p>

        {iPlan ? (
          <div className="mt-6">
            <StempelkortAdmin programmer={programmer} />
          </div>
        ) : (
          /* Samme regel som ejeren møder: administration kræver et aktivt
             abonnement med stempelkort. Eksisterende kort stempler videre. */
          <p className="mt-6 box-shape border border-secondary/40 bg-secondary/10 p-4 text-sm">
            Stempelkort er ikke med i abonnementet lige nu, så der kan ikke
            oprettes eller ændres kort. Sig til ejeren, hvis det er en fejl.
          </p>
        )}
      </main>
    </div>
  );
}
