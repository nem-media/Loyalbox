/**
 * Pointprogrammet — server-only kerneservice.
 *
 * SAMME ARBEJDSDELING SOM STEMPELKORTET (`service.ts`): kalderen er allerede
 * valideret med `getCompanyAccess()`, denne fil kontrollerer RETTIGHEDEN og
 * kalder basen med service-role. Alt, der flytter en saldo, sker inde i én
 * SQL-funktion, hvor kontoen er låst — se 0044 for hvorfor det ikke kan ligge
 * her: en serverfunktion kører i mange eksemplarer, og "læs saldo, beslut,
 * skriv" er en formodning, ikke en regel.
 *
 * RETTIGHEDERNE ER DE EKSISTERENDE. Der opfindes ikke en rolle til point:
 *   canStamp  → give point ved disken (samme handling som et stempel)
 *   canRedeem → indløse en belønning
 *   canManage → justere, annullere, rette belønninger og programmet
 * Ejeren har alle fire; en medarbejder har dem, ejeren har tildelt.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { CompanyAccess } from "@/lib/loyalty/access";
import type { PointSvar } from "@/lib/types/database";
import {
  beregnPoint,
  pointFejlTekst,
  sorterBeloenninger,
  type PointEarnModel,
  type PointTxnType,
} from "@/lib/loyalty/point";
import { noterFejl } from "@/lib/drift";

type Admin = ReturnType<typeof createAdminClient>;

export interface PointProgram {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  status: "draft" | "active" | "paused" | "archived";
  earn_model: PointEarnModel;
  earn_value: number;
}

export interface PointReward {
  id: string;
  program_id: string;
  name: string;
  description: string | null;
  points_cost: number;
  type: string;
  sort_order: number;
  status: "draft" | "active" | "paused" | "archived";
}

export interface PointTransaktion {
  id: string;
  type: PointTxnType;
  points: number;
  balance_after: number;
  purchase_amount: number | null;
  reward_navn: string | null;
  reward_point: number | null;
  reversal_of: string | null;
  reason: string | null;
  created_at: string;
  member_id: string;
  employee_id: string | null;
  performed_by: string | null;
}

export type PointResultat =
  | {
      ok: true;
      saldo: number;
      /** Nøglen var set før — dobbeltklik, ikke en ny transaktion. */
      gentagelse: boolean;
      point?: number;
      navn?: string;
      txn?: string;
    }
  | { ok: false; error: string };

/**
 * Virksomhedens LEVENDE pointprogrammer — ældste først.
 *
 * Arkiverede er historik og kommer ikke med. Der kan være op til fem (0045);
 * grænsen håndhæves i basen, ikke her.
 *
 * DEN HED FØR `hentPointProgram` OG SVAREDE MED ÉT. Det var ikke bare en
 * forkert type, da grænsen blev hævet: `.maybeSingle()` svarer 406/PGRST116,
 * når der er mere END én række, og fejlen blev slugt til `null`. Butikken
 * ville altså oprette program nummer to, og så ville ALLE pointdele forsvinde
 * fra kortet, kundesiden og personalefladen på én gang — uden at noget
 * fejlede. Nøjagtig samme fælde som de to primære belønninger i 0042.
 */
export async function hentPointProgrammer(
  companyId: string,
  admin: Admin = createAdminClient(),
): Promise<PointProgram[]> {
  const { data } = await admin
    .from("loyalty_point_programs")
    .select("id, company_id, name, description, status, earn_model, earn_value")
    .eq("company_id", companyId)
    .neq("status", "archived")
    .order("created_at", { ascending: true });
  return (data ?? []) as PointProgram[];
}

/** Dem, kunderne faktisk kan optjene og bruge point i lige nu. */
export async function hentAktivePointProgrammer(
  companyId: string,
  admin: Admin = createAdminClient(),
): Promise<PointProgram[]> {
  const { data } = await admin
    .from("loyalty_point_programs")
    .select("id, company_id, name, description, status, earn_model, earn_value")
    .eq("company_id", companyId)
    .eq("status", "active")
    .order("created_at", { ascending: true });
  return (data ?? []) as PointProgram[];
}

/**
 * Ét bestemt program — MED ejerskabet i forespørgslen.
 *
 * Et id fra en anden butik giver ikke et afslag bagefter; det findes slet
 * ikke. Arkiverede kommer med her, fordi historikken skal kunne åbnes.
 */
export async function hentPointProgram(
  companyId: string,
  programId: string,
  admin: Admin = createAdminClient(),
): Promise<PointProgram | null> {
  const { data } = await admin
    .from("loyalty_point_programs")
    .select("id, company_id, name, description, status, earn_model, earn_value")
    .eq("id", programId)
    .eq("company_id", companyId)
    .maybeSingle();
  return (data as PointProgram) ?? null;
}

