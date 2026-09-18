import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { Logo } from "@/components/brand";
import { SelfEnrollForm } from "./self-enroll-form";
import { PRIVAT_SIDE } from "@/lib/site";
import { hentPointProgram } from "@/lib/loyalty/point-service";

export const dynamic = "force-dynamic";
export const metadata = {
  // "Bliv medlem" og ikke "Opret stempelkort": siden dækker nu begge
  // loyalitetsformer, og butikken kan have den ene, den anden eller begge.
  title: "Bliv medlem",
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

  /*
   * BUTIKKEN KAN KØRE BEGGE FORMER. Siden skal derfor sige, hvad kunden
   * faktisk kommer med i — ikke love et stempelkort, hvor der er point, og
   * ikke lade en café med kun point stå med en side, der siger nej.
   */
  const pointProgram = await hentPointProgram(stand.company_id, admin);
  const point = pointProgram?.status === "active" ? pointProgram : null;
  const harNoget = Boolean(program || point);

  return (
    <main id="indhold" className="flex min-h-screen flex-col items-center justify-center bg-dark px-4 py-10">
      <div className="box-shape w-full max-w-md border border-border bg-card p-6 shadow-[0_30px_60px_-25px_rgba(0,0,0,0.5)] sm:p-8">
        <div className="mb-6 text-center">
          {company.logo_url ? (
            // BUTIKKENS LOGO SKAL KUNNE TRYKKES — DERFOR ER FILEN STOR.
            // Profilsiden beder med rette om mindst 1000 px, fordi SAMME fil
            // også havner på skiltet. Indtil nu blev hele filen sendt til en
            // telefon for at fylde 56 × 56 px: målt 2026-09-17 var det 60 KB,
            // hvoraf 59 var spildt. Målene her er boksens, så udsnittet er
            // uændret — `object-contain` gør resten.
            <Image
              src={company.logo_url}
              alt={company.name}
              width={56}
              height={56}
              className="mx-auto mb-3 h-14 w-14 rounded-xl object-contain"
            />
          ) : null}
          <h1 className="text-xl font-semibold tracking-tight">
            {harNoget ? `Bliv medlem hos ${company.name}` : company.name}
          </h1>
          <p className="mt-1 text-sm text-muted">
            {program && point
              ? "Saml point og stempler — helt uden app."
              : point
                ? "Optjen point, når du handler — helt uden app."
                : "Saml stempler og få belønninger — helt uden app."}
          </p>
        </div>

        {/*
          DINE FORDELER FØRST, formularen bagefter. Kunden skal kunne se, hvad
          hun siger ja til, før hun taster sin mail — og med to former skal
          forskellen kunne læses på to linjer.
        */}
        {harNoget ? (
          <div className="mb-5 space-y-2">
            {point ? (
              <div className="box-shape border border-border bg-background p-3">
                <p className="text-sm font-medium">{point.name}</p>
                <p className="text-xs text-muted">
                  {point.description ||
                    "Optjen point, når du handler, og vælg selv din belønning."}
                </p>
              </div>
            ) : null}
            {program ? (
              <div className="box-shape border border-border bg-background p-3">
                <p className="text-sm font-medium">{program.name}</p>
                <p className="text-xs text-muted">
                  Saml stempler og få en belønning.
                </p>
              </div>
            ) : null}
          </div>
        ) : null}

        {harNoget ? (
          <SelfEnrollForm slug={slug} />
        ) : (
          <p className="text-center text-sm text-muted">
            Der er endnu ikke noget aktivt kundeprogram her.
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
        {harNoget ? (
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
