import "server-only";
import { commerceDb, type CommerceDb } from "./db";
import { valider } from "./contract";
import { erFejlkode, type Fejlkode } from "./errors";
import type { CustomerLinkRow, IntegrationRow, ReservationRow, RewardChannelRow } from "./rows";
import type { CommerceMoney } from "./types";

/**
 * SALDO, BELØNNINGER OG RESERVATIONER — kun for en BEKRÆFTET kobling.
 *
 * `loyalsum_customer_ref` slås op sammen med integrationen, så en reference
 * fra en anden butik (eller en anden virksomhed) ikke finder noget. En
 * ubekræftet kobling svarer som en ukendt: `customer_not_linked`. Kun
 * belønninger, butikken har slået til for DENNE kanal, vises — en "gratis
 * kaffe" ved disken bliver ikke af sig selv en webshoprabat.
 */

/** Kontraktens reservationer lever en halv time. Rigeligt til en betaling. */
export const RESERVATION_TTL_SEKUNDER = 30 * 60;

const iso = (s: string) => new Date(s).toISOString().replace(/\.\d{3}Z$/, "Z");

export async function hentBekraeftetKobling(
  integration: IntegrationRow,
  ref: string | null,
  db: CommerceDb = commerceDb(),
): Promise<CustomerLinkRow | null> {
  if (!ref || !/^lc_[0-9a-f]{32}$/.test(ref)) return null;
  const { data } = await db
    .from("commerce_customer_links")
    .select("id, company_id, integration_id, external_customer_id, email_norm, member_id, customer_ref, status, link_method, verification_expires_at, verification_sent_at, verified_at")
    .eq("customer_ref", ref)
    .eq("integration_id", integration.id)
    .eq("status", "verified")
    .maybeSingle();
  const link = data as CustomerLinkRow | null;
  return link?.member_id ? link : null;
}

/** Webshoppens pointprogram (højst ét pr. kanal, se 0049). */
async function kanalensPointprogram(db: CommerceDb, integration: IntegrationRow) {
  const { data: kanal } = await db
    .from("commerce_program_channels")
    .select("point_program_id")
    .eq("company_id", integration.company_id)
    .eq("provider", integration.provider)
    .eq("enabled", true)
    .not("point_program_id", "is", null)
    .maybeSingle();
  if (!kanal?.point_program_id) return null;
  const { data: prog } = await db
    .from("loyalty_point_programs")
    .select("id, status")
    .eq("id", kanal.point_program_id)
    .eq("company_id", integration.company_id)
    .maybeSingle();
  return (prog as { id: string; status: string } | null) ?? null;
}

async function saldo(db: CommerceDb, programId: string, memberId: string) {
  const { data: konto } = await db
    .from("loyalty_point_accounts")
    .select("balance")
    .eq("program_id", programId)
    .eq("member_id", memberId)
    .maybeSingle();
  const { data: reserveret } = await db.rpc("commerce_reserverede_point", {
    p_program: programId,
    p_member: memberId,
  });
  const balance = Number(konto?.balance ?? 0);
  const res = Number(reserveret ?? 0);
  return { balance, reserveret: res, brugbar: Math.max(0, balance - res) };
}

export async function kundensLoyalitet(
  integration: IntegrationRow,
  link: CustomerLinkRow,
  db: CommerceDb = commerceDb(),
) {
  const memberId = link.member_id!;
  const program = await kanalensPointprogram(db, integration);
  const s = program ? await saldo(db, program.id, memberId) : { balance: 0, reserveret: 0, brugbar: 0 };

  const { data: kanaler } = await db
    .from("commerce_program_channels")
    .select("stamp_program_id")
    .eq("company_id", integration.company_id)
    .eq("provider", integration.provider)
    .eq("enabled", true)
    .not("stamp_program_id", "is", null);
  const stempelIds = ((kanaler ?? []) as { stamp_program_id: string }[]).map((k) => k.stamp_program_id);

  const stamp_cards: { program_id: string; stamps: number; stamps_required: number }[] = [];
  if (stempelIds.length) {
    const { data: medlemskaber } = await db
      .from("loyalty_memberships")
      .select("id, program_id, balance_cache")
      .eq("member_id", memberId)
      .eq("company_id", integration.company_id)
      .in("program_id", stempelIds);
    const { data: primaere } = await db
      .from("loyalty_rewards")
      .select("program_id, required_stamps")
      .in("program_id", stempelIds)
      .eq("is_primary", true)
      .eq("status", "active");
    const krav = new Map(
      ((primaere ?? []) as { program_id: string; required_stamps: number }[]).map((r) => [r.program_id, r.required_stamps]),
    );
    for (const m of (medlemskaber ?? []) as { program_id: string; balance_cache: number }[]) {
      const required = krav.get(m.program_id);
      if (!required) continue;
      stamp_cards.push({
        program_id: m.program_id,
        stamps: Math.max(0, Number(m.balance_cache ?? 0)),
        stamps_required: required,
      });
    }
  }

  return {
    loyalsum_customer_ref: link.customer_ref,
    points: s.balance,
    // Tillæg til kontrakten (valgfrie felter): hvad der kan BRUGES nu.
    spendable_points: s.brugbar,
    reserved_points: s.reserveret,
    stamp_cards,
  };
}