/** Belønningerne, billigst først. `kunAktive` er kundens visning. */
export async function hentPointBeloenninger(
  programId: string,
  kunAktive = true,
  admin: Admin = createAdminClient(),
): Promise<PointReward[]> {
  let q = admin
    .from("loyalty_point_rewards")
    .select(
      "id, program_id, name, description, points_cost, type, sort_order, status",
    )
    .eq("program_id", programId);
  if (kunAktive) q = q.eq("status", "active");
  const { data } = await q;
  return sorterBeloenninger((data ?? []) as PointReward[]);
}

/** Kundens saldo på ét program. Null betyder "ikke tilmeldt endnu". */
export async function hentPointSaldo(
  programId: string,
  memberId: string,
  admin: Admin = createAdminClient(),
): Promise<number | null> {
  const { data } = await admin
    .from("loyalty_point_accounts")
    .select("balance")
    .eq("program_id", programId)
    .eq("member_id", memberId)
    .maybeSingle();
  return data ? data.balance : null;
}

/**
 * Melder kunden ind i pointprogrammet.
 *
 * Idempotent i BASEN (`unique (program_id, member_id)` + `on conflict do
 * nothing`), ikke ved et opslag først: to tryk på tilmeldingsknappen må ikke
 * kunne give kunden to saldi. Kaldes fra det EKSISTERENDE tilmeldingsflow —
 * der findes ingen særskilt pointtilmelding.
 */
export async function sikrePointKonto(
  companyId: string,
  programId: string,
  memberId: string,
  admin: Admin = createAdminClient(),
): Promise<void> {
  const { error } = await admin
    .from("loyalty_point_accounts")
    .upsert(
      { company_id: companyId, program_id: programId, member_id: memberId },
      { onConflict: "program_id,member_id", ignoreDuplicates: true },
    );
  if (error) {
    await noterFejl(
      "pointprogram",
      `Kunne ikke oprette pointkonto for medlem ${memberId}: ${error.message}`,
    );
  }
}

/** Oversætter basens svar til noget, brugerfladen kan vise. */
function tolk(svar: PointSvar | null, fejlbesked?: string): PointResultat {
  if (!svar) {
    return {
      ok: false,
      error: fejlbesked ?? "Handlingen kunne ikke gennemføres. Prøv igen.",
    };
  }
  if (!svar.ok) return { ok: false, error: pointFejlTekst(svar.fejl) };
  return {
    ok: true,
    saldo: svar.saldo ?? 0,
    gentagelse: Boolean(svar.gentagelse),
    point: svar.point,
    navn: svar.navn,
    txn: svar.txn,
  };
}

export interface GivPointParams {
  access: CompanyAccess;
  programId: string;
  memberId: string;
  /** Antal point. Fortegnet sættes af `type`, så en fejl ikke kan vende det. */
  points: number;
  type: Extract<PointTxnType, "earn" | "adjust_add" | "adjust_remove">;
  purchaseAmount?: number | null;
  reference?: string | null;
  reason?: string | null;
}

/**
 * Giver eller trækker point.
 *
 * FORTEGNET SÆTTES HER OG KOMMER ALDRIG FRA EN FORMULAR: et minus, der slap
 * igennem et felt beregnet til antal, ville blive til en tilføjelse eller et
 * fradrag, ingen havde valgt. `type` er beslutningen, tallet er størrelsen.
 */
export async function givPoint(
  params: GivPointParams,
): Promise<PointResultat> {
  const { access, programId, memberId, type } = params;

  const maa =
    type === "earn" ? access.permissions.canStamp : access.permissions.canManage;
  if (!maa) {
    return {
      ok: false,
      error:
        type === "earn"
          ? "Du har ikke rettighed til at give point."
          : "Kun ejeren og medarbejdere med administratoradgang kan justere point.",
    };
  }

  const antal = Math.floor(Math.abs(Number(params.points)));
  if (!Number.isFinite(antal) || antal < 1) {
    return { ok: false, error: "Skriv et antal point på mindst 1." };
  }
  if (antal > 100000) {
    // En tastefejl ved disken ("2500" i pointfeltet i stedet for i beløbet)
    // skal ikke kunne sætte en saldo, ingen kan forklare. Grænsen er
    // rundelig — den findes for at fange et nul for meget.
    return { ok: false, error: "Det er flere point, end der kan gives på én gang." };
  }

  const delta = type === "adjust_remove" ? -antal : antal;

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("point_giv", {
    p_company: access.companyId,
    p_program: programId,
    p_member: memberId,
    p_points: delta,
    p_type: type,
    p_purchase_amount: params.purchaseAmount ?? null,
    p_reference: params.reference ?? null,
    p_employee: access.employeeId,
    p_user: access.actorUserId,
    p_reason: params.reason ?? null,
  });

  if (error) {
    await noterFejl("pointprogram", `point_giv: ${error.message}`);
    return { ok: false, error: "Pointene kunne ikke gemmes. Prøv igen." };
  }
  return tolk(data as PointSvar);
}

