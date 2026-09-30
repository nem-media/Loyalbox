import "server-only";
import { commerceDb, type CommerceDb } from "./db";
import { commerceIPlan } from "@/lib/loyalty/plan";
import { giveStamp, reverseStamp } from "@/lib/loyalty/service";
import type { CompanyAccess } from "@/lib/loyalty/access";
import { RATE_LIMIT, RATE_VINDUE_SEKUNDER, REPLAY_SEKUNDER, type AuthAfhaengigheder } from "./auth";
import type { KundeAfhaengigheder } from "./customer";
import { anvendStempelbidrag, type StempelAfhaengigheder } from "./stamps";
import type { SynkAfhaengigheder, PointProgramInfo, StempelProgramInfo } from "./sync";
import type { ContributionRow, IntegrationRow } from "./rows";

/**
 * DE RIGTIGE AFHÆNGIGHEDER — Supabase med service-role.
 *
 * Modulerne `auth`, `sync`, `stamps` og `customer` regner og beslutter; her
 * står de kald, de gør det med. Alt er afgrænset til ÉN virksomhed eller ÉN
 * integration i selve forespørgslen, så et id fra en anden butik ikke engang
 * kan læses.
 */

const INTEGRATION_KOLONNER =
  "id, company_id, provider, external_store_id, store_url, store_name, currency, adapter_version, platform_version, status, secret_ciphertext, connected_at, disconnected_at, last_successful_sync_at, last_error_at, last_error_code";

export function authAfhaengigheder(db: CommerceDb = commerceDb()): AuthAfhaengigheder {
  return {
    async hentIntegration(id) {
      const { data, error } = await db
        .from("commerce_integrations")
        .select(INTEGRATION_KOLONNER)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`integration: ${error.message}`);
      return (data as IntegrationRow | null) ?? null;
    },
    async godkend(integrationId, requestId) {
      const { data, error } = await db.rpc("commerce_godkend", {
        p_integration: integrationId,
        p_request_id: requestId,
        p_limit: RATE_LIMIT,
        p_window_seconds: RATE_VINDUE_SEKUNDER,
        p_replay_seconds: REPLAY_SEKUNDER,
      });
      if (error) throw new Error(`godkend: ${error.message}`);
      const s = data as { ok: boolean; fejl?: string; retry_after?: number };
      if (s.ok) return { ok: true };
      return {
        ok: false,
        fejl: s.fejl === "rate_limited" ? "rate_limited" : "replay_detected",
        retryAfter: s.retry_after,
      };
    },
    harAdgang: (companyId) => commerceIPlan(companyId),
  };
}

