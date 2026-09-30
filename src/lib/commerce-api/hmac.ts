import { createHash, createHmac, timingSafeEqual } from "node:crypto";

/**
 * SIGNATUREN — PRÆCIS SOM docs/security.md i kontrakten.
 *
 * Den kanoniske streng er seks linjer adskilt af `\n` og UDEN afsluttende
 * linjeskift:
 *
 *   v1
 *   <timestamp>
 *   <request-id>
 *   <METODE med store bogstaver>
 *   <sti inkl. query>
 *   <sha256 hex af den RÅ krop — også for en tom krop>
 *
 * signatur = "v1=" + hex(HMAC-SHA256(nøgle, kanonisk streng))
 *
 * `hmac.test.ts` holder den fast på kontraktens testvektor byte for byte. En
 * ændring her uden en ny kontraktversion er en brydende ændring for hvert
 * plugin, der er installeret.
 */

export const SIGNATUR_VERSION = "v1";
/** Kontraktens tilladte urforskel. */
export const MAKS_URFORSKEL_SEKUNDER = 300;

export function sha256Hex(krop: Uint8Array | string): string {
  return createHash("sha256").update(krop).digest("hex");
}

export function kanoniskStreng(p: {
  timestamp: string;
  requestId: string;
  metode: string;
  sti: string;
  kropHash: string;
}): string {
  return [
    SIGNATUR_VERSION,
    p.timestamp,
    p.requestId,
    p.metode.toUpperCase(),
    p.sti,
    p.kropHash,
  ].join("\n");
}

export function signer(noegle: string, kanonisk: string): string {
  return (
    `${SIGNATUR_VERSION}=` +
    createHmac("sha256", noegle).update(kanonisk, "utf8").digest("hex")
  );
}

const SIGNATUR_FORM = /^v1=[0-9a-f]{64}$/;

/**
 * Sammenligner i KONSTANT TID. Formen tjekkes først (den er ikke hemmelig), og
 * så sammenlignes de 32 bytes med `timingSafeEqual` — aldrig med `===`, som
 * afslører, hvor mange tegn der passede.
 */
export function signaturPasser(forventet: string, modtaget: string): boolean {
  if (!SIGNATUR_FORM.test(modtaget) || !SIGNATUR_FORM.test(forventet)) return false;
  const a = Buffer.from(forventet.slice(3), "hex");
  const b = Buffer.from(modtaget.slice(3), "hex");
  return a.length === b.length && timingSafeEqual(a, b);
}

/** Er tidsstemplet inden for vinduet? Formen er ti cifre, Unix-sekunder. */
export function tidsstempelGyldigt(
  timestamp: string,
  nuSekunder: number = Math.floor(Date.now() / 1000),
): boolean {
  if (!/^\d{10}$/.test(timestamp)) return false;
  return Math.abs(nuSekunder - Number(timestamp)) <= MAKS_URFORSKEL_SEKUNDER;
}
