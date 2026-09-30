/**
 * VALUTA: INGEN OMREGNING I V1.
 *
 * Pointprogrammets `earn_value` og stempelkortets minimum er i KRONER, og
 * LoyalSum sælger til danske butikker. En webshop, der opkræver i en anden
 * valuta, kan derfor ikke optjene uden en omregning, V1 bevidst ikke har — den
 * afvises ved parringen og ved hver ordre med `unsupported_currency`, som er
 * permanent: et genforsøg ændrer ikke valutaen.
 *
 * Listen er stedet, en ny valuta slås til — og den kræver, at programmernes
 * værdier får en valuta med sig først.
 */
export const UNDERSTOETTEDE_VALUTAER = ["DKK"] as const;

export function erUnderstoettetValuta(kode: string): boolean {
  return (UNDERSTOETTEDE_VALUTAER as readonly string[]).includes(kode);
}
