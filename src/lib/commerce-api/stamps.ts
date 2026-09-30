import type { ContributionRow } from "./rows";

/**
 * STEMPELBIDRAGET — GENNEM `giveStamp()` OG `reverseStamp()`, IKKE UDENOM.
 *
 * Stempelkortets motor ligger i TypeScript (src/lib/loyalty/service.ts): den
 * håndhæver programmets regler (aktivt, datovindue, daglig grænse, minutter
 * mellem stempler) og udsteder belønningen, når kortet er fuldt. En
 * webshopordre skal igennem præcis de samme regler, så der bygges ingen
 * webshopudgave af den.
 *
 * DET GIVER ET PROBLEM, POINT IKKE HAR: motoren er flere kald til basen, så der
 * kan ikke holdes en lås hen over den. I stedet er hvert skridt idempotent i
 * BASEN, og løkken nedenfor KONVERGERER mod det target, der er GEMT (ikke det,
 * denne anmodning regnede ud):
 *
 *   * Et stempel for bidraget har referencen `commerce:<bidrag>:<generation>`,
 *     og `loyalty_txn_ref_idx` (0004) gør, at to samtidige forsøg kun giver ét.
 *   * En tilbageførsel er en modpost med `reversal_of`, og
 *     `loyalty_txn_en_tilbagefoersel_idx` (0041) tillader kun én.
 *   * Efter en tilbageførsel tælles generationen op (betinget), så et nyt
 *     stempel — hvis ordren igen kvalificerer — får en ny reference.
 *   * Efter HVER skrivning læses bidraget igen. Har en nyere synkronisering
 *     ændret target imens, retter løkken sig efter den. Den, der skriver
 *     sidst, ser altså altid det nyeste target.
 *
 * V1 GIVER HØJST ÉT STEMPEL PR. ORDRE, så "anvendt" er 0 eller 1: findes
 * stemplet for den aktuelle generation, og er det ikke tilbageført, er det 1.
 */

export interface StempelTilstand {
  id: string;
  tilbagefoert: boolean;
}

export interface StempelAfhaengigheder {
  hentBidrag(id: string): Promise<ContributionRow | null>;
  /** Medlemskabet på stempelkortet — oprettes, hvis kunden ikke har et. */
  sikreMedlemskab(
    companyId: string,
    programId: string,
    memberId: string,
  ): Promise<string | null>;
  findStempel(membershipId: string, reference: string): Promise<StempelTilstand | null>;
  givStempel(
    companyId: string,
    membershipId: string,
    reference: string,
    bidrag: ContributionRow,
  ): Promise<{ ok: true } | { ok: false; fejl: string }>;
  tilbagefoer(
    companyId: string,
    txnId: string,
  ): Promise<{ ok: true } | { ok: false; fejl: string; allerede?: boolean }>;
  gem(
    id: string,
    felter: {
      applied: number;
      status: ContributionRow["status"];
      status_reason: string | null;
    },
  ): Promise<void>;
  /** Betinget: kun hvis generationen stadig er `fra`. */
  naesteGeneration(id: string, fra: number): Promise<void>;
}

export interface StempelResultat {
  id: string;
  target: number;
  foer: number;
  efter: number;
  status: ContributionRow["status"];
  grund: string | null;
}

export const stempelReference = (bidragId: string, generation: number) =>
  `commerce:${bidragId}:${generation}`;

const MAKS_RUNDER = 6;

export async function anvendStempelbidrag(
  bidragId: string,
  deps: StempelAfhaengigheder,
): Promise<StempelResultat | null> {
  const start = await deps.hentBidrag(bidragId);
  if (!start || !start.stamp_program_id) return null;
  const foer = start.applied;

  for (let runde = 0; runde < MAKS_RUNDER; runde++) {
    const c = await deps.hentBidrag(bidragId);
    if (!c || !c.stamp_program_id) return null;

    if (!c.member_id) {
      const status = c.applied > 0 ? "member_deleted" : c.target > 0 ? "awaiting_customer" : "applied";
      await deps.gem(c.id, { applied: c.applied, status, status_reason: null });
      return { id: c.id, target: c.target, foer, efter: c.applied, status, grund: null };
    }

    const medlemskab = await deps.sikreMedlemskab(c.company_id, c.stamp_program_id, c.member_id);
    if (!medlemskab) {
      await deps.gem(c.id, { applied: c.applied, status: "blocked", status_reason: "medlemskab-fejlede" });
      return { id: c.id, target: c.target, foer, efter: c.applied, status: "blocked", grund: "medlemskab-fejlede" };
    }

    const ref = stempelReference(c.id, c.ledger_seq);
    const stempel = await deps.findStempel(medlemskab, ref);

    if (stempel?.tilbagefoert) {
      // Generationen er brugt op (tilbageført, men ikke talt op endnu).
      await deps.naesteGeneration(c.id, c.ledger_seq);
      continue;
    }

    const har = stempel ? 1 : 0;
    if (har === c.target) {
      await deps.gem(c.id, { applied: har, status: "applied", status_reason: null });
      return { id: c.id, target: c.target, foer, efter: har, status: "applied", grund: null };
    }

    if (c.target > har) {
      const r = await deps.givStempel(c.company_id, medlemskab, ref, c);
      if (!r.ok) {
        await deps.gem(c.id, { applied: har, status: "blocked", status_reason: r.fejl });
        return { id: c.id, target: c.target, foer, efter: har, status: "blocked", grund: r.fejl };
      }
      continue;
    }

    // target 0, men stemplet findes: tilbagefør det.
    const r = await deps.tilbagefoer(c.company_id, stempel!.id);
    if (!r.ok && !r.allerede) {
      await deps.gem(c.id, { applied: har, status: "blocked", status_reason: r.fejl });
      return { id: c.id, target: c.target, foer, efter: har, status: "blocked", grund: r.fejl };
    }
    await deps.naesteGeneration(c.id, c.ledger_seq);
  }

  const slut = await deps.hentBidrag(bidragId);
  return {
    id: bidragId,
    target: slut?.target ?? 0,
    foer,
    efter: slut?.applied ?? foer,
    status: "blocked",
    grund: "konvergerede-ikke",
  };
}
