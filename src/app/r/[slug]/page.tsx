import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolvePublicDestination } from "@/lib/stands";
import { deviceTypeFromUA } from "@/lib/utils";
import { ReviewFlow } from "./review-flow";
import { StandLanding } from "./stand-landing";
import { Logo } from "@/components/brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = createAdminClient();
  const { data } = await supabase
    .from("stands")
    .select("company:companies(name)")
    .eq("slug", slug)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const name = (data as any)?.company?.name;
  return { title: name ? `Anmeld ${name}` : "Anmeldelse" };
}

export default async function ReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<{ source?: string }>;
}) {
  const { slug } = await params;
  const { source } = await searchParams;
  const supabase = createAdminClient();

  const { data: stand } = await supabase
    .from("stands")
    .select("*, company:companies(id, name, logo_url)")
    .eq("slug", slug)
    .maybeSingle();

  if (!stand || !stand.is_active) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const company = (stand as any).company as {
    id: string;
    name: string;
    logo_url: string | null;
  };

  // Register the scan (public, service-role).
  const ua = (await headers()).get("user-agent");
  await supabase.from("scans").insert({
    stand_id: stand.id,
    company_id: company.id,
    device_type: deviceTypeFromUA(ua),
    source: source ?? "qr",
  });

  const destination = resolvePublicDestination(stand);

  // Har virksomheden et aktivt stempelkort? Så vises "Hvad vil du?"-landingen.
  const { data: loyaltyProgram } = await supabase
    .from("loyalty_programs")
    .select("id")
    .eq("company_id", company.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();
  const hasLoyalty = Boolean(loyaltyProgram);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-10">
      <div className="box-shape w-full max-w-md border border-border bg-card p-6 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)] sm:p-8">
        {/* Company identity */}
        <div className="mb-6 flex flex-col items-center text-center">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={company.name}
              className="mb-3 h-16 w-16 rounded-xl object-contain"
            />
          ) : (
            <div className="mb-3 grid h-16 w-16 place-items-center rounded-xl bg-accent text-2xl font-bold text-accent-fg">
              {company.name.charAt(0).toUpperCase()}
            </div>
          )}
          <h1 className="text-xl font-semibold tracking-tight">
            {company.name}
          </h1>
          {!hasLoyalty ? (
            <p className="mt-1 text-sm text-muted">Del din oplevelse med os</p>
          ) : null}
        </div>

        {hasLoyalty ? (
          <StandLanding
            enrollHref={`/kort/tilmeld/${slug}`}
            standId={stand.id}
            companyId={company.id}
            publicUrl={destination.url}
            publicLabel={destination.label}
          />
        ) : (
          <ReviewFlow
            standId={stand.id}
            companyId={company.id}
            publicUrl={destination.url}
            publicLabel={destination.label}
          />
        )}
      </div>

      <div className="mt-8">
        <Logo image="light" className="opacity-80" />
      </div>
    </div>
  );
}
