import type { CommerceProvider } from "./types";

/** Rækkerne fra migration 0049, som koden læser dem. */

export type IntegrationStatus = "active" | "paused" | "revoked";

export interface IntegrationRow {
  id: string;
  company_id: string;
  provider: CommerceProvider;
  external_store_id: string;
  store_url: string;
  store_name: string | null;
  currency: string;
  adapter_version: string | null;
  platform_version: string | null;
  status: IntegrationStatus;
  secret_ciphertext: string | null;
  connected_at: string;
  disconnected_at: string | null;
  last_successful_sync_at: string | null;
  last_error_at: string | null;
  last_error_code: string | null;
}

export interface ProgramChannelRow {
  id: string;
  company_id: string;
  provider: CommerceProvider;
  point_program_id: string | null;
  stamp_program_id: string | null;
  enabled: boolean;
  min_order_minor: number | null;
}

export interface RewardChannelRow {
  id: string;
  company_id: string;
  provider: CommerceProvider;
  point_reward_id: string;
  enabled: boolean;
  discount_type: "fixed_amount" | "percentage";
  amount_minor: number | null;
  currency: string | null;
  percentage_bp: number | null;
}

export interface CustomerLinkRow {
  id: string;
  company_id: string;
  integration_id: string;
  external_customer_id: string | null;
  email_norm: string;
  member_id: string | null;
  customer_ref: string;
  status: "pending" | "verified" | "revoked";
  link_method: "verified_email" | "loyalsum_login" | "store_owner_confirmed" | null;
  verification_expires_at: string | null;
  verification_sent_at: string | null;
  verified_at: string | null;
}

export interface ContributionRow {
  id: string;
  company_id: string;
  integration_id: string;
  order_id: string;
  external_order_id: string;
  point_program_id: string | null;
  stamp_program_id: string | null;
  member_id: string | null;
  target: number;
  applied: number;
  ledger_seq: number;
  status: "pending" | "applied" | "awaiting_customer" | "blocked" | "member_deleted";
  status_reason: string | null;
}

export interface ReservationRow {
  id: string;
  company_id: string;
  integration_id: string;
  link_id: string;
  member_id: string;
  point_program_id: string;
  point_reward_id: string | null;
  reward_navn: string;
  points_reserved: number;
  discount_type: "fixed_amount" | "percentage";
  discount_minor: number;
  currency: string;
  external_cart_ref: string;
  status: "reserved" | "committed" | "released" | "expired";
  expires_at: string;
  external_order_id: string | null;
}