function vaerdi(k: RewardChannelRow) {
  return k.discount_type === "fixed_amount"
    ? { type: "fixed_amount" as const, money: { amount_minor: Number(k.amount_minor), currency: k.currency! } }
    : { type: "percentage" as const, percentage_bp: Number(k.percentage_bp) };
}

export async function kundensBeloenninger(
  integration: IntegrationRow,
  link: CustomerLinkRow,
  db: CommerceDb = commerceDb(),
) {
  const program = await kanalensPointprogram(db, integration);
  if (!program) return { rewards: [] };
  const s = await saldo(db, program.id, link.member_id!);

  const { data: kanaler } = await db
    .from("commerce_reward_channels")
    .select("id, company_id, provider, point_reward_id, enabled, discount_type, amount_minor, currency, percentage_bp")
    .eq("company_id", integration.company_id)
    .eq("provider", integration.provider)
    .eq("enabled", true);
  const kanalListe = (kanaler ?? []) as RewardChannelRow[];
  if (!kanalListe.length) return { rewards: [] };

  const { data: bel } = await db
    .from("loyalty_point_rewards")
    .select("id, name, points_cost, status, sort_order")
    .eq("program_id", program.id)
    .eq("company_id", integration.company_id)
    .eq("status", "active")
    .in("id", kanalListe.map((k) => k.point_reward_id))
    .order("sort_order")
    .order("points_cost");

  const rewards = ((bel ?? []) as { id: string; name: string; points_cost: number }[])
    .map((b) => {
      const k = kanalListe.find((x) => x.point_reward_id === b.id)!;
      // En fast rabat i en anden valuta end butikkens kan ikke gives.
      if (k.discount_type === "fixed_amount" && k.currency !== integration.currency) return null;
      const pauset = program.status !== "active";
      const raekker = s.brugbar >= b.points_cost;
      return {
        reward_id: b.id,
        program_type: "points" as const,
        title: b.name.slice(0, 120),
        cost: { unit: "points" as const, amount: b.points_cost },
        value: vaerdi(k),
        available: !pauset && raekker,
        ...(pauset
          ? { unavailable_reason: "program_paused" as const }
          : !raekker
            ? { unavailable_reason: "insufficient_balance" as const }
            : {}),
      };
    })
    .filter((r): r is NonNullable<typeof r> => r !== null);

  return { rewards };
}

export function reservationsKrop(integration: IntegrationRow, r: ReservationRow) {
  return {
    reservation_id: r.id,
    reward_id: r.point_reward_id ?? r.id,
    provider: integration.provider,
    external_store_id: integration.external_store_id,
    external_cart_ref: r.external_cart_ref,
    external_order_id: r.external_order_id,
    status: r.status,
    expires_at: iso(r.expires_at),
    discount: { amount_minor: Number(r.discount_minor), currency: r.currency } satisfies CommerceMoney,
  };
}

async function hentReservation(db: CommerceDb, integration: IntegrationRow, id: string) {
  const { data } = await db
    .from("commerce_reward_reservations")
    .select("id, company_id, integration_id, link_id, member_id, point_program_id, point_reward_id, reward_navn, points_reserved, discount_type, discount_minor, currency, external_cart_ref, status, expires_at, external_order_id")
    .eq("id", id)
    .eq("integration_id", integration.id)
    .maybeSingle();
  return (data as ReservationRow | null) ?? null;
}

type ResUdfald =
  | { ok: true; http: 200 | 201; krop: ReturnType<typeof reservationsKrop> }
  | { ok: false; kode: Fejlkode; besked: string; detaljer?: string[] };

