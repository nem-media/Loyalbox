import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  TOM_FORDELING,
  beregnOmdoemme,
  offentligKundescore,
  type EksternProfil,
  type Omdoemme,
  type Stjernefordeling,
} from "@/lib/omdoemme";

/**
 * Omdømmet hentet fra basen og lagt igennem beregningen.
 *
 * ALT LÆSES MED BRUGERENS EGEN KLIENT og ikke med service-role. Det er ikke
 * en detalje: RLS er dét, der holder virksomhederne fra hinanden, og en
 * service-role-klient omgår den. Læser vi med brugerens klient, kan en fejl i
 * et company_id ikke komme til at vise en anden butiks tal — forespørgslen
 * ville bare give ingenting.
 *
 * KUN SNAPSHOTTET SKRIVES MED SERVICE-ROLE, fordi historikken ikke må kunne
 * skrives fra en klient. Se `gemDagensSnapshot()`.
 */

export interface OmdoemmeProfil extends EksternProfil {
  id: string;
  visningsnavn: string | null;
  profilUrl: string | null;
  kilde: string;
  opdateretDen: string;
}

export interface OmdoemmeOverblik {
  omdoemme: Omdoemme;
  profiler: OmdoemmeProfil[];
  /** Seneste snapshot FØR i dag. Null hvis der ikke er nogen historik endnu. */
  forrige: {
    score: number;
    kundescore: number | null;
    beregnetDen: string;
  } | null;
}

/**
 * Stjernefordelingen.
 *
 * FEM TÆLLINGER FREM FOR AT HENTE RÆKKERNE. En butik med tyve tusind
 * oplevelser skal ikke sende tyve tusind rækker over ledningen for at vi kan
 * lægge dem sammen. PostgREST kan ikke gruppere, så fem `head: true`-kald er
 * den billigste vej — de kører parallelt og henter kun tal.
 */
async function hentFordeling(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
): Promise<Stjernefordeling> {
  const tael = async (rating: number) => {
    const { count } = await supabase
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId)
      .eq("rating", rating);
    return count ?? 0;
  };

  const [en, to, tre, fire, fem] = await Promise.all([
    tael(1),
    tael(2),
    tael(3),
    tael(4),
    tael(5),
  ]);

  return { 1: en, 2: to, 3: tre, 4: fire, 5: fem };
}

/** Hvor mange af de utilfredse (1-2 stjerner) der er fulgt op på. */
async function taelHaandterede(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  companyId: string,
): Promise<number> {
  const { count } = await supabase
    .from("feedback")
    .select("*", { count: "exact", head: true })
    .eq("company_id", companyId)
    .lte("rating", 2)
    .not("haandteret_den", "is", null);
  return count ?? 0;
}

