"use server";

import { revalidatePath } from "next/cache";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createClient } from "@/lib/supabase/server";
import { PLATFORME, valider } from "@/lib/omdoemme";

/**
 * Handlingerne bag Omdømme-siden.
 *
 * ISOLATIONEN LIGGER TO STEDER, OG BEGGE SKAL VÆRE DER. `getCompanyAccess()`
 * afgør, hvilken virksomhed den aktuelle bruger må handle på vegne af, og
 * company_id tages ALTID derfra — aldrig fra formularen. Oven i det står
 * RLS på tabellen: selv hvis en fejl her sendte et fremmed id med, ville
 * basen afvise. Den ene uden den anden er ikke nok.
 *
 * VALIDERINGEN ER DEN SAMME FUNKTION, som brugerfladen bruger. `valider()`
 * ligger i `omdoemme.ts`, så en regel ikke kan komme til at gælde det ene
 * sted og ikke det andet — og databasen har de samme grænser som CHECK, hvis
 * noget skulle nå forbi begge.
 */

export interface FormResult {
  ok?: boolean;
  error?: string;
}

/** Læser et tal fra formularen. Tomt felt bliver null, ikke 0. */
function tal(fd: FormData, navn: string): number | null {
  const raa = String(fd.get(navn) ?? "").trim().replace(",", ".");
  if (!raa) return null;
  const n = Number(raa);
  return Number.isFinite(n) ? n : Number.NaN;
}

function tekst(fd: FormData, navn: string): string | null {
  return String(fd.get(navn) ?? "").trim() || null;
}

/**
 * Skalaen, når brugeren ikke selv har valgt en.
 *
 * De kendte platforme har en fast skala, så brugeren ikke skal indtaste "5"
 * hver gang. `anden` har ingen, og der SKAL feltet udfyldes — uden skalaen er
 * et tal som 8 meningsløst.
 */
function standardSkala(platform: string): number | null {
  return PLATFORME.find((p) => p.vaerdi === platform)?.skala ?? null;
}

export async function gemProfil(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Ingen adgang." };

  const platform = String(formData.get("platform") ?? "");
  const skalaFelt = tal(formData, "rating_skala");
  const input = {
    platform,
    rating: tal(formData, "rating"),
    ratingSkala: skalaFelt ?? standardSkala(platform),
    antalAnmeldelser: tal(formData, "antal_anmeldelser") ?? 0,
    anbefalingProcent: tal(formData, "anbefaling_procent"),
    profilUrl: tekst(formData, "profil_url"),
    visningsnavn: tekst(formData, "visningsnavn"),
  };

  const fejl = valider(input);
  if (fejl.length) return { error: fejl[0] };

  const supabase = await createClient();
  const raekke = {
    company_id: access.companyId,
    platform: input.platform,
    visningsnavn: input.visningsnavn,
    rating: input.rating,
    rating_skala: input.ratingSkala,
    antal_anmeldelser: input.antalAnmeldelser,
    anbefaling_procent: input.anbefalingProcent,
    profil_url: input.profilUrl,
    opdateret_den: new Date().toISOString(),
  };

  const id = String(formData.get("id") ?? "");
  const { error } = id
    ? await supabase
        .from("eksterne_profiler")
        .update(raekke)
        .eq("id", id)
        // Bæltet ved siden af selerne: RLS ville også afvise, men en
        // opdatering uden company_id i betingelsen er en ulykke, der venter.
        .eq("company_id", access.companyId)
    : await supabase.from("eksterne_profiler").insert(raekke);

  if (error) {
    // Den hyppigste er det unikke indeks: én profil pr. platform.
    if (error.code === "23505") {
      return { error: "Der findes allerede en profil for den platform." };
    }
    return { error: error.message };
  }

  revalidatePath("/dashboard/omdoemme");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function sletProfil(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Ingen adgang." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ugyldig profil." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("eksterne_profiler")
    .delete()
    .eq("id", id)
    .eq("company_id", access.companyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/omdoemme");
  revalidatePath("/dashboard");
  return { ok: true };
}

/**
 * Markér en oplevelse som fulgt op.
 *
 * DEN FLYTTER SCOREN, og det er meningen: feedbackhåndtering er en af de fire
 * dele. Derfor er den også kun en markering af, at NOGEN HAR GJORT NOGET —
 * ikke en vurdering af, om kunden blev glad igen. Det sidste kan vi ikke måle,
 * og en score, der lod som om, ville være værre end ingen.
 */
export async function saetHaandteret(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Ingen adgang." };

  const id = String(formData.get("id") ?? "");
  if (!id) return { error: "Ugyldig feedback." };
  const fortryd = formData.get("fortryd") === "1";

  const supabase = await createClient();
  const { error } = await supabase
    .from("feedback")
    .update({ haandteret_den: fortryd ? null : new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", access.companyId);

  if (error) return { error: error.message };

  revalidatePath("/dashboard/omdoemme");
  revalidatePath("/dashboard/feedback");
  revalidatePath("/dashboard");
  return { ok: true };
}
