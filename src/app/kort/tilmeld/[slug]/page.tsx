import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand";
import { SelfEnrollForm } from "./self-enroll-form";
import { PRIVAT_SIDE } from "@/lib/site";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Opret stempelkort",
  ...PRIVAT_SIDE,
};

export default async function EnrollCardPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const admin = createAdminClient();

  const { data: stand } = await admin
    .from("stands")
    .select("company_id, is_active, company:companies(name, logo_url)")
    .eq("slug", slug)
    .maybeSingle();
  if (!stand || !stand.is_active) notFound();

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const company = (stand as any).company as {
    name: string;
    logo_url: string | null;
  };

  const { data: program } = await admin
    .from("loyalty_programs")
    .select("id, name")
    .eq("company_id", stand.company_id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  return (
    <main id="indhold" className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-10">
      <div className="box-shape w-full max-w-md border border-border bg-card p-6 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)] sm:p-8">
        <div className="mb-6 text-center">
          {company.logo_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={company.logo_url}
              alt={company.name}
              className="mx-auto mb-3 h-14 w-14 rounded-xl object-contain"
            />
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight">
            {program ? `Få dit stempelkort hos ${company.name}` : company.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            Saml stempler og få belønninger — helt uden app.
          </p>
        </div>

        {program ? (
          <SelfEnrollForm slug={slug} />
        ) : (
          <p className="text-center text-sm text-muted">
            Der er endnu ikke noget aktivt stempelkort her.
          </p>
        )}

        {/*
          HER STÅR DEN, DER ER VED AT OPRETTE KORT NUMMER TO VED EN FEJL.
          Tilmelder kunden sig med den SAMME e-mail, får hun sit gamle kort
          igen (se `selfEnroll()`) — men skriver hun en anden adresse, får hun
          et nyt, tomt kort, og stemplerne bliver liggende under den gamle.
          Linjen her er den billige måde at fange det på, netop i det øjeblik
          hun står med telefonen.
        */}
        {program ? (
          <p className="mt-6 border-t border-border pt-5 text-center text-sm text-muted">
            Har du et kort her i forvejen og mistet linket?{" "}
            <Link
              href="/kort/find"
              className="font-medium text-accent hover:underline"
            >
              Find dit kort
            </Link>
          </p>
        ) : null}
      </div>
      <div className="mt-8">
        <Logo image="light" className="opacity-80" />
      </div>
    </main>
  );
}
