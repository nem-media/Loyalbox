import { createHash } from "node:crypto";
import { orderInvariants, valider } from "./contract";
import { beregnEligibleSpend } from "./eligible-spend";
import { findKunde, type KundeAfhaengigheder, type Opslag } from "./customer";
import { pointTarget, stempelTarget, type PointProgramRegel } from "./targets";
import { erUnderstoettetValuta } from "./valuta";
import { MAKS_URFORSKEL_SEKUNDER } from "./hmac";
import type { Fejlkode } from "./errors";
import type { IntegrationRow } from "./rows";
import type { CommerceOrder, CommerceSyncResult } from "./types";
import type { StempelResultat } from "./stamps";

/**
 * POST /orders/sync — ordrens NUVÆRENDE tilstand ind, delta ud.
 *
 *   valider (skema + regnestykker)  →  binding (provider, butik, valuta)
 *   →  eligible spend  →  kunden  →  programmernes target
 *   →  `commerce_synk_ordre()` (lås, ældre tilstand afvises, point bogføres)
 *   →  stempler gennem `giveStamp()`  →  svaret
 *
 * Adapteren sender aldrig point. Den kan højst sende en forkert ordre, og en
 * ordre, der ikke går op, afvises med 422, før noget bogføres.
 */

export interface PointProgramInfo extends PointProgramRegel {
  id: string;
}
export interface StempelProgramInfo {
  id: string;
  min_order_minor: number | null;
}

export interface BidragSvar {
  id: string;
  kind: "points" | "stamps";
  program_id: string;
  target: number;
  foer: number;
  efter: number;
  status: string;
  grund?: string | null;
}

export interface SynkRpcSvar {
  ok: boolean;
  fejl?: string;
  stale?: boolean;
  order_id?: string;
  member_id?: string | null;
  bidrag?: BidragSvar[];
}

export interface SynkAfhaengigheder extends KundeAfhaengigheder {
  /** Programmer slået til i kanalen + dem, ordren allerede har bidraget til. */
  hentProgrammer(
    integration: IntegrationRow,
    externalOrderId: string,
  ): Promise<{ point: PointProgramInfo[]; stempel: StempelProgramInfo[] }>;
  synk(p: {
    integrationId: string;
    order: Record<string, unknown>;
    observedAt: string;
    stateHash: string;
    eligible: number;
    qualified: boolean;
    memberId: string | null;
    resolution: Opslag;
    targets: { kind: "points" | "stamps"; program_id: string; target: number }[];
    requestId: string;
  }): Promise<SynkRpcSvar>;
  anvendStempel(bidragId: string): Promise<StempelResultat | null>;
  nu?(): Date;
}

export type SynkUdfald =
  | { ok: true; http: 200 | 202; krop: CommerceSyncResult }
  | { ok: false; kode: Fejlkode; besked: string; detaljer?: string[] };

/** Stabil hash af den normaliserede tilstand — til support og dublet-genkendelse. */
export function tilstandsHash(o: CommerceOrder): string {
  const { provider_metadata: _udeladt, ...uden } = o;
  void _udeladt;
  const stabil = (v: unknown): unknown =>
    Array.isArray(v)
      ? v.map(stabil)
      : v && typeof v === "object"
        ? Object.fromEntries(
            Object.keys(v as object)
              .sort()
              .map((k) => [k, stabil((v as Record<string, unknown>)[k])]),
          )
        : v;
  return createHash("sha256").update(JSON.stringify(stabil(uden))).digest("hex");
}

