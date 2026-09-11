import { PageHeader } from "@/components/dashboard-shell";
import { createAdminClient } from "@/lib/supabase/admin";
import { hentLager } from "@/lib/lager";
import { LagerStyring } from "./lager-styring";

export const dynamic = "force-dynamic";
export const metadata = { title: "Lager" };

/**
 * Internt standerlager. Admin-only (layoutet spærrer), og INTET herfra vises
 * nogensinde til kunder. Læses med service-role — tabellen er admin-only via
 * RLS, og siden ligger allerede bag admin-spærren i layoutet.
 */
export default async function LagerPage() {
  const lager = await hentLager(createAdminClient());

  return (
    <>
      <PageHeader
        title="Lager"
        description="Internt overblik over fysiske standere. Kunder ser det aldrig, og et køb spærres ikke af det."
      />
      <LagerStyring start={lager} />
      <p className="mt-6 max-w-prose text-sm text-muted">
        Lageret trækkes automatisk ned, når en kunde køber en stander — efter
        farven på deres design. Du kan altid rette manuelt ovenfor. Sælges der
        flere, end der er på lager, går tallet i minus (restordre); købet går
        stadig igennem.
      </p>
    </>
  );
}
