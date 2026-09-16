/**
 * HENT ALLE RÆKKER — POSTGREST SVARER HØJST 1000 AD GANGEN.
 *
 * Loftet er en indstilling på serveren (`max-rows`), ikke noget vi beder om,
 * og det ses ikke: svaret er et helt almindeligt array, bare afkortet. Der er
 * ingen fejl, ingen advarsel og intet i tallet, der røber det.
 *
 * MÅLT PÅ DEN KØRENDE BASE 2026-09-15: med 1274 scanninger på én virksomhed
 * svarede tælleopslaget 1274, mens rækkeopslaget gav præcis 1000 — altså to
 * tal på SAMME skærm, der ikke passede sammen. Og fordelingen var oven i
 * købet forkert på en vilkårlig måde, fordi det er tilfældigt, hvilke tusind
 * der kommer med.
 *
 * FEJLEN ER FARLIGST, HVOR DER REGNES PÅ RÆKKERNE. Et gennemsnit over
 * "alle tider" bliver stille forkert, når butik nummer tusind-og-én anmelder;
 * ingen kan se det, og tallet ser rimeligt ud. Det var præcis dét, der stod
 * i `avgRatingTotal` — tyve linjer fra den fejl, der blev rettet i #211.
 *
 * DERFOR ÉT STED. Hjælperen lå først som en lokal funktion inde i
 * `getAdresseStats`, og nabolinjerne i samme fil beholdt fejlen. `report.ts`
 * havde `.limit(5000)` på ÉN af fem forespørgsler — nogen havde set
 * problemet og dækket en femtedel af det.
 *
 * DER SIDES KUN, NÅR DER ER NOGET AT SIDE EFTER: kom der mindre end en fuld
 * side, er der ikke mere, og så koster det ét kald ligesom før. Kun den
 * kunde, hvor tallet er begyndt at betyde noget, betaler for det ekstra.
 */

/** Så meget svarer PostgREST højst på én gang. */
export const SIDE = 1000;

/**
 * Kald `byg(fra, til)` igen og igen, til der ikke er flere rækker.
 *
 * `byg` SKAL sortere på noget fast (fx `id`). Uden en stabil rækkefølge kan
 * databasen give rækkerne i en anden orden mellem to kald, og så kommer en
 * række med to gange, mens en anden slet ikke kommer med — en fejl, der er
 * værre end afkortningen, fordi den ser ud som rigtige data.
 */
export async function hentAlle<T>(
  byg: (fra: number, til: number) => PromiseLike<{ data: T[] | null }>,
): Promise<T[]> {
  const ud: T[] = [];
  for (let side = 0; ; side++) {
    const { data } = await byg(side * SIDE, (side + 1) * SIDE - 1);
    const batch = data ?? [];
    ud.push(...batch);
    // Præcis en fuld side betyder, at der KAN være mere — så spørges der igen,
    // også selv om det var den sidste.
    if (batch.length < SIDE) return ud;
  }
}
