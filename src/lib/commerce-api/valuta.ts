/**
 * VALUTA: DKK I V1 — ÉT STED.
 *
 * Kontrakten kan bære enhver aktiv ISO 4217-valuta, men LoyalSum Commerce
 * accepterer i første udgave KUN danske kroner. Det er en produktbeslutning,
 * ikke en begrænsning i skemaet: pointprogrammets `earn_value` og
 * stempelkortets minimum er i KRONER, og en omregning ville være en regel,
 * ingen butik har valgt.
 *
 * Hvor beslutningen bruges:
 *   * parringen afviser en butik i en anden valuta (`unsupported_currency`);
 *   * hver ordre og hver kurv skal være i butikkens valuta, og den skal stå her;
 *   * dashboardet gemmer en fast rabat i `STANDARD_VALUTA`.
 * Ingen anden fil sammenligner med en valutakode — `vagter.test.ts` spærrer
 * for, at "DKK" skrives ud andre steder i webshopkoden.
 *
 * SENERE (EUR, SEK, NOK, GBP): tabellerne bærer allerede en valuta pr.
 * integration, ordre, rabat og reservation, så der kræves ingen ny tabel.
 * Det, der mangler, er, at programmernes kroneværdier får en valuta med sig
 * — og så tilføjes koden her.
 */
export const UNDERSTOETTEDE_VALUTAER = ["DKK"] as const;
export type CommerceValuta = (typeof UNDERSTOETTEDE_VALUTAER)[number];

/** Valutaen, butikkens egne beløb (rabatter, minimum) er skrevet i. */
export const STANDARD_VALUTA: CommerceValuta = UNDERSTOETTEDE_VALUTAER[0];

export function erUnderstoettetValuta(kode: string): kode is CommerceValuta {
  return (UNDERSTOETTEDE_VALUTAER as readonly string[]).includes(kode);
}
