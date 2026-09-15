/**
 * HVORNÅR BEGYNDER EN DAG? ÉT SVAR, ÉT STED.
 *
 * Produktet er dansk, og hver eneste "dag" i systemet er butikkens dag: den
 * daglige stempelgrænse, perioden "I dag" i statistikken, og vinduet på et
 * stempelkort. Serveren kører i UTC, og forskellen er en eller to timer — lige
 * nok til at være usynlig i en test og forkert i en butik.
 *
 * DET HAR KOSTET TO GANGE, BEGGE FUNDET 2026-09-15:
 *
 *  - Den daglige stempelgrænse målte fra midnat UTC, så en forretning med
 *    åbent hen over midnat fik grænsen nulstillet kl. 02 — midt i aftenen.
 *  - `periodRange("today")` gjorde det samme. Åbnede en cafeejer dashboardet
 *    kl. 00:30 efter lukketid, begyndte "I dag" kl. 02:00 DAGEN FØR, så
 *    tallet under overskriften "I dag" var næsten helt gårsdagens.
 *
 * Begge steder havde deres egen udregning, og `program-status.ts` havde en
 * tredje, der var rigtig. Derfor ligger svaret nu her, og de tre kalder det
 * samme.
 *
 * FORSKYDNINGEN SLÅS OP OG HARDCODES ALDRIG: Danmark er UTC+1 om vinteren og
 * UTC+2 om sommeren, så et fast tal ville være forkert det halve år — og det
 * halve år, hvor det passer, ville skjule fejlen.
 */

/** Produktets tidszone. Alt, der vises til en butik eller en kunde, er her. */
export const TIDSZONE = "Europe/Copenhagen";

/** Dagens dato (YYYY-MM-DD) i dansk tid. */
export function iDagDatoKoebenhavn(now: Date = new Date()): string {
  // en-CA formaterer som YYYY-MM-DD.
  return new Intl.DateTimeFormat("en-CA", { timeZone: TIDSZONE }).format(now);
}

/**
 * Danmarks forskydning fra UTC på et givet tidspunkt, som `+02:00`.
 *
 * Slås op i Intl frem for at blive regnet ud: sommertidens skiftedage flytter
 * sig, og reglerne kan ændres politisk. Intl bærer tidszonedatabasen.
 */
export function forskydningKoebenhavn(now: Date = new Date()): string {
  const navn = new Intl.DateTimeFormat("en-US", {
    timeZone: TIDSZONE,
    timeZoneName: "longOffset",
  })
    .formatToParts(now)
    .find((d) => d.type === "timeZoneName")?.value;
  // "GMT+02:00" → "+02:00". Står der bare "GMT", er forskydningen nul.
  return navn?.replace("GMT", "") || "+00:00";
}

/**
 * Begyndelsen af den danske dag, `now` ligger i — som et tidspunkt, der kan
 * sammenlignes med `timestamptz` i basen.
 *
 * Returnerer fx `2026-09-16T00:00:00.000+02:00`, altså midnat i København og
 * ikke i UTC. Værdien bærer sin egen forskydning, så PostgreSQL og PostgREST
 * læser den utvetydigt.
 */
export function dagStartKoebenhavn(now: Date = new Date()): string {
  const dato = iDagDatoKoebenhavn(now);

  /*
   * TO OMGANGE, OG DEN ANDEN ER IKKE OVERFLØDIG.
   *
   * På de to dage om året, hvor uret stilles, er forskydningen ved MIDNAT en
   * anden end forskydningen senere samme dag. Bruges `now`s egen forskydning,
   * bliver svaret en time forkert præcis dér.
   *
   * Fanget af `period.test.ts` på søndag den 25. oktober 2026 — døgnet med 25
   * timer. Første udgave af funktionen svarede kl. 01:00 i stedet for midnat.
   *
   * Derfor: gæt et tidspunkt ud fra en forskydning, slå så den FAKTISKE
   * forskydning op på dét tidspunkt, og byg svaret med den. Én omgang er nok
   * — forskydningen kan kun springe én gang i døgnet.
   */
  const gaet = new Date(
    `${dato}T00:00:00.000${forskydningKoebenhavn(new Date(`${dato}T12:00:00Z`))}`,
  );
  return `${dato}T00:00:00.000${forskydningKoebenhavn(gaet)}`;
}
