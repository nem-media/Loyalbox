import "server-only";
import type { NextRequest, NextResponse } from "next/server";
import { godkendAnmodning, type Godkendt } from "./auth";
import { fejlSvar } from "./errors";
import { commerceLog } from "./log";
import { authAfhaengigheder, noterIntegrationsfejl } from "./service";

/**
 * FÆLLES FOR DE SIGNEREDE ENDPOINTS.
 *
 * Kroppen læses som RÅ BYTES og hashes, FØR den parses — kontrakten kræver
 * det, og en parse-og-serialisér ville ændre mellemrum og rækkefølge og få
 * signaturen til at fejle. Stien er den, klienten sendte, inkl. query.
 *
 * En uventet fejl bliver til `internal_error` (500, `retryable: true`), så
 * adapterens kø prøver igen — aldrig til en stak med interne detaljer.
 */

export interface Kontekst extends Godkendt {
  krop: unknown;
  raaKrop: Uint8Array;
  url: URL;
}

type Handling = (k: Kontekst) => Promise<{ svar: NextResponse; externalOrderId?: string | null; syncStatus?: string }>;

export async function signeret(
  req: NextRequest,
  operation: string,
  handling: Handling,
  opts: { kraevAdgang?: boolean; laesKrop?: boolean } = {},
): Promise<NextResponse> {
  const start = Date.now();
  const url = new URL(req.url);
  let integrationId: string | null = null;
  let requestId: string | null = null;
  try {
    const raaKrop = new Uint8Array(await req.arrayBuffer());
    const g = await godkendAnmodning(
      { metode: req.method, sti: url.pathname + url.search, headers: req.headers, raaKrop },
      authAfhaengigheder(),
      { kraevAdgang: opts.kraevAdgang },
    );
    if (!g.ok) {
      commerceLog({
        operation,
        result: "error",
        integration_id: g.integrationId,
        request_id: g.requestId,
        error_code: g.kode,
        status: g.svar.status,
        duration_ms: Date.now() - start,
      });
      return g.svar;
    }
    integrationId = g.integration.id;
    requestId = g.requestId;

    let krop: unknown = null;
    if (opts.laesKrop) {
      try {
        krop = JSON.parse(new TextDecoder("utf-8", { fatal: true }).decode(raaKrop));
      } catch {
        const svar = fejlSvar("invalid_request", "Kroppen er ikke gyldig JSON.");
        commerceLog({ operation, result: "error", integration_id: integrationId, request_id: requestId, error_code: "invalid_request", status: 400 });
        return svar;
      }
    }

    const r = await handling({ ...g, krop, raaKrop, url });
    const fejlkode = r.svar.status >= 400 ? await fejlkodeAf(r.svar) : null;
    if (fejlkode && r.svar.status < 500 && r.svar.status !== 404 && r.svar.status !== 409 && r.svar.status !== 410) {
      // En PERMANENT fejl på et gyldigt signeret kald: vis den i dashboardet.
      await noterIntegrationsfejl(integrationId, fejlkode);
    }
    commerceLog({
      operation,
      result: r.svar.status >= 400 ? "error" : "ok",
      integration_id: integrationId,
      request_id: requestId,
      external_order_id: r.externalOrderId ?? null,
      error_code: fejlkode,
      status: r.svar.status,
      sync_status: r.syncStatus,
      duration_ms: Date.now() - start,
    });
    return r.svar;
  } catch (e) {
    console.error(`[commerce-api] ${operation} fejlede:`, (e as Error).message);
    commerceLog({
      operation,
      result: "error",
      integration_id: integrationId,
      request_id: requestId,
      error_code: "internal_error",
      status: 500,
      duration_ms: Date.now() - start,
    });
    return fejlSvar("internal_error", "Der skete en fejl hos LoyalSum. Prøv igen.");
  }
}

async function fejlkodeAf(svar: NextResponse): Promise<string | null> {
  try {
    const k = (await svar.clone().json()) as { error?: string };
    return typeof k.error === "string" ? k.error : null;
  } catch {
    return null;
  }
}
