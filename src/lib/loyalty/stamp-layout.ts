/**
 * Hvor mange kolonner et stempelkort skal have, så cirklerne står FLOT
 * FORDELT — også når der ikke er 10.
 *
 * Et fast 5-kolonners net er kun pænt, når antallet går op i 5. Med 7 stod
 * der 5 + 2, med 8 stod der 5 + 3, med 9 stod der 5 + 4 — altså en fyldt
 * række og en halvtom stump under. Vi vælger i stedet et kolonneantal, hvor
 * den sidste række er så fuld som muligt, og hvor der aldrig står én enlig
 * cirkel for sig selv.
 *
 * REGLEN:
 *  - Op til 5: én række (så mange kolonner, som der er stempler).
 *  - Derover: vælg mellem 3, 4 og 5 kolonner det, der giver den fuldeste
 *    sidste række (færrest tomme pladser), undgår en enlig cirkel, og ellers
 *    færrest rækker.
 *
 * Resultatet på de almindelige antal:
 *   5 → 5           6 → 3×2        7 → 4+3        8 → 4×2
 *   9 → 3×3         10 → 5×2       11 → 4+4+3     12 → 4×3
 *
 * Max 5 kolonner, så cirklerne ikke bliver for små på en telefon.
 */
export function stempelKolonner(total: number): number {
  const n = Math.max(1, Math.floor(total));
  if (n <= 5) return n;

  let bedst = 5;
  let bedstScore = Infinity;
  for (const c of [3, 4, 5]) {
    const raekker = Math.ceil(n / c);
    const sidste = n - (raekker - 1) * c;
    const tomme = c - sidste;

    // Tomme pladser i sidste række vejer tungest; en enlig cirkel straffes
    // hårdt; ellers foretrækkes færrest rækker en anelse.
    let score = tomme * 2 + raekker * 0.6;
    if (sidste === 1 && raekker > 1) score += 5;

    if (score < bedstScore) {
      bedstScore = score;
      bedst = c;
    }
  }
  return bedst;
}
