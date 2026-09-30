import type { NextResponse } from "next/server";
import { CommerceNoegleFejl, dekrypter } from "./secret";
import {
  kanoniskStreng,
  sha256Hex,
  signer,
  signaturPasser,
  tidsstempelGyldigt,
  MAKS_URFORSKEL_SEKUNDER,
} from "./hmac";
import { fejlSvar, type Fejlkode, type FejlSvar } from "./errors";
import type { IntegrationRow } from "./rows";

/**
 * HVEM TALER VI MED? — hver signeret anmodning passerer her.
 *
 * Rækkefølgen er valgt, så en fremmed lærer mindst muligt og ikke kan brænde
 * noget af:
 *
 *   1. Headernes FORM (uden at slå noget op).
 *   2. Integrationen findes og er aktiv — ellers `unknown_integration` /
 *      `integration_inactive`. En afbrudt integration har ingen nøgle mere.
 *   3. SIGNATUREN over den RÅ krop, i konstant tid. Først nu ved vi, at den,
 *      der spørger, kender nøglen.
 *   4. Tidsstemplet (±300 s).
 *   5. Request-id'et er ikke brugt før, og hastighedsgrænsen er ikke nået —
 *      ét kald til basen (`commerce_godkend`), EFTER signaturen, så en fremmed
 *      ikke kan fylde gentagelsestabellen op.
 *   6. Virksomheden har stadig LoyalSum Komplet (eller Komplet Online).
 *
 * Mangler krypteringsnøglen på serveren, svares `commerce_unavailable` (503):
 * webshopfunktionen er slået fra, men intet andet i LoyalSum påvirkes.
 *
 * Afhængighederne sprøjtes ind, så hver af de seks kan prøves alene uden en
 * database — se `auth.test.ts`.
 */

export const API_VERSION = "v1";
/** Kald pr. integration pr. vindue. Rigeligt til en fuld gensynkronisering. */
export const RATE_LIMIT = 600;
export const RATE_VINDUE_SEKUNDER = 60;
/** Et request-id huskes længere end urets vindue på begge sider. */
export const REPLAY_SEKUNDER = MAKS_URFORSKEL_SEKUNDER * 2 + 60;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface AuthAfhaengigheder {
  hentIntegration(id: string): Promise<IntegrationRow | null>;
  godkend(
    integrationId: string,
    requestId: string,
  ): Promise<{ ok: true } | { ok: false; fejl: "replay_detected" | "rate_limited"; retryAfter?: number }>;
  harAdgang(companyId: string): Promise<boolean>;
  dekrypter?(chiffer: string): string | null;
  /**
   * Krypterer nøglen om med den AKTUELLE krypteringsnøgle, hvis den er låst
   * med en tidligere. Kaldes kun efter et fuldt godkendt kald.
   */
  genkrypter?(integration: IntegrationRow, noegle: string): Promise<void>;
  nuSekunder?(): number;
}

export interface Anmodning {
  metode: string;
  /** Stien inkl. query, som klienten sendte den. */
  sti: string;
  headers: Headers;
  raaKrop: Uint8Array;
}

export type Godkendt = {
  ok: true;
  integration: IntegrationRow;
  requestId: string;
  harAdgang: boolean;
};

export type Afvist = {
  ok: false;
  kode: Fejlkode;
  svar: NextResponse<FejlSvar>;
  integrationId: string | null;
  requestId: string | null;
};

function afvis(
  kode: Fejlkode,
  besked: string,
  integrationId: string | null,
  requestId: string | null,
  retryAfter?: number,
): Afvist {
  return {
    ok: false,
    kode,
    svar: fejlSvar(kode, besked, { retryAfter }),
    integrationId,
    requestId,
  };
}