const BESKEDER: Partial<Record<Fejlkode, string>> = {
  customer_not_linked: "Kunden er ikke koblet til LoyalSum i denne butik.",
  reward_unavailable: "Belønningen kan ikke bruges i webshoppen lige nu.",
  insufficient_points: "Kunden har ikke point nok.",
  unsupported_currency: "Kurvens valuta passer ikke til butikken.",
  reservation_not_found: "Reservationen findes ikke.",
  reservation_expired: "Reservationen er udløbet eller frigivet.",
  reservation_state_conflict: "Reservationen er allerede brugt til en anden ordre.",
  integration_inactive: "Integrationen er afbrudt.",
};

function afvisning(fejl: string | undefined): ResUdfald {
  const kode: Fejlkode = erFejlkode(fejl) ? fejl : "internal_error";
  return { ok: false, kode, besked: BESKEDER[kode] ?? "Der skete en fejl hos LoyalSum." };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function reserver(
  integration: IntegrationRow,
  krop: unknown,
  db: CommerceDb = commerceDb(),
): Promise<ResUdfald> {
  const v = valider("reserve", krop);
  if (!v.ok) return { ok: false, kode: "invalid_request", besked: "Reservationen følger ikke kontrakten.", detaljer: v.fejl };
  const k = krop as {
    reward_id: string;
    loyalsum_customer_ref: string;
    external_cart_ref: string;
    cart_items_total_incl_tax: CommerceMoney;
  };
  if (!UUID.test(k.reward_id)) return afvisning("reward_unavailable");
  if (k.external_cart_ref.length < 1 || k.external_cart_ref.length > 255) {
    return { ok: false, kode: "invalid_request", besked: "external_cart_ref skal være 1-255 tegn." };
  }

  const { data, error } = await db.rpc("commerce_reserver", {
    p_integration: integration.id,
    p_customer_ref: k.loyalsum_customer_ref,
    p_reward: k.reward_id,
    p_cart_ref: k.external_cart_ref,
    p_cart_total: k.cart_items_total_incl_tax.amount_minor,
    p_currency: k.cart_items_total_incl_tax.currency,
    p_ttl_seconds: RESERVATION_TTL_SEKUNDER,
  });
  if (error) throw new Error(`reserver: ${error.message}`);
  const s = data as { ok: boolean; fejl?: string; reservation_id?: string };
  if (!s.ok) return afvisning(s.fejl);
  const r = await hentReservation(db, integration, s.reservation_id!);
  if (!r) throw new Error("reserver: reservationen kunne ikke læses");
  return { ok: true, http: 201, krop: reservationsKrop(integration, r) };
}

export async function frigiv(
  integration: IntegrationRow,
  krop: unknown,
  db: CommerceDb = commerceDb(),
): Promise<ResUdfald> {
  const v = valider("release", krop);
  if (!v.ok) return { ok: false, kode: "invalid_request", besked: "Kroppen følger ikke kontrakten.", detaljer: v.fejl };
  const { reservation_id } = krop as { reservation_id: string };
  if (!UUID.test(reservation_id)) return afvisning("reservation_not_found");
  const { data, error } = await db.rpc("commerce_frigiv", {
    p_integration: integration.id,
    p_reservation: reservation_id,
  });
  if (error) throw new Error(`frigiv: ${error.message}`);
  const s = data as { ok: boolean; fejl?: string };
  if (!s.ok) return afvisning(s.fejl);
  const r = await hentReservation(db, integration, reservation_id);
  if (!r) return afvisning("reservation_not_found");
  return { ok: true, http: 200, krop: reservationsKrop(integration, r) };
}

export async function commit(
  integration: IntegrationRow,
  krop: unknown,
  db: CommerceDb = commerceDb(),
): Promise<ResUdfald> {
  const v = valider("commit", krop);
  if (!v.ok) return { ok: false, kode: "invalid_request", besked: "Kroppen følger ikke kontrakten.", detaljer: v.fejl };
  const { reservation_id, external_order_id } = krop as { reservation_id: string; external_order_id: string };
  if (!UUID.test(reservation_id)) return afvisning("reservation_not_found");
  if (external_order_id.length < 1 || external_order_id.length > 255) {
    return { ok: false, kode: "invalid_request", besked: "external_order_id skal være 1-255 tegn." };
  }
  const { data, error } = await db.rpc("commerce_commit", {
    p_integration: integration.id,
    p_reservation: reservation_id,
    p_external_order_id: external_order_id,
  });
  if (error) throw new Error(`commit: ${error.message}`);
  const s = data as { ok: boolean; fejl?: string };
  if (!s.ok) return afvisning(s.fejl);
  const r = await hentReservation(db, integration, reservation_id);
  if (!r) return afvisning("reservation_not_found");
  return { ok: true, http: 200, krop: reservationsKrop(integration, r) };
}