/** Alt, omdømmesiden og dashboardkortet skal bruge. Ét kald. */
export async function hentOmdoemme(
  companyId: string,
): Promise<OmdoemmeOverblik> {
  const supabase = await createClient();

  const [fordeling, haandterede, profilRaekker, forrigeRaekke] =
    await Promise.all([
      hentFordeling(supabase, companyId),
      taelHaandterede(supabase, companyId),
      supabase
        .from("eksterne_profiler")
        .select("*")
        .eq("company_id", companyId)
        .order("created_at", { ascending: true }),
      /*
       * Det seneste snapshot FØR i dag. Dagens eget snapshot ville gøre
       * udviklingen til "+0" hver gang — sammenligningen skal være med
       * sidste gang, tallet stod et andet sted.
       */
      supabase
        .from("omdoemme_snapshots")
        .select("score, kundescore, beregnet_den")
        .eq("company_id", companyId)
        .lt("beregnet_den", new Date().toISOString().slice(0, 10))
        .order("beregnet_den", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

  const profiler: OmdoemmeProfil[] = (profilRaekker.data ?? []).map(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (r: any) => ({
      id: r.id,
      platform: r.platform,
      visningsnavn: r.visningsnavn,
      rating: r.rating === null ? null : Number(r.rating),
      ratingSkala: r.rating_skala === null ? null : Number(r.rating_skala),
      antalAnmeldelser: Number(r.antal_anmeldelser ?? 0),
      anbefalingProcent:
        r.anbefaling_procent === null ? null : Number(r.anbefaling_procent),
      profilUrl: r.profil_url,
      kilde: r.kilde,
      opdateretDen: r.opdateret_den,
    }),
  );

  const omdoemme = beregnOmdoemme({
    fordeling: fordeling ?? TOM_FORDELING,
    haandteredeNegative: haandterede,
    profiler,
  });

  const f = forrigeRaekke.data;
  return {
    omdoemme,
    profiler,
    forrige: f
      ? {
          score: f.score,
          kundescore: f.kundescore === null ? null : Number(f.kundescore),
          beregnetDen: f.beregnet_den,
        }
      : null,
  };
}

/**
 * Gemmer dagens snapshot — én pr. virksomhed pr. dag.
 *
 * HVORFOR VED SIDEVISNING OG IKKE SOM ET NATLIGT JOB. Der findes allerede en
 * natlig kørsel, men den ville lave et snapshot for hver eneste virksomhed
 * hver eneste nat, også dem der aldrig åbner dashboardet. At skrive, når
 * nogen ser på tallet, giver historik præcis for dem, der bruger den — og
 * ingen rækker for dem, der ikke gør.
 *
 * DEN SKRIVER HØJST ÉN GANG OM DAGEN. Et unikt indeks på (virksomhed, dato)
 * håndhæver det i basen; her tjekkes der først, så det normale tilfælde er
 * en billig læsning frem for en afvist indsættelse.
 *
 * INTET HERINDE MÅ KASTE. Historikken er en bonus — en fejl i den må aldrig
 * være det, der forhindrer nogen i at se sit omdømme.
 */
export async function gemDagensSnapshot(
  companyId: string,
  omdoemme: Omdoemme,
): Promise<void> {
  if (omdoemme.score === null) return;

  try {
    const admin = createAdminClient();
    const iDag = new Date().toISOString().slice(0, 10);

    const { data: findes } = await admin
      .from("omdoemme_snapshots")
      .select("id")
      .eq("company_id", companyId)
      .gte("beregnet_den", iDag)
      .limit(1)
      .maybeSingle();

    const raekke = {
      score: omdoemme.score,
      kundetilfredshed: omdoemme.dele.kundetilfredshed,
      positive_oplevelser: omdoemme.dele.positiveOplevelser,
      feedbackhaandtering: omdoemme.dele.feedbackhaandtering,
      eksterne_ratings: omdoemme.dele.eksterneRatings,
      kundescore: omdoemme.kundescore,
      antal_oplevelser: omdoemme.antalOplevelser,
      version: omdoemme.version,
    };

    if (findes) {
      // Samme dag, nyere tal: opdatér frem for at lave en ny række. Ellers
      // ville et besøg om formiddagen og et om aftenen give to punkter på
      // samme dag i kurven.
      await admin
        .from("omdoemme_snapshots")
        .update(raekke)
        .eq("id", findes.id);
    } else {
      await admin
        .from("omdoemme_snapshots")
        .insert({ ...raekke, company_id: companyId });
    }
  } catch (err) {
    console.error("[omdoemme] kunne ikke gemme snapshot:", (err as Error).message);
  }
}

/**
 * Kundescoren til den OFFENTLIGE side.
 *
 * EGEN FUNKTION FREM FOR `hentOmdoemme()`. Den offentlige side rammes af
 * kunder og skal være let: her hentes kun de fem tællinger, der skal til for
 * et gennemsnit — ingen profiler, ingen snapshots, ingen skrivning.
 *
 * ER VISNINGEN SLÅET FRA, RØRES BASEN SLET IKKE. Det er det almindelige
 * tilfælde, og så skal det også være det billigste. Tjekket ligger FØR
 * forespørgslerne og ikke efter.
 *
 * Bruger `createClient()` som resten: den offentlige side læser feedback
 * gennem RLS ligesom alt andet. Tællinger afslører intet om den enkelte
 * kunde — kun hvor mange der gav hvilke stjerner.
 */
export async function hentOffentligKundescore(
  companyId: string,
  tilvalgt: boolean,
) {
  if (!tilvalgt) return null;
  const supabase = await createClient();
  const fordeling = await hentFordeling(supabase, companyId);
  return offentligKundescore(fordeling, true);
}
