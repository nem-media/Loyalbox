import { NextResponse } from "next/server";

/**
 * FEJLENE ER EN KONTRAKT, IKKE EN TEKST.
 *
 * Kontraktens form (openapi.json, components.responses.Error):
 *
 *   { "error": "invalid_signature", "message": "…", "retryable": false }
 *
 * `error` er en STABIL, maskinlæsbar kode i små bogstaver — adapteren må aldrig
 * læse `message`, som er til et menneske og kan skrives om. `retryable` siger,
 * om et genforsøg kan hjælpe (WooCommerce' Action Scheduler og en Shopify-kø
 * skal kunne afgøre det uden at kende koden). `classification` siger det samme
 * i ord (`transient`/`permanent`); feltet er et tillæg, kontrakten tillader.
 *
 * Statuskoderne følger kontraktens tabel: 400/422 ugyldig krop, 401
 * signatur/integration, 404/410 ukendt/udløbet, 408/429/5xx midlertidigt.
 */

export const FEJLKODER = {
  invalid_signature: { status: 401, retryable: false },
  request_expired: { status: 401, retryable: false },
  replay_detected: { status: 401, retryable: false },
  unknown_integration: { status: 401, retryable: false },
  integration_inactive: { status: 401, retryable: false },
  entitlement_required: { status: 403, retryable: false },
  contract_version_unsupported: { status: 400, retryable: false },
  invalid_request: { status: 400, retryable: false },
  invalid_contract: { status: 422, retryable: false },
  unsupported_currency: { status: 422, retryable: false },
  provider_mismatch: { status: 422, retryable: false },
  store_mismatch: { status: 422, retryable: false },
  invalid_pairing_code: { status: 400, retryable: false },
  store_already_paired: { status: 409, retryable: false },
  customer_not_linked: { status: 404, retryable: false },
  insufficient_points: { status: 409, retryable: false },
  reward_unavailable: { status: 422, retryable: false },
  reservation_not_found: { status: 404, retryable: false },
  reservation_expired: { status: 410, retryable: false },
  reservation_state_conflict: { status: 409, retryable: false },
  rate_limited: { status: 429, retryable: true },
  internal_error: { status: 500, retryable: true },
} as const satisfies Record<string, { status: number; retryable: boolean }>;

export type Fejlkode = keyof typeof FEJLKODER;

export interface FejlSvar {
  error: Fejlkode;
  message: string;
  retryable: boolean;
  classification: "transient" | "permanent";
  details?: string[];
}

export function fejlKrop(kode: Fejlkode, message: string, details?: string[]): FejlSvar {
  const { retryable } = FEJLKODER[kode];
  return {
    error: kode,
    message,
    retryable,
    classification: retryable ? "transient" : "permanent",
    ...(details && details.length ? { details } : {}),
  };
}

export function fejlSvar(
  kode: Fejlkode,
  message: string,
  opts: { details?: string[]; retryAfter?: number } = {},
): NextResponse<FejlSvar> {
  const headers: Record<string, string> = { "Cache-Control": "no-store" };
  if (opts.retryAfter != null) headers["Retry-After"] = String(Math.max(1, opts.retryAfter));
  return NextResponse.json(fejlKrop(kode, message, opts.details), {
    status: FEJLKODER[kode].status,
    headers,
  });
}

export function okSvar<T>(krop: T, status = 200): NextResponse<T> {
  return NextResponse.json(krop, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

/** En kode, SQL-funktionerne kan svare med, der også er en API-fejlkode. */
export function erFejlkode(x: unknown): x is Fejlkode {
  return typeof x === "string" && Object.prototype.hasOwnProperty.call(FEJLKODER, x);
}
