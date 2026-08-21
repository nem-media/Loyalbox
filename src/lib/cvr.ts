/**
 * CVR-nummeret — og hvorfor det er obligatorisk.
 *
 * BAGGRUND: handelsbetingelserne forudsætter et erhvervskøb. Priserne vises
 * uden moms, og der er ingen fortrydelsesret. Men indtil nu blev der kun
 * spurgt om et firmanavn som fri tekst, og en privatperson kunne skrive hvad
 * som helst og købe. Sker det, gælder forbrugerreglerne uanset hvad
 * betingelserne siger: 14 dages fortrydelsesret, oplysningspligt før købet og
 * priser inklusive moms. Vi ville altså have solgt på vilkår, der ikke gjaldt.
 *
 * CVR-nummeret er den spærre. Det er ikke en formalitet: det er dét, der gør
 * "vi sælger kun til virksomheder" til andet end en sætning på en side.
 *
 * Nummeret står også på fakturaen, hvor køberens CVR hører hjemme i et dansk
 * B2B-salg.
 */

/** Otte cifre, som Erhvervsstyrelsen tildeler dem. */
const CIFRE = 8;

/**
 * Vægtene i modulus 11-kontrollen. De syv første cifre ganges med hver sin
 * vægt, og det ottende er kontrolcifferet.
 */
const VAEGTE = [2, 7, 6, 5, 4, 3, 2];

/** Fjerner mellemrum, punktummer og et eventuelt DK-præfiks. */
export function normaliserCvr(raw: string): string {
  return raw
    .trim()
    .replace(/^dk/i, "")
    .replace(/[\s.\-]/g, "");
}

/**
 * Er nummeret et gyldigt CVR?
 *
 * Kontrollen er modulus 11 og ikke bare "otte cifre". Forskellen betyder
 * noget i praksis: den fanger de to hyppigste tastefejl — et forkert ciffer og
 * to ombyttede cifre — mens en længdekontrol lader dem passere. Et forkert CVR
 * på en faktura opdages først i kundens bogholderi.
 *
 * Den siger IKKE, om virksomheden findes eller er aktiv. Det kræver et opslag
 * hos Erhvervsstyrelsen, og det er et selvstændigt stykke arbejde; kontrollen
 * her er den, der kan laves uden et eksternt kald og uden at kunne fejle
 * stille, hvis en tjeneste er nede.
 */
export function erGyldigtCvr(raw: string | null | undefined): boolean {
  if (!raw) return false;
  const cvr = normaliserCvr(raw);
  if (!new RegExp(`^\\d{${CIFRE}}$`).test(cvr)) return false;

  // 00000000 består regnestykket, men er ikke et nummer.
  if (/^0+$/.test(cvr)) return false;

  const cifre = [...cvr].map(Number);
  const sum = VAEGTE.reduce((acc, vaegt, i) => acc + vaegt * cifre[i], 0);
  const rest = sum % 11;

  // Rest 1 kan ikke give et kontrolciffer mellem 0 og 9 — sådan et nummer
  // uddeles derfor aldrig.
  if (rest === 1) return false;

  const kontrol = rest === 0 ? 0 : 11 - rest;
  return kontrol === cifre[CIFRE - 1];
}

/** Til visning: "37811769" bliver til "DK 37811769". */
export function visCvr(raw: string): string {
  return `DK ${normaliserCvr(raw)}`;
}

/** Beskeden, der vises, når nummeret ikke går igennem. Samme ordlyd overalt. */
export const CVR_FEJL =
  "Det ser ikke ud til at være et gyldigt CVR-nummer. Tjek de otte cifre — vi sælger kun til virksomheder.";
