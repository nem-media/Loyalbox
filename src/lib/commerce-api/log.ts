/**
 * ÉN LOGLINJE PR. ANMODNING — og intet, der ikke hører til.
 *
 * Med: integrationens id, request-id, handlingen, resultatet, fejlkoden, den
 * eksterne ordrereference og tidspunktet — dét, support skal bruge for at
 * følge en ordre fra butikken til ledgeren.
 *
 * ALDRIG med: nøglen, signaturen, kundens e-mail, kroppen eller
 * `provider_metadata`. Felterne her er en HVIDLISTE: en ny oplysning skal
 * skrives ind som et felt, den kan ikke glide med i et objekt.
 */
export interface CommerceLogLinje {
  operation: string;
  result: "ok" | "error";
  integration_id?: string | null;
  request_id?: string | null;
  external_order_id?: string | null;
  error_code?: string | null;
  status?: number;
  sync_status?: string;
  duration_ms?: number;
}

export function commerceLog(l: CommerceLogLinje): void {
  const linje = JSON.stringify({
    component: "commerce-api",
    ts: new Date().toISOString(),
    operation: l.operation,
    result: l.result,
    integration_id: l.integration_id ?? null,
    request_id: l.request_id ?? null,
    external_order_id: l.external_order_id ?? null,
    error_code: l.error_code ?? null,
    status: l.status ?? null,
    sync_status: l.sync_status ?? null,
    duration_ms: l.duration_ms ?? null,
  });
  if (l.result === "error") console.warn(linje);
  else console.info(linje);
}