export async function godkendAnmodning(
  a: Anmodning,
  deps: AuthAfhaengigheder,
  opts: { kraevAdgang?: boolean } = {},
): Promise<Godkendt | Afvist> {
  const kraevAdgang = opts.kraevAdgang ?? true;
  const integrationId = a.headers.get("x-loyalsum-integration")?.trim() ?? "";
  const timestamp = a.headers.get("x-loyalsum-timestamp")?.trim() ?? "";
  const requestId = a.headers.get("x-loyalsum-request-id")?.trim() ?? "";
  const signatur = a.headers.get("x-loyalsum-signature")?.trim() ?? "";
  const version = a.headers.get("x-loyalsum-api-version")?.trim();

  const iid = UUID.test(integrationId) ? integrationId : null;
  const rid = UUID.test(requestId) ? requestId.toLowerCase() : null;

  // 1) Formen.
  if (version && version !== API_VERSION) {
    return afvis("contract_version_unsupported", `API-version ${version} understøttes ikke her.`, iid, rid);
  }
  if (!iid) return afvis("unknown_integration", "Ukendt integration.", null, rid);
  if (!signatur) return afvis("invalid_signature", "Signaturen mangler.", iid, rid);
  if (!/^\d{10}$/.test(timestamp)) {
    return afvis("request_expired", "Tidsstemplet mangler eller har forkert form.", iid, rid);
  }
  if (!rid) return afvis("invalid_signature", "Request-id skal være et UUID.", iid, null);

  // 2) Integrationen.
  const integration = await deps.hentIntegration(iid);
  if (!integration) return afvis("unknown_integration", "Ukendt integration.", iid, rid);
  if (integration.status !== "active" || !integration.secret_ciphertext) {
    return afvis("integration_inactive", "Integrationen er afbrudt. Forbind butikken igen fra LoyalSum.", iid, rid);
  }

  // 3) Signaturen — over den rå krop, før noget parses.
  let noegle: string | null;
  try {
    noegle = (deps.dekrypter ?? dekrypter)(integration.secret_ciphertext);
  } catch (e) {
    if (e instanceof CommerceNoegleFejl) {
      // Serveren er ikke sat op — ikke kaldets skyld, og et genforsøg kan
      // hjælpe, når nøglen er på plads. Ingen detaljer om nøglen i svaret.
      return afvis("commerce_unavailable", "Webshopintegrationen er midlertidigt utilgængelig.", iid, rid);
    }
    throw e;
  }
  if (!noegle) {
    // Nøglen kan ikke læses (fx roteret hovednøgle). Det er ikke kaldets
    // skyld, men et genforsøg hjælper heller ikke: butikken skal parres igen.
    return afvis("invalid_signature", "Signaturen kunne ikke efterprøves. Forbind butikken igen.", iid, rid);
  }
  const forventet = signer(
    noegle,
    kanoniskStreng({
      timestamp,
      requestId,
      metode: a.metode,
      sti: a.sti,
      kropHash: sha256Hex(a.raaKrop),
    }),
  );
  if (!signaturPasser(forventet, signatur)) {
    return afvis("invalid_signature", "Signaturen passer ikke.", iid, rid);
  }

  // 4) Tidsstemplet.
  const nu = deps.nuSekunder ? deps.nuSekunder() : Math.floor(Date.now() / 1000);
  if (!tidsstempelGyldigt(timestamp, nu)) {
    return afvis("request_expired", `Tidsstemplet er mere end ${MAKS_URFORSKEL_SEKUNDER} sekunder fra serverens ur.`, iid, rid);
  }

  // 5) Gentagelse og hastighed.
  const g = await deps.godkend(iid, rid);
  if (!g.ok) {
    return g.fejl === "rate_limited"
      ? afvis("rate_limited", "For mange kald. Prøv igen om lidt.", iid, rid, g.retryAfter ?? RATE_VINDUE_SEKUNDER)
      : afvis("replay_detected", "Request-id er allerede brugt.", iid, rid);
  }

  // 6) Abonnementet.
  const harAdgang = await deps.harAdgang(integration.company_id);
  if (kraevAdgang && !harAdgang) {
    return afvis("entitlement_required", "Webshopintegrationen kræver LoyalSum Komplet.", iid, rid);
  }

  if (deps.genkrypter) await deps.genkrypter(integration, noegle);

  return { ok: true, integration, requestId: rid, harAdgang };
}
