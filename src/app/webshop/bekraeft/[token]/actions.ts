"use server";

import { bekraeftKobling } from "@/lib/commerce-api/kobling";

export interface BekraeftSvar {
  ok?: boolean;
  error?: string;
  butik?: string;
  ordrer?: number;
}

/**
 * Kunden trykker "Bekræft". Tokenet er autorisationen — præcis som
 * `/kort/<token>` — og det kan kun bruges én gang (betinget i basen).
 */
export async function bekraeft(_prev: BekraeftSvar, formData: FormData): Promise<BekraeftSvar> {
  const token = String(formData.get("token") ?? "");
  const vilkaar = formData.get("consent_terms") === "on";
  try {
    const r = await bekraeftKobling(token, vilkaar);
    if (!r.ok) return { error: r.fejl };
    return { ok: true, butik: r.butik, ordrer: r.ordrer };
  } catch (e) {
    console.error("[webshop] bekræftelse fejlede:", (e as Error).message);
    return { error: "Der skete en fejl. Prøv igen om lidt." };
  }
}