export function kundeAfhaengigheder(db: CommerceDb = commerceDb()): KundeAfhaengigheder {
  return {
    async bekraeftetMedlem(integrationId, externalCustomerId) {
      const { data, error } = await db
        .from("commerce_customer_links")
        .select("member_id")
        .eq("integration_id", integrationId)
        .eq("external_customer_id", externalCustomerId)
        .eq("status", "verified")
        .not("member_id", "is", null)
        .order("verified_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw new Error(`kobling: ${error.message}`);
      return (data?.member_id as string | undefined) ?? null;
    },
    async medlemmerMedEmail(companyId, emailNorm) {
      const { data, error } = await db.rpc("commerce_find_medlemmer", {
        p_company: companyId,
        p_email_norm: emailNorm,
      });
      if (error) throw new Error(`medlemmer: ${error.message}`);
      return ((data ?? []) as (string | { commerce_find_medlemmer: string })[]).map((r) =>
        typeof r === "string" ? r : r.commerce_find_medlemmer,
      );
    },
  };
}

/**
 * Adgangen, stempelmotoren får, når det er en WEBSHOPORDRE, der stempler.
 *
 * `system: "commerce"` gør, at revisionsloggen ikke skriver en bruger som den
 * handlende — ingen person trykkede. Rettighederne er stempel-rettighederne:
 * motoren kræver dem, og det er det eneste, den bruger dem til.
 */
export function commerceAdgang(companyId: string): CompanyAccess {
  return {
    companyId,
    actorUserId: "",
    role: "owner",
    employeeId: null,
    permissions: { canStamp: true, canDiscount: false, canRedeem: false, canManage: false },
    system: "commerce",
  };
}

const BIDRAG_KOLONNER =
  "id, company_id, integration_id, order_id, external_order_id, point_program_id, stamp_program_id, member_id, target, applied, ledger_seq, status, status_reason";

export function stempelAfhaengigheder(db: CommerceDb = commerceDb()): StempelAfhaengigheder {
  return {
    async hentBidrag(id) {
      const { data, error } = await db
        .from("commerce_order_contributions")
        .select(BIDRAG_KOLONNER)
        .eq("id", id)
        .maybeSingle();
      if (error) throw new Error(`bidrag: ${error.message}`);
      return (data as ContributionRow | null) ?? null;
    },
    async sikreMedlemskab(companyId, programId, memberId) {
      // `unique (program_id, member_id)` (0004): to samtidige kald giver ét.
      await db
        .from("loyalty_memberships")
        .upsert(
          { company_id: companyId, program_id: programId, member_id: memberId },
          { onConflict: "program_id,member_id", ignoreDuplicates: true },
        );
      const { data } = await db
        .from("loyalty_memberships")
        .select("id")
        .eq("program_id", programId)
        .eq("member_id", memberId)
        .eq("company_id", companyId)
        .maybeSingle();
      return (data?.id as string | undefined) ?? null;
    },
    async findStempel(membershipId, reference) {
      const { data } = await db
        .from("loyalty_transactions")
        .select("id")
        .eq("membership_id", membershipId)
        .eq("reference", reference)
        .maybeSingle();
      if (!data) return null;
      const { data: modpost } = await db
        .from("loyalty_transactions")
        .select("id")
        .eq("reversal_of", data.id)
        .limit(1)
        .maybeSingle();
      return { id: data.id as string, tilbagefoert: Boolean(modpost) };
    },
    async givStempel(companyId, membershipId, reference, bidrag) {
      const { data: ordre } = await db
        .from("commerce_orders")
        .select("external_order_number, eligible_spend_minor")
        .eq("id", bidrag.order_id)
        .maybeSingle();
      const r = await giveStamp({
        access: commerceAdgang(companyId),
        membershipId,
        stamps: 1,
        type: "stamp_earned",
        source: "commerce",
        reference,
        note: ordre ? `Webshopordre ${ordre.external_order_number}` : "Webshopordre",
        amount:
          ordre && Number(ordre.eligible_spend_minor) <= 9_999_999_999
            ? Number(ordre.eligible_spend_minor) / 100
            : null,
      });
      return r.ok ? { ok: true } : { ok: false, fejl: r.error };
    },
    async tilbagefoer(companyId, txnId) {
      const r = await reverseStamp(commerceAdgang(companyId), txnId, "Webshopordre refunderet");
      if (r.ok) return { ok: true };
      return { ok: false, fejl: r.error, allerede: /allerede tilbageført/i.test(r.error) };
    },
    async gem(id, felter) {
      await db
        .from("commerce_order_contributions")
        .update({
          ...felter,
          ...(felter.status === "applied" ? { last_applied_at: new Date().toISOString() } : {}),
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .select("id");
    },
    async naesteGeneration(id, fra) {
      await db
        .from("commerce_order_contributions")
        .update({ ledger_seq: fra + 1, updated_at: new Date().toISOString() })
        .eq("id", id)
        .eq("ledger_seq", fra)
        .select("id");
    },
  };
}

/** Kanalernes programmer + dem, ordren allerede HAR bidraget til. */
async function hentProgrammer(
  db: CommerceDb,
  integration: IntegrationRow,
  externalOrderId: string,
): Promise<{ point: PointProgramInfo[]; stempel: StempelProgramInfo[] }> {
  const { data: kanaler, error } = await db
    .from("commerce_program_channels")
    .select("point_program_id, stamp_program_id, enabled, min_order_minor")
    .eq("company_id", integration.company_id)
    .eq("provider", integration.provider);
  if (error) throw new Error(`kanaler: ${error.message}`);

  const { data: ordre } = await db
    .from("commerce_orders")
    .select("id")
    .eq("integration_id", integration.id)
    .eq("external_order_id", externalOrderId)
    .maybeSingle();
  const { data: tidligere } = ordre
    ? await db
        .from("commerce_order_contributions")
        .select("point_program_id, stamp_program_id")
        .eq("order_id", ordre.id)
    : { data: [] as { point_program_id: string | null; stamp_program_id: string | null }[] };

  /*
   * ET PROGRAM, DER ER SLÅET FRA I KANALEN, GIVER IKKE NYE POINT — men en ordre,
   * der allerede har bidraget, skal stadig kunne REFUNDERES. Ellers kunne en
   * butik slå kanalen fra og efterlade point for varer, der er sendt retur.
   */
  const kanalListe = (kanaler ?? []) as {
    point_program_id: string | null;
    stamp_program_id: string | null;
    enabled: boolean;
    min_order_minor: number | null;
  }[];
  const pointIds = new Set<string>();
  const stempel = new Map<string, number | null>();
  for (const k of kanalListe) {
    if (k.enabled && k.point_program_id) pointIds.add(k.point_program_id);
    if (k.enabled && k.stamp_program_id) stempel.set(k.stamp_program_id, k.min_order_minor);
  }
  for (const t of tidligere ?? []) {
    if (t.point_program_id) pointIds.add(t.point_program_id);
    if (t.stamp_program_id && !stempel.has(t.stamp_program_id)) {
      const k = kanalListe.find((x) => x.stamp_program_id === t.stamp_program_id);
      stempel.set(t.stamp_program_id, k?.min_order_minor ?? null);
    }
  }

  let point: PointProgramInfo[] = [];
  if (pointIds.size) {
    const { data, error: fejl } = await db
      .from("loyalty_point_programs")
      .select("id, earn_model, earn_value")
      .eq("company_id", integration.company_id)
      .in("id", [...pointIds]);
    if (fejl) throw new Error(`pointprogrammer: ${fejl.message}`);
    point = (data ?? []) as PointProgramInfo[];
  }

  let stempelInfo: StempelProgramInfo[] = [];
  if (stempel.size) {
    const { data, error: fejl } = await db
      .from("loyalty_programs")
      .select("id")
      .eq("company_id", integration.company_id)
      .in("id", [...stempel.keys()]);
    if (fejl) throw new Error(`stempelkort: ${fejl.message}`);
    stempelInfo = ((data ?? []) as { id: string }[]).map((p) => ({
      id: p.id,
      min_order_minor: stempel.get(p.id) ?? null,
    }));
  }

  return { point, stempel: stempelInfo };
}

export function synkAfhaengigheder(db: CommerceDb = commerceDb()): SynkAfhaengigheder {
  const stempler = stempelAfhaengigheder(db);
  return {
    ...kundeAfhaengigheder(db),
    hentProgrammer: (integration, externalOrderId) => hentProgrammer(db, integration, externalOrderId),
    async synk(p) {
      const { data, error } = await db.rpc("commerce_synk_ordre", {
        p_integration: p.integrationId,
        p_order: p.order,
        p_observed_at: p.observedAt,
        p_state_hash: p.stateHash,
        p_eligible: p.eligible,
        p_qualified: p.qualified,
        p_member: p.memberId,
        p_resolution: p.resolution,
        p_targets: p.targets,
        p_request_id: p.requestId,
      });
      if (error) throw new Error(`synk: ${error.message}`);
      return data;
    },
    anvendStempel: (id) => anvendStempelbidrag(id, stempler),
  };
}

/** Husk den seneste fejl på integrationen, så dashboardet kan vise den. */
export async function noterIntegrationsfejl(
  integrationId: string,
  kode: string,
  db: CommerceDb = commerceDb(),
): Promise<void> {
  await db
    .from("commerce_integrations")
    .update({ last_error_at: new Date().toISOString(), last_error_code: kode })
    .eq("id", integrationId)
    .select("id");
}

/**
 * GØR KRAV PÅ VENTENDE OPTJENING for et medlem, hvis e-mail lige er
 * bekræftet. Point bogføres i basen; stempler gennem stempelmotoren.
 */
export async function goerKrav(
  companyId: string,
  memberId: string,
  emailNorm: string,
  db: CommerceDb = commerceDb(),
): Promise<{ ordrer: number }> {
  const { data, error } = await db.rpc("commerce_goer_krav", {
    p_company: companyId,
    p_member: memberId,
    p_email_norm: emailNorm,
  });
  if (error) throw new Error(`krav: ${error.message}`);
  const svar = data as { ok: boolean; ordrer?: number; stempelbidrag?: string[] };
  const deps = stempelAfhaengigheder(db);
  for (const id of svar.stempelbidrag ?? []) await anvendStempelbidrag(id, deps);
  return { ordrer: svar.ordrer ?? 0 };
}
