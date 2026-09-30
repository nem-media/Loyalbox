/**
 * CommerceOrder v1 og venner, som TypeScript-typer.
 *
 * Skrevet EFTER skemaerne i `contract/v1/schemas/` — skemaerne er kilden, og
 * alt, der kommer ind, er valideret mod dem, før det får en af disse typer.
 */

export type CommerceProvider = "woocommerce" | "shopify";
export const PROVIDERS: readonly CommerceProvider[] = ["woocommerce", "shopify"];

export type OrderStatus = "open" | "completed" | "cancelled";
export type PaymentStatus =
  | "unpaid"
  | "paid"
  | "partially_refunded"
  | "refunded"
  | "failed"
  | "voided";

export interface CommerceOrderLine {
  external_line_id: string;
  external_product_id: string;
  external_variant_id: string | null;
  sku: string | null;
  name?: string;
  quantity: number;
  subtotal_ex_tax: number;
  discount_ex_tax: number;
  total_ex_tax: number;
  total_tax: number;
}

export interface CommerceRefundLine {
  external_line_id: string;
  quantity: number;
  total_ex_tax: number;
  total_tax: number;
}

export interface CommerceRefund {
  external_refund_id: string;
  created_at: string;
  total_incl_tax: number;
  line_items: CommerceRefundLine[];
  shipping_ex_tax: number;
  shipping_tax: number;
  fees_incl_tax: number;
}

export interface CommerceCustomer {
  external_customer_id: string | null;
  email: string;
}

export interface CommerceOrder {
  schema: "commerce-order/v1";
  provider: CommerceProvider;
  external_store_id: string;
  external_order_id: string;
  external_order_number: string;
  order_status: OrderStatus;
  payment_status: PaymentStatus;
  currency: string;
  created_at: string;
  updated_at: string;
  paid_at: string | null;
  customer: CommerceCustomer;
  amounts: {
    items_subtotal_ex_tax: number;
    items_discount_ex_tax: number;
    items_total_ex_tax: number;
    items_tax: number;
    shipping_ex_tax: number;
    shipping_tax: number;
    fees_incl_tax: number;
    order_total_incl_tax: number;
  };
  line_items: CommerceOrderLine[];
  refunds: CommerceRefund[];
  provider_metadata?: Record<string, string | number | boolean | null>;
}

export interface CommerceStore {
  provider: CommerceProvider;
  external_store_id: string;
  store_url: string;
  name?: string;
  currency: string;
  platform_version?: string;
  adapter_version: string;
  provider_metadata?: Record<string, string | number | boolean | null>;
}

export interface CommerceMoney {
  amount_minor: number;
  currency: string;
}

export interface Units {
  points: number;
  stamps: number;
}

export interface CommerceSyncResult {
  status: "applied" | "unchanged" | "deferred" | "rejected";
  external_order_id: string;
  received_at: string;
  contribution: {
    expected: Units;
    already_applied: Units;
    delta: Units;
  };
  reason?:
    | "unknown_store"
    | "customer_not_linked"
    | "program_inactive"
    | "currency_mismatch"
    | "invalid_payload"
    | "store_paused";
}
