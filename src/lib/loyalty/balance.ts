/**
 * Saldo- og progressionslogik for stempelkort.
 *
 * Ledger-model: saldoen er summen af `stamps` over alle transaktioner. En
 * reversering er en negativ transaktion, og en indløsning/nulstilling lægger en
 * negativ transaktion (fuld nulstilling eller kun de krævede stempler ved
 * "behold overskydende"). Dermed er `sum(stamps)` altid den korrekte saldo, og
 * historikken forbliver uforanderlig.
 */

export interface StampLedgerEntry {
  stamps: number;
}

/** Aktuel saldo = summen af alle stempel-transaktioner. */
export function computeBalance(entries: StampLedgerEntry[]): number {
  return entries.reduce((sum, e) => sum + (e.stamps ?? 0), 0);
}

export interface StampProgress {
  /** Antal stempler kunden har nu. */
  have: number;
  /** Antal stempler der kræves til belønningen. */
  required: number;
  /** Hvor mange der mangler (0 hvis nået). */
  remaining: number;
  /** Er belønningen nået/optjent? */
  reached: boolean;
  /** Fremgang 0-100 (til progress-bar). */
  percent: number;
}

/** Beregner fremgang mod næste belønning — bruges i kort-UI og medarbejderflow. */
export function stampProgress(have: number, required: number): StampProgress {
  const safeRequired = Math.max(1, required);
  const clampedHave = Math.max(0, have);
  const reached = clampedHave >= safeRequired;
  const remaining = Math.max(0, safeRequired - clampedHave);
  const percent = Math.min(100, Math.round((clampedHave / safeRequired) * 100));
  return { have: clampedHave, required: safeRequired, remaining, reached, percent };
}

/**
 * Hvor mange stempler skal trækkes ved indløsning af en belønning.
 * - Fuld nulstilling: træk hele saldoen (kort går til 0).
 * - Behold overskydende: træk kun de krævede (kunden beholder resten).
 * Returneres som et NEGATIVT tal, klar til en ledger-transaktion.
 */
export function redemptionStampDelta(
  balance: number,
  requiredStamps: number,
  keepOverflow: boolean,
): number {
  if (keepOverflow) return -Math.min(balance, requiredStamps);
  return -balance;
}

/** Kort, menneskelig statuslinje til kort/medarbejderflow. */
export function progressLabel(p: StampProgress): string {
  if (p.reached) return "Belønning klar til indløsning!";
  if (p.remaining === 1) return "Kun 1 stempel til din belønning.";
  return `Du har ${p.have} ud af ${p.required} stempler.`;
}
