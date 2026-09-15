/**
 * LÆNGDEGRÆNSER PÅ DET, BUTIKKENS KUNDE FÅR AT SE.
 *
 * HVORFOR DE SKAL FINDES. Ingen af tabellerne har en længde: kolonnerne er
 * `text`, og PostgREST tager imod hvad som helst. Trimning var alt, der stod
 * mellem et formularfelt og databasen — så et programnavn på ti tusind tegn
 * blev gemt uden at noget fejlede.
 *
 * DET ER IKKE EN SIKKERHEDSFEJL, og det skal siges: Supabase parametriserer,
 * og React escaper, så der er hverken injektion eller XSS i det. Det er et
 * LAYOUTproblem — og det rammer det sted, vi har mindst kontrol over og mest
 * på spil: kundens egen telefon. `StampCardPreview` er et kort i fast
 * størrelse med en overskrift, en underlinje og en belønningspille; et navn
 * uden ende sprænger det, og butikken opdager det aldrig, for de ser deres
 * eget kort i dashboardet, hvor de selv har skrevet noget kort og pænt.
 *
 * MØNSTERET FANDTES I FORVEJEN — det var bare ikke ført igennem.
 * `kort-manifest.ts` afkorter allerede butiksnavnet med `KORT_NAVN_MAKS`,
 * fordi det ryger i en PWA-manifest. Præcis samme navn stod utrunkeret på
 * selve kortet. `kontakt.ts` har `MAKS`, og `stands.ts` har
 * `EGEN_PLATFORM_NAVN_MAKS`. Grænserne her er den manglende tredjedel.
 *
 * DER AFVISES IKKE — DER AFKORTES. En butik, der skriver en linje for lang,
 * skal ikke miste resten af sin indtastning på en fejlbesked; de skal se det
 * på kortet og selv rette det. Afvisning er rigtigt for et CVR-nummer, som
 * enten er gyldigt eller ikke er. Et navn er ikke sådan.
 */

/**
 * Tallene er valgt efter, hvad der KAN STÅ på kortet uden at brække det —
 * ikke efter hvad der er teknisk muligt. Et stempelkort hedder "Kaffeklub",
 * ikke en sætning, og underlinjen er "Tak for dit besøg!".
 */
export const TEKST_MAKS = {
  /** Overskriften på kundens kort og navnet i butikkens egne lister. */
  navn: 80,
  /** Underlinjen på kortet — `loyalty_programs.card_text`. */
  kortTekst: 120,
  /** Teksten på en knap, fx "Se menukort". Knapper er smalle. */
  etiket: 40,
  /** Adresse- og personfelter. Går i mails og på pakkelabels. */
  adresse: 120,
} as const;

/**
 * Trim, og afkort hvis nødvendigt.
 *
 * AFKORTER PÅ TEGN OG IKKE PÅ BYTES. Et dansk `æ` fylder to bytes og ét tegn;
 * en grænse i bytes ville skære et navn midt over på en måde, der afhænger af
 * hvilke bogstaver der står i det.
 *
 * Der sættes IKKE et ellipse-tegn på: værdien gemmes, og den skal kunne
 * redigeres videre af butikken bagefter. `kort-manifest.ts` tilføjer selv et
 * "…", fordi dét er en visning og ikke en gemt værdi.
 */
export function begraens(raa: FormDataEntryValue | null, maks: number): string {
  const s = String(raa ?? "").trim();
  return s.length > maks ? s.slice(0, maks).trimEnd() : s;
}