export interface IndloesParams {
  access: CompanyAccess;
  programId: string;
  memberId: string;
  rewardId: string;
  reference?: string | null;
}

/** Indløser en belønning. Prisen læses i basen — aldrig fra klienten. */
export async function indloesPointBeloenning(
  params: IndloesParams,
): Promise<PointResultat> {
  const { access } = params;
  if (!access.permissions.canRedeem) {
    return { ok: false, error: "Du har ikke rettighed til at indløse belønninger." };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("point_indloes", {
    p_company: access.companyId,
    p_program: params.programId,
    p_member: params.memberId,
    p_reward: params.rewardId,
    p_reference: params.reference ?? null,
    p_employee: access.employeeId,
    p_user: access.actorUserId,
  });

  if (error) {
    await noterFejl("pointprogram", `point_indloes: ${error.message}`);
    return { ok: false, error: "Belønningen kunne ikke indløses. Prøv igen." };
  }
  return tolk(data as PointSvar);
}

/**
 * Annullerer en transaktion med en MODPOST.
 *
 * Originalen bliver stående. Det er ikke pænhed: en kvittering, der kan
 * forsvinde, er ikke en kvittering, og en butik skal kunne se, hvad der
 * skete — også dét, der var forkert.
 */
export async function annullerPointTransaktion(
  access: CompanyAccess,
  txnId: string,
  reason?: string | null,
): Promise<PointResultat> {
  if (!access.permissions.canManage) {
    return {
      ok: false,
      error: "Kun ejeren og medarbejdere med administratoradgang kan annullere.",
    };
  }

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("point_annuller", {
    p_company: access.companyId,
    p_txn: txnId,
    p_employee: access.employeeId,
    p_user: access.actorUserId,
    p_reason: reason ?? null,
  });

  if (error) {
    await noterFejl("pointprogram", `point_annuller: ${error.message}`);
    return { ok: false, error: "Transaktionen kunne ikke annulleres. Prøv igen." };
  }
  return tolk(data as PointSvar);
}

/**
 * Hvor mange point giver dette køb — med programmets egne tal.
 *
 * Bruges til previewet ved disken, så personalet kan se tallet FØR de trykker.
 * Selve beregningen er den rene `beregnPoint()`; her hentes kun reglerne.
 */
export function previewPoint(
  program: Pick<PointProgram, "earn_model" | "earn_value">,
  amount: number | null,
): number {
  return beregnPoint({
    model: program.earn_model,
    earnValue: Number(program.earn_value),
    amount,
  });
}

export interface PointKonto {
  program: PointProgram;
  saldo: number;
}

/**
 * Kundens pointkonti i ÉN butik — én pr. program, hun er meldt ind i.
 *
 * TO OPSLAG UANSET ANTAL PROGRAMMER. Et opslag pr. program ville være et
 * N+1-problem på netop den side, der skal åbne på en telefon i en kø.
 * Arkiverede programmer falder fra: de kan hverken optjene eller indløse, og
 * en saldo, der ikke kan bruges til noget, hører ikke til på kundens kort.
 */
export async function hentMedlemsPointkonti(
  companyId: string,
  memberId: string,
  admin: Admin = createAdminClient(),
): Promise<PointKonto[]> {
  const [programmer, { data: konti }] = await Promise.all([
    hentPointProgrammer(companyId, admin),
    admin
      .from("loyalty_point_accounts")
      .select("program_id, balance")
      .eq("member_id", memberId)
      .eq("company_id", companyId),
  ]);

  const saldoPrProgram = new Map(
    (konti ?? []).map((k) => [k.program_id, k.balance]),
  );

  return programmer
    .filter((p) => saldoPrProgram.has(p.id))
    .map((program) => ({
      program,
      saldo: saldoPrProgram.get(program.id) ?? 0,
    }));
}

/** Kundens egen historik — nyeste først. */
export async function hentMedlemsHistorik(
  memberId: string,
  graense = 20,
  admin: Admin = createAdminClient(),
): Promise<PointTransaktion[]> {
  const { data } = await admin
    .from("loyalty_point_transactions")
    .select(
      "id, type, points, balance_after, purchase_amount, reward_navn, reward_point, reversal_of, reason, created_at, member_id, employee_id, performed_by",
    )
    .eq("member_id", memberId)
    .order("created_at", { ascending: false })
    .limit(graense);
  return (data ?? []) as PointTransaktion[];
}