export async function synkroniserOrdre(
  integration: IntegrationRow,
  krop: unknown,
  requestId: string,
  deps: SynkAfhaengigheder,
): Promise<SynkUdfald> {
  const v = valider("sync", krop);
  if (!v.ok) {
    return { ok: false, kode: "invalid_contract", besked: "Ordren følger ikke CommerceOrder v1.", detaljer: v.fejl };
  }
  const { order, observed_at } = krop as { order: CommerceOrder; observed_at: string };

  /*
   * EN TILSTAND FRA FREMTIDEN KAN FRYSE ORDREN. "Nyeste vinder" betyder, at
   * en `observed_at` langt ude i fremtiden ville afvise hver eneste rigtige
   * opdatering bagefter — også refunderingen. Adapterens ur må afvige lige
   * så meget som signaturens (±300 s); platformens `updated_at` et døgn.
   */
  const nu = (deps.nu ? deps.nu() : new Date()).getTime();
  if (Date.parse(observed_at) > nu + MAKS_URFORSKEL_SEKUNDER * 1000) {
    return { ok: false, kode: "invalid_contract", besked: "observed_at ligger i fremtiden." };
  }
  if (Date.parse(order.updated_at) > nu + 24 * 3_600_000) {
    return { ok: false, kode: "invalid_contract", besked: "Ordrens updated_at ligger i fremtiden." };
  }

  const regnestykker = orderInvariants(order);
  if (regnestykker.length) {
    return { ok: false, kode: "invalid_contract", besked: "Ordrens beløb går ikke op.", detaljer: regnestykker };
  }

  // BINDINGEN: en integration taler kun på vegne af SIN butik på SIN platform.
  if (order.provider !== integration.provider) {
    return { ok: false, kode: "provider_mismatch", besked: "Ordrens provider passer ikke til integrationen." };
  }
  if (order.external_store_id !== integration.external_store_id) {
    return { ok: false, kode: "store_mismatch", besked: "Ordren er fra en anden butik end integrationen." };
  }
  // INGEN VALUTAOMREGNING I V1.
  if (order.currency !== integration.currency || !erUnderstoettetValuta(order.currency)) {
    return { ok: false, kode: "unsupported_currency", besked: `Valutaen ${order.currency} understøttes ikke for denne butik.` };
  }

  const { earning_qualified, eligible_spend_minor } = beregnEligibleSpend(order);
  const kunde = await findKunde(integration.company_id, integration.id, order.customer, deps);
  const programmer = await deps.hentProgrammer(integration, order.external_order_id);

  const targets = [
    ...programmer.point.map((p) => ({
      kind: "points" as const,
      program_id: p.id,
      target: pointTarget(p, eligible_spend_minor, earning_qualified),
    })),
    ...programmer.stempel.map((s) => ({
      kind: "stamps" as const,
      program_id: s.id,
      target: stempelTarget(eligible_spend_minor, earning_qualified, s.min_order_minor),
    })),
  ];

  const svar = await deps.synk({
    integrationId: integration.id,
    order: {
      external_order_id: order.external_order_id,
      external_order_number: order.external_order_number,
      order_status: order.order_status,
      payment_status: order.payment_status,
      currency: order.currency,
      created_at: order.created_at,
      updated_at: order.updated_at,
      paid_at: order.paid_at,
      external_customer_id: order.customer.external_customer_id,
      email_norm: kunde.emailNorm,
      amounts: order.amounts,
      // Kun beløb og id'er — ingen begrundelser, ingen varenavne.
      refunds: order.refunds.map((r) => ({
        external_refund_id: r.external_refund_id,
        created_at: r.created_at,
        total_incl_tax: r.total_incl_tax,
        items_incl_tax: r.line_items.reduce((s, l) => s + l.total_ex_tax + l.total_tax, 0),
        shipping_incl_tax: r.shipping_ex_tax + r.shipping_tax,
        fees_incl_tax: r.fees_incl_tax,
      })),
    },
    observedAt: observed_at,
    stateHash: tilstandsHash(order),
    eligible: eligible_spend_minor,
    qualified: earning_qualified,
    memberId: kunde.memberId,
    resolution: kunde.resolution,
    targets,
    requestId,
  });

  if (!svar.ok) {
    return svar.fejl === "integration_inactive"
      ? { ok: false, kode: "integration_inactive", besked: "Integrationen er afbrudt." }
      : { ok: false, kode: "internal_error", besked: "Ordren kunne ikke gemmes. Prøv igen." };
  }

  let bidrag = svar.bidrag ?? [];
  if (!svar.stale) {
    const opdateret: BidragSvar[] = [];
    for (const b of bidrag) {
      if (b.kind !== "stamps") {
        opdateret.push(b);
        continue;
      }
      const r = await deps.anvendStempel(b.id);
      opdateret.push(
        r ? { ...b, target: r.target, foer: r.foer, efter: r.efter, status: r.status, grund: r.grund } : b,
      );
    }
    bidrag = opdateret;
  }

  const sum = (kind: "points" | "stamps", f: (b: BidragSvar) => number) =>
    bidrag.filter((b) => b.kind === kind).reduce((s, b) => s + Number(f(b) ?? 0), 0);

  const expected = { points: sum("points", (b) => b.target), stamps: sum("stamps", (b) => b.target) };
  const foer = { points: sum("points", (b) => b.foer), stamps: sum("stamps", (b) => b.foer) };
  const efter = { points: sum("points", (b) => b.efter), stamps: sum("stamps", (b) => b.efter) };
  const delta = { points: efter.points - foer.points, stamps: efter.stamps - foer.stamps };

  const receivedAt = (deps.nu ? deps.nu() : new Date()).toISOString().replace(/\.\d{3}Z$/, "Z");
  const base = {
    external_order_id: order.external_order_id,
    received_at: receivedAt,
    contribution: { expected, already_applied: foer, delta },
  };

  if (svar.stale) {
    return { ok: true, http: 200, krop: { status: "unchanged", ...base } };
  }

  const ufaerdige = bidrag.filter((b) => b.efter !== b.target);
  if (ufaerdige.length) {
    const reason: CommerceSyncResult["reason"] = ufaerdige.some((b) => b.status === "awaiting_customer")
      ? "customer_not_linked"
      : ufaerdige.some((b) => b.grund === "program-ikke-aktivt" || b.grund === "Programmet er ikke aktivt.")
        ? "program_inactive"
        : undefined;
    return {
      ok: true,
      http: 202,
      krop: { status: "deferred", ...base, ...(reason ? { reason } : {}) },
    };
  }

  const aendret = delta.points !== 0 || delta.stamps !== 0;
  return { ok: true, http: 200, krop: { status: aendret ? "applied" : "unchanged", ...base } };
}
