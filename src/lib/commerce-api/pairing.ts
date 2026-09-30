import "server-only";
import { commerceDb, type CommerceDb } from "./db";
import { commerceIPlan } from "@/lib/loyalty/plan";
import { valider, CONTRACT_VERSIONS } from "./contract";
import {
  commerceKrypteringKlar,
  krypter,
  nyParringskode,
  nySigneringsnoegle,
  parringskodeHash,
  PARRINGSKODE_MINUTTER,
} from "./secret";
import { erUnderstoettetValuta } from "./valuta";
import type { Fejlkode } from "./errors";
import type { CommerceProvider, CommerceStore } from "./types";

/**
 * PARRINGEN — det eneste kald uden signatur, fordi der ingen nøgle er endnu.
 *
 * Derfor er det også det kald, der skal være strengest:
 *   * Koden er tilfældig, lever et kvarter, kan bruges én gang og er bundet
 *     til ÉN virksomhed og ÉN platform. Den gemmes kun som sha256.
 *   * En ny kode gør virksomhedens tidligere ubrugte koder ugyldige, så der
 *     aldrig ligger mere end én gyldig kode pr. virksomhed.
 *   * Indløsningen og oprettelsen er ÉN transaktion (`commerce_par()`), så en
 *     afvist parring ikke har brugt koden, og to samtidige forsøg ikke begge
 *     kan lykkes.
 *   * Nøglen returneres ÉN gang — i svaret her — og ligger derefter kun
 *     krypteret i basen.
 */

/** Kun WooCommerce kan forbindes i dag. Shopify står i modellen, ikke i menuen. */
export const FORBINDELIGE_PROVIDERE: readonly CommerceProvider[] = ["woocommerce"];

export async function opretParringskode(
  companyId: string,
  userId: string | null,
  provider: CommerceProvider,
  db: CommerceDb = commerceDb(),
): Promise<{ ok: true; kode: string; udloeber: string } | { ok: false; fejl: string }> {
  if (!FORBINDELIGE_PROVIDERE.includes(provider)) {
    return { ok: false, fejl: "Denne platform kan ikke forbindes endnu." };
  }
  if (!(await commerceIPlan(companyId))) {
    return { ok: false, fejl: "Webshopintegrationen følger med LoyalSum Komplet og LoyalSum Komplet Online." };
  }
  // En kode, der ikke kan indløses, er værre end ingen kode.
  if (!commerceKrypteringKlar()) {
    return { ok: false, fejl: "Webshopintegrationen er ikke sat op på serveren endnu. Kontakt LoyalSum." };
  }

  // Tidligere ubrugte koder holder op med at gælde.
  await db
    .from("commerce_pairing_codes")
    .update({ expires_at: new Date().toISOString() })
    .eq("company_id", companyId)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .select("id");

  const kode = nyParringskode();
  const udloeber = new Date(Date.now() + PARRINGSKODE_MINUTTER * 60_000).toISOString();
  const { error } = await db.from("commerce_pairing_codes").insert({
    company_id: companyId,
    provider,
    code_hash: parringskodeHash(kode),
    created_by: userId,
    expires_at: udloeber,
  });
  if (error) return { ok: false, fejl: "Koden kunne ikke oprettes. Prøv igen." };
  return { ok: true, kode, udloeber };
}

/** Kun https — og http alene mod egen maskine i udvikling (samme regel som pluginet). */
export function gyldigButiksadresse(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol === "https:") return true;
    return u.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(u.hostname);
  } catch {
    return false;
  }
}

export type ParUdfald =
  | {
      ok: true;
      krop: { integration_id: string; signing_secret: string; contract_versions: string[] };
    }
  | { ok: false; kode: Fejlkode; besked: string; detaljer?: string[] };

export async function parButik(krop: unknown, db: CommerceDb = commerceDb()): Promise<ParUdfald> {
  const v = valider("pair", krop);
  if (!v.ok) return { ok: false, kode: "invalid_request", besked: "Parringen følger ikke kontrakten.", detaljer: v.fejl };
  const { pairing_code, store } = krop as { pairing_code: string; store: CommerceStore };

  // FEJLER LUKKET, FØR KODEN RØRES: uden krypteringsnøglen kan integrationens
  // nøgle ikke gemmes, og koden må ikke brændes af et forsøg, der ikke kan lykkes.
  if (!commerceKrypteringKlar()) {
    return { ok: false, kode: "commerce_unavailable", besked: "Webshopintegrationen er midlertidigt utilgængelig." };
  }

  if (!gyldigButiksadresse(store.store_url)) {
    return { ok: false, kode: "invalid_request", besked: "Butikkens adresse skal være https." };
  }
  if (!erUnderstoettetValuta(store.currency)) {
    return { ok: false, kode: "unsupported_currency", besked: `Butikkens valuta ${store.currency} understøttes ikke endnu.` };
  }

  const hash = parringskodeHash(pairing_code);
  // Virksomheden bag koden skal have adgang, FØR noget oprettes.
  const { data: kode } = await db
    .from("commerce_pairing_codes")
    .select("company_id, provider")
    .eq("code_hash", hash)
    .is("used_at", null)
    .gt("expires_at", new Date().toISOString())
    .maybeSingle();
  if (!kode) return { ok: false, kode: "invalid_pairing_code", besked: "Koden er ugyldig, brugt eller udløbet. Hent en ny i LoyalSum." };
  if (kode.provider !== store.provider) {
    return { ok: false, kode: "provider_mismatch", besked: "Koden er lavet til en anden platform." };
  }
  if (!(await commerceIPlan(kode.company_id as string))) {
    return { ok: false, kode: "entitlement_required", besked: "Webshopintegrationen kræver LoyalSum Komplet." };
  }

  const noegle = nySigneringsnoegle();
  const { data, error } = await db.rpc("commerce_par", {
    p_code_hash: hash,
    p_provider: store.provider,
    p_external_store_id: store.external_store_id,
    p_store_url: store.store_url,
    p_store_name: store.name ?? null,
    p_currency: store.currency,
    p_adapter_version: store.adapter_version,
    p_platform_version: store.platform_version ?? null,
    p_secret_ciphertext: krypter(noegle),
  });
  if (error) throw new Error(`par: ${error.message}`);
  const svar = data as { ok: boolean; fejl?: string; integration_id?: string };
  if (!svar.ok) {
    const kodeFejl: Fejlkode =
      svar.fejl === "store_already_paired"
        ? "store_already_paired"
        : svar.fejl === "provider_mismatch"
          ? "provider_mismatch"
          : "invalid_pairing_code";
    const besked =
      kodeFejl === "store_already_paired"
        ? "Butikken er allerede forbundet til en anden LoyalSum-virksomhed. Afbryd den dér først."
        : kodeFejl === "provider_mismatch"
          ? "Koden er lavet til en anden platform."
          : "Koden er ugyldig, brugt eller udløbet. Hent en ny i LoyalSum.";
    return { ok: false, kode: kodeFejl, besked };
  }

  return {
    ok: true,
    krop: {
      integration_id: svar.integration_id!,
      signing_secret: noegle,
      contract_versions: [...CONTRACT_VERSIONS],
    },
  };
}
