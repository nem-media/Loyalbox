"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { pointprogramIPlan } from "@/lib/loyalty/plan";
import {
  givPoint,
  indloesPointBeloenning,
  annullerPointTransaktion,
  hentPointProgram,
} from "@/lib/loyalty/point-service";
import { laesValg, REWARD_TYPE_LABELS } from "@/lib/loyalty/constants";
import { POINT_EARN_MODEL_LABELS } from "@/lib/loyalty/point";
import { begraens, TEKST_MAKS } from "@/lib/tekstgraenser";
import type { FormResult } from "@/app/dashboard/loyalitet/actions";

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();

function tal(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim().replace(",", ".");
  if (!s) return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

/**
 * Adgangen til at ADMINISTRERE pointprogrammet.
 *
 * Tre ting skal passe, og de er ikke det samme: der skal være en bruger med
 * adgang til virksomheden, brugeren skal have `canManage`, og virksomheden
 * skal have købt LoyalSum Komplet. Spørges der kun om de to første, kan en
 * medarbejder med administratoradgang oprette et pointprogram på et
 * abonnement, ejerens egen side siger nej til — nøjagtig den fejl,
 * `stempelkortIPlan` blev skrevet for at lukke.
 */
async function kraevAdmin() {
  const access = await getCompanyAccess();
  if (!access) return { fejl: "Du har ikke adgang til denne virksomhed." };
  if (!access.permissions.canManage) {
    return { fejl: "Kun ejeren og medarbejdere med administratoradgang kan det her." };
  }
  if (!(await pointprogramIPlan(access.companyId))) {
    return { fejl: "Pointprogram er en del af LoyalSum Komplet." };
  }
  return { access };
}

/* ======================================================= selve programmet */

export async function opretPointProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { access, fejl } = await kraevAdmin();
  if (!access) return { error: fejl };

  const navn = begraens(formData.get("name"), TEKST_MAKS.navn);
  const beskrivelse = begraens(formData.get("description"), TEKST_MAKS.beskrivelse);
  const model = laesValg(formData.get("earn_model"), POINT_EARN_MODEL_LABELS, "per_amount");
  const vaerdi = tal(formData.get("earn_value"));

  const udfyldt = {
    name: navn,
    description: beskrivelse,
    earn_value: str(formData.get("earn_value")),
  };

  if (!navn) return { error: "Giv programmet et navn.", udfyldt };
  /*
   * VÆRDIEN SKAL VÆRE POSITIV — OGSÅ VED MANUEL TILDELING.
   *
   * Feltet bruges ikke af `manual`, men kolonnen er `not null check (> 0)`, og
   * en model kan skiftes bagefter. Et nul gemt her ville give et program, der
   * pludselig ikke kunne regne, den dag butikken skiftede til "efter beløb".
   */
  if (vaerdi === null || vaerdi <= 0) {
    return {
      error:
        model === "per_amount"
          ? "Skriv hvor mange kroner der skal give ét point."
          : "Skriv hvor mange point et køb skal give.",
      udfyldt,
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("loyalty_point_programs")
    .insert({
      company_id: access.companyId,
      name: navn,
      description: beskrivelse || null,
      earn_model: model,
      earn_value: vaerdi,
      // Programmet starter som KLADDE. Et program, der gik direkte i luften,
      // ville tage imod point, før butikken havde oprettet en eneste
      // belønning — og en saldo uden noget at bruge den på er et løfte, der
      // ikke kan indfries.
      status: "draft",
    })
    .select("id")
    .single();

  if (error) {
    // 23505: `loyalty_point_programs_et_levende_idx` — der er allerede et
    // program, der ikke er arkiveret. Det er ikke en fejl, brugeren har lavet;
    // de har bare to faner åbne eller trykket to gange.
    if (error.code === "23505") {
      return { error: "Der findes allerede et pointprogram. Ret det i stedet." };
    }
    return { error: "Pointprogrammet kunne ikke oprettes. Prøv igen.", udfyldt };
  }

  revalidatePath("/dashboard/loyalitet/point");
  redirect(`/dashboard/loyalitet/point?oprettet=${data.id}`);
}

export async function opdaterPointProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { access, fejl } = await kraevAdmin();
  if (!access) return { error: fejl };

  const id = str(formData.get("id"));
  const navn = begraens(formData.get("name"), TEKST_MAKS.navn);
  const beskrivelse = begraens(formData.get("description"), TEKST_MAKS.beskrivelse);
  const model = laesValg(formData.get("earn_model"), POINT_EARN_MODEL_LABELS, "per_amount");
  const vaerdi = tal(formData.get("earn_value"));

  const udfyldt = {
    name: navn,
    description: beskrivelse,
    earn_value: str(formData.get("earn_value")),
  };

  if (!navn) return { error: "Giv programmet et navn.", udfyldt };
  if (vaerdi === null || vaerdi <= 0) {
    return { error: "Optjeningsværdien skal være større end nul.", udfyldt };
  }

  const admin = createAdminClient();
  /*
   * EJERSKABET LIGGER I FORESPØRGSLEN, og rækketallet læses. En `update` mod
   * PostgREST svarer glad ved NUL rækker — så uden `.select("id")` ville et
   * id fra en anden butik give "Gemt!" uden at have gemt noget.
   */
  const { data, error } = await admin
    .from("loyalty_point_programs")
    .update({
      name: navn,
      description: beskrivelse || null,
      earn_model: model,
      earn_value: vaerdi,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", access.companyId)
    .select("id");

  if (error || !data?.length) {
    return { error: "Ændringerne kunne ikke gemmes. Prøv igen.", udfyldt };
  }

  revalidatePath("/dashboard/loyalitet/point");
  return { ok: true };
}

/**
 * Aktiver, sæt på pause eller arkivér.
 *
 * ARKIVERING ER IKKE EN SLETNING. Et program med historik må aldrig
 * hard-deletes: saldiene og ledgeren er kundernes, og en butik, der arkiverer,
 * skal stadig kunne svare på, hvad en kunde havde. Arkiveringen er samtidig
 * dét, der gør plads til et nyt program, jf. det partielle indeks i 0044.
 */
export async function saetPointProgramStatus(formData: FormData): Promise<void> {
  const { access } = await kraevAdmin();
  if (!access) return;

  const id = str(formData.get("id"));
  const status = laesValg(
    formData.get("status"),
    { draft: 1, active: 1, paused: 1, archived: 1 },
    "draft",
  );

  const admin = createAdminClient();

  /*
   * ET PROGRAM UDEN EN ENESTE BELØNNING MÅ IKKE GÅ I LUFTEN.
   *
   * Kunden ville optjene point mod ingenting, og det er det eneste sted i
   * flowet, hvor vi kan nå at sige det: bagefter står der en saldo, og den
   * kan ikke laves om til en oplevelse med tilbagevirkende kraft.
   */
  if (status === "active") {
    const { count } = await admin
      .from("loyalty_point_rewards")
      .select("id", { count: "exact", head: true })
      .eq("program_id", id)
      .eq("company_id", access.companyId)
      .eq("status", "active");
    if (!count) {
      revalidatePath("/dashboard/loyalitet/point");
      redirect("/dashboard/loyalitet/point?fejl=ingen-beloenninger");
    }
  }

  await admin
    .from("loyalty_point_programs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", access.companyId);

  revalidatePath("/dashboard/loyalitet/point");
  revalidatePath("/dashboard/loyalitet");
}

/* ========================================================== belønningerne */

export async function opretPointBeloenning(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const forsoeg = (_prev.forsoeg ?? 0) + 1;
  const { access, fejl } = await kraevAdmin();
  if (!access) return { error: fejl, forsoeg };

  const programId = str(formData.get("program_id"));
  const navn = begraens(formData.get("name"), TEKST_MAKS.navn);
  const beskrivelse = begraens(formData.get("description"), TEKST_MAKS.beskrivelse);
  const pris = tal(formData.get("points_cost"));
  const type = laesValg(formData.get("type"), REWARD_TYPE_LABELS, "free_product");

  const udfyldt = {
    name: navn,
    description: beskrivelse,
    points_cost: str(formData.get("points_cost")),
  };

  if (!navn) return { error: "Giv belønningen et navn.", udfyldt, forsoeg };
  if (pris === null || !Number.isInteger(pris) || pris < 1) {
    return {
      error: "Prisen skal være et helt antal point på mindst 1.",
      udfyldt,
      forsoeg,
    };
  }

  // Programmet skal være virksomhedens eget — ejerskabet i forespørgslen.
  const admin = createAdminClient();
  const { data: program } = await admin
    .from("loyalty_point_programs")
    .select("id")
    .eq("id", programId)
    .eq("company_id", access.companyId)
    .maybeSingle();
  if (!program) return { error: "Pointprogrammet blev ikke fundet.", udfyldt, forsoeg };

  const { error } = await admin.from("loyalty_point_rewards").insert({
    company_id: access.companyId,
    program_id: programId,
    name: navn,
    description: beskrivelse || null,
    points_cost: pris,
    type,
  });

  if (error)
    return {
      error: "Belønningen kunne ikke oprettes. Prøv igen.",
      udfyldt,
      forsoeg,
    };

  revalidatePath("/dashboard/loyalitet/point");
  // Uden tælleren ville felterne ikke blive tegnet forfra, og den næste
  // belønning skulle skrives oven i den forrige.
  return { ok: true, forsoeg };
}

export async function opdaterPointBeloenning(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const { access, fejl } = await kraevAdmin();
  if (!access) return { error: fejl };

  const id = str(formData.get("id"));
  const navn = begraens(formData.get("name"), TEKST_MAKS.navn);
  const beskrivelse = begraens(formData.get("description"), TEKST_MAKS.beskrivelse);
  const pris = tal(formData.get("points_cost"));

  if (!navn) return { error: "Giv belønningen et navn." };
  if (pris === null || !Number.isInteger(pris) || pris < 1) {
    return { error: "Prisen skal være et helt antal point på mindst 1." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from("loyalty_point_rewards")
    .update({
      name: navn,
      description: beskrivelse || null,
      points_cost: pris,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", access.companyId)
    .select("id");

  if (error || !data?.length) {
    return { error: "Belønningen kunne ikke gemmes. Prøv igen." };
  }

  /*
   * PRISEN ÆNDRER SIG FREMADRETTET OG ALDRIG BAGUD. De indløsninger, der
   * allerede er sket, bærer deres eget aftryk af navn og pris i ledgeren
   * (`reward_navn`, `reward_point`), så en kvittering fra i går bliver ved med
   * at sige det, kunden betalte.
   */
  revalidatePath("/dashboard/loyalitet/point");
  return { ok: true };
}

/**
 * Arkiverer eller genåbner en belønning.
 *
 * DER SLETTES ALDRIG. En belønning, der har været brugt, står i kundernes
 * historik; forsvandt rækken, ville historikken pege på ingenting. Arkivering
 * er samtidig det eneste rigtige svar på "vi har ikke den kage mere".
 */
export async function saetPointBeloenningStatus(formData: FormData): Promise<void> {
  const { access } = await kraevAdmin();
  if (!access) return;

  const id = str(formData.get("id"));
  const status = laesValg(
    formData.get("status"),
    { active: 1, archived: 1 },
    "archived",
  );

  const admin = createAdminClient();
  await admin
    .from("loyalty_point_rewards")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", access.companyId);

  revalidatePath("/dashboard/loyalitet/point");
}

/* ============================================ point på en bestemt kunde */

/**
 * Giver point ved disken.
 *
 * `canStamp` og ikke `canManage`: det er den samme handling som et stempel —
 * en medarbejder, der må stemple, må også give point. Rettigheden kontrolleres
 * i `givPoint()`, så den gælder uanset hvilken vej ind der bruges.
 */
export async function givPointAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang til denne virksomhed." };

  const memberId = str(formData.get("member_id"));
  const programId = str(formData.get("program_id"));
  const reference = str(formData.get("reference")) || null;
  const beloeb = tal(formData.get("amount"));
  const manuellePoint = tal(formData.get("points"));

  const program = await hentPointProgram(access.companyId);
  if (!program || program.id !== programId) {
    return { error: "Pointprogrammet blev ikke fundet." };
  }

  /*
   * TALLET REGNES PÅ SERVEREN OG KOMMER ALDRIG FRA BROWSEREN.
   *
   * Previewet ved disken viser det samme tal, men det er en VISNING. Kom
   * pointtallet med i formularen, ville en ændret værdi i en devtools-konsol
   * være en gratis saldo — og ingen ville kunne se det bagefter, for tallet
   * ville se helt almindeligt ud i ledgeren.
   */
  let point: number;
  let koebsbeloeb: number | null = null;

  if (program.earn_model === "manual") {
    if (manuellePoint === null) return { error: "Skriv hvor mange point kunden skal have." };
    point = manuellePoint;
  } else if (program.earn_model === "per_visit") {
    point = Math.floor(Number(program.earn_value));
  } else {
    if (beloeb === null || beloeb < 0) {
      return { error: "Skriv købets beløb." };
    }
    koebsbeloeb = beloeb;
    point = Math.floor(beloeb / Number(program.earn_value));
    if (point < 1) {
      return {
        error: `Beløbet er for lille til at give point. Der skal handles for mindst ${program.earn_value} kr.`,
      };
    }
  }

  const svar = await givPoint({
    access,
    programId: program.id,
    memberId,
    points: point,
    type: "earn",
    purchaseAmount: koebsbeloeb,
    reference,
  });

  if (!svar.ok) return { error: svar.error };

  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
  revalidatePath("/dashboard/loyalitet/point");
  return { ok: true };
}

/** Manuel justering — kun `canManage`, og der SKAL være en begrundelse. */
export async function justerPointAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang til denne virksomhed." };

  const memberId = str(formData.get("member_id"));
  const programId = str(formData.get("program_id"));
  const retning = str(formData.get("retning")) === "minus" ? "minus" : "plus";
  const antal = tal(formData.get("points"));
  const begrundelse = begraens(formData.get("reason"), TEKST_MAKS.beskrivelse);

  if (antal === null || antal < 1) return { error: "Skriv et antal point." };
  /*
   * BEGRUNDELSEN ER IKKE VALGFRI. En justering er den ene vej, hvor et tal
   * flyttes uden at kunden har gjort noget — og om et halvt år er "hvorfor
   * fik hun 50 point?" et spørgsmål, kun denne linje kan svare på.
   */
  if (!begrundelse) return { error: "Skriv kort hvorfor, så det kan ses i historikken." };

  const svar = await givPoint({
    access,
    programId,
    memberId,
    points: antal,
    type: retning === "minus" ? "adjust_remove" : "adjust_add",
    reason: begrundelse,
    reference: str(formData.get("reference")) || null,
  });

  if (!svar.ok) return { error: svar.error };

  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
  revalidatePath("/dashboard/loyalitet/point");
  return { ok: true };
}

export async function indloesPointAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang til denne virksomhed." };

  const svar = await indloesPointBeloenning({
    access,
    programId: str(formData.get("program_id")),
    memberId: str(formData.get("member_id")),
    rewardId: str(formData.get("reward_id")),
    reference: str(formData.get("reference")) || null,
  });

  if (!svar.ok) return { error: svar.error };

  revalidatePath(`/dashboard/loyalitet/kunder/${str(formData.get("member_id"))}`);
  revalidatePath("/dashboard/loyalitet/point");
  return { ok: true, udfyldt: { navn: svar.navn ?? "" } };
}

export async function annullerPointAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang til denne virksomhed." };

  const svar = await annullerPointTransaktion(
    access,
    str(formData.get("txn_id")),
    begraens(formData.get("reason"), TEKST_MAKS.beskrivelse) || null,
  );

  if (!svar.ok) return { error: svar.error };

  revalidatePath("/dashboard/loyalitet/point");
  revalidatePath("/dashboard/loyalitet/point/transaktioner");
  const memberId = str(formData.get("member_id"));
  if (memberId) revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
  return { ok: true };
}
