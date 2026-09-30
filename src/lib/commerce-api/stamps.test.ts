import { describe, it, expect } from "vitest";
import { anvendStempelbidrag, stempelReference, type StempelAfhaengigheder } from "./stamps";
import type { ContributionRow } from "./rows";

/**
 * STEMPELBIDRAGET KONVERGERER — også når to synkroniseringer blandes.
 *
 * Den falske ledger her har de samme to spærrer som den rigtige: én linje pr.
 * reference (`loyalty_txn_ref_idx`) og én tilbageførsel pr. linje
 * (`loyalty_txn_en_tilbagefoersel_idx`). Så kan det vises, at dubletter og
 * sammenflettede kald ender med præcis det antal stempler, target siger.
 */

function verden(start: Partial<ContributionRow> = {}) {
  const bidrag: ContributionRow = {
    id: "c1",
    company_id: "co",
    integration_id: "i",
    order_id: "o",
    external_order_id: "1042",
    point_program_id: null,
    stamp_program_id: "sp",
    member_id: "m",
    target: 1,
    applied: 0,
    ledger_seq: 0,
    status: "pending",
    status_reason: null,
    ...start,
  };
  const linjer: { id: string; ref: string; tilbagefoert: boolean }[] = [];
  const kald: string[] = [];
  const deps: StempelAfhaengigheder = {
    hentBidrag: async () => ({ ...bidrag }),
    sikreMedlemskab: async () => "ms",
    findStempel: async (_ms, ref) => {
      const l = linjer.find((x) => x.ref === ref);
      return l ? { id: l.id, tilbagefoert: l.tilbagefoert } : null;
    },
    givStempel: async (_c, _ms, ref) => {
      kald.push(`giv ${ref}`);
      if (!linjer.some((x) => x.ref === ref)) linjer.push({ id: `t${linjer.length}`, ref, tilbagefoert: false });
      return { ok: true };
    },
    tilbagefoer: async (_c, id) => {
      kald.push(`tilbage ${id}`);
      const l = linjer.find((x) => x.id === id)!;
      if (l.tilbagefoert) return { ok: false, fejl: "Transaktionen er allerede tilbageført.", allerede: true };
      l.tilbagefoert = true;
      return { ok: true };
    },
    gem: async (_id, f) => {
      bidrag.applied = f.applied;
      bidrag.status = f.status;
      bidrag.status_reason = f.status_reason;
    },
    naesteGeneration: async (_id, fra) => {
      if (bidrag.ledger_seq === fra) bidrag.ledger_seq = fra + 1;
    },
  };
  const aktive = () => linjer.filter((l) => !l.tilbagefoert).length;
  return { bidrag, linjer, deps, aktive, kald };
}

describe("anvendStempelbidrag", () => {
  it("target 1: ét stempel; en dublet giver intet mere", async () => {
    const v = verden();
    const a = await anvendStempelbidrag("c1", v.deps);
    expect(a).toMatchObject({ foer: 0, efter: 1, status: "applied" });
    await anvendStempelbidrag("c1", v.deps);
    expect(v.aktive()).toBe(1);
    expect(v.linjer).toHaveLength(1);
    expect(v.linjer[0].ref).toBe(stempelReference("c1", 0));
  });

  it("refunderet under minimum: target 0 → stemplet tilbageføres med en modpost, og generationen tælles op", async () => {
    const v = verden();
    await anvendStempelbidrag("c1", v.deps);
    v.bidrag.target = 0;
    const r = await anvendStempelbidrag("c1", v.deps);
    expect(r).toMatchObject({ foer: 1, efter: 0, status: "applied" });
    expect(v.aktive()).toBe(0);
    expect(v.linjer).toHaveLength(1);
    expect(v.bidrag.ledger_seq).toBe(1);
    // Gentaget: intet sker.
    await anvendStempelbidrag("c1", v.deps);
    expect(v.kald.filter((k) => k.startsWith("tilbage"))).toHaveLength(1);
  });

  it("kvalificerer igen efter en tilbageførsel: et NYT stempel med en ny reference", async () => {
    const v = verden();
    await anvendStempelbidrag("c1", v.deps);
    v.bidrag.target = 0;
    await anvendStempelbidrag("c1", v.deps);
    v.bidrag.target = 1;
    await anvendStempelbidrag("c1", v.deps);
    expect(v.aktive()).toBe(1);
    expect(v.linjer.map((l) => l.ref)).toEqual([stempelReference("c1", 0), stempelReference("c1", 1)]);
  });

  it("to sammenflettede kald — det ene giver, mens target skifter til 0 — ender på target", async () => {
    const v = verden();
    // Kald A læser target 1 og når at give stemplet ...
    const oprindelig = v.deps.givStempel;
    v.deps.givStempel = async (...a) => {
      const r = await oprindelig(...a);
      // ... en nyere synkronisering sætter target til 0 imens.
      v.bidrag.target = 0;
      return r;
    };
    await anvendStempelbidrag("c1", v.deps);
    expect(v.aktive()).toBe(0);
    expect(v.bidrag.applied).toBe(0);
  });

  it("parallelle kald med samme target giver ét stempel", async () => {
    const v = verden();
    await Promise.all([anvendStempelbidrag("c1", v.deps), anvendStempelbidrag("c1", v.deps), anvendStempelbidrag("c1", v.deps)]);
    expect(v.aktive()).toBe(1);
  });

  it("stempelmotorens regler gælder: en afvisning bliver 'blocked' med grunden", async () => {
    const v = verden();
    v.deps.givStempel = async () => ({ ok: false, fejl: "Den daglige grænse for stempler er nået." });
    const r = await anvendStempelbidrag("c1", v.deps);
    expect(r).toMatchObject({ efter: 0, status: "blocked", grund: "Den daglige grænse for stempler er nået." });
  });

  it("uden kunde venter bidraget; en slettet kunde efter bogføring flyttes ikke", async () => {
    const v = verden({ member_id: null });
    expect(await anvendStempelbidrag("c1", v.deps)).toMatchObject({ status: "awaiting_customer" });
    const w = verden({ member_id: null, applied: 1 });
    expect(await anvendStempelbidrag("c1", w.deps)).toMatchObject({ status: "member_deleted", efter: 1 });
  });
});
