import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { createAdminClient } from "@/lib/supabase/admin";
import { aktiveringSpaerre } from "@/lib/aktivering";
import { aktiverFraToken } from "@/app/aktiver/actions";
import { AktiverForm, AktiveringSpaerret } from "@/components/aktiver-form";
import { PRIVAT_SIDE } from "@/lib/site";

export const metadata = { title: "Opret din adgang", ...PRIVAT_SIDE };

/**
 * Aktiveringen fra MAILEN — reserven, når tak-siden ikke blev brugt.
 *
 * HVORFOR DEN FINDES: tak-siden er den hurtige vej, men den forsvinder, hvis
 * fanen lukkes, eller hvis kunden betaler på telefonen og vil sætte det op på
 * en computer. Uden dette link ville en betalende kunde i den situation stå
 * uden nogen vej ind i det, de lige har købt.
 *
 * TOKENET I ADRESSEN ER ADGANGEN, præcis som `/kort/<token>`. Derfor er siden
 * `PRIVAT_SIDE` — den må aldrig indekseres — og derfor er den eneste ting,
 * formularen tager imod, en adgangskode. E-mailen læses fra virksomheden og
 * kan ikke sendes med.
 */
export default async function AktiverPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;

  const { data: firma } = await createAdminClient()
    .from("companies")
    .select("name, user_id, aktivering_token, aktivering_udloeber")
    .eq("aktivering_token", token)
    .maybeSingle();

  /*
   * ET UKENDT TOKEN OG ET UDLØBET SKAL SE ENS UD UDEFRA — begge svarer
   * "intet-token"/"udløbet" uden at røbe, om virksomheden findes. Siden er
   * offentlig, og adressen kan gættes på.
   */
  const spaerre = aktiveringSpaerre(firma);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-xl px-4 py-20">
        <h1 className="text-2xl font-bold tracking-tight">
          {firma?.name ? `Velkommen, ${firma.name}` : "Opret din adgang"}
        </h1>

        {spaerre ? (
          <AktiveringSpaerret grund={spaerre} />
        ) : (
          <AktiverForm
            action={aktiverFraToken}
            skjultFelt={{ navn: "token", vaerdi: token }}
          />
        )}
      </main>
      <SiteFooter />
    </>
  );
}
