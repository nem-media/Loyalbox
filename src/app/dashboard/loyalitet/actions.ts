"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { stempelkortIPlan } from "@/lib/loyalty/plan";
import {
  giveStamp,
  redeemReward,
  reverseStamp,
  grantDiscount,
  redeemDiscount,
} from "@/lib/loyalty/service";
import {
  laesValg,
  EARN_MODEL_LABELS,
  REWARD_TYPE_LABELS,
  PROGRAM_STATUS_LABELS,
  DISCOUNT_TYPE_LABELS,
  DISCOUNT_STATUS_LABELS,
} from "@/lib/loyalty/constants";
import { begraens, TEKST_MAKS } from "@/lib/tekstgraenser";

export interface FormResult {
  ok?: boolean;
  error?: string;
  /**
   * Det, der stod i felterne — så formularen kan lægge det tilbage.
   *
   * REACT NULSTILLER EN FORMULAR, NÅR EN SERVER ACTION SVARER. Ved disken
   * betyder det, at en afvist tilmelding tømmer navn, mail og telefon, mens
   * kunden står og venter — og personalet skal spørge om det hele igen.
   * Samme kur som i `kontakt-form.tsx` og `signup-form.tsx`.
   *
   * SAMTYKKEFELTERNE ER BEVIDST IKKE MED. Et kryds er en aktiv handling, og
   * det skal blive ved med at være det; sættes det tilbage af os, er det
   * ikke længere kundens eget.
   */
  udfyldt?: Record<string, string>;
}

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";
function int(v: FormDataEntryValue | null, fallback: number): number {
  const n = parseInt(String(v ?? ""), 10);
  return Number.isFinite(n) ? n : fallback;
}
function numOrNull(v: FormDataEntryValue | null): number | null {
  const s = String(v ?? "").trim();
  if (!s) return null;
  const n = Number(s.replace(",", "."));
  return Number.isFinite(n) ? n : null;
}


/** Er stempelkortet med i abonnementet? Delt med medarbejdernes egne
 * handlinger — se `stempelkortIPlan` i src/lib/loyalty/plan.ts. */
const loyaltyInPlan = stempelkortIPlan;

/**
 * ET VINDUE, DER SLUTTER FØR DET BEGYNDER, ER ET KORT, DER ALDRIG VIRKER.
 *
 * `programVindue()` svarer "foer", så længe startdatoen ligger fremme, og
 * "efter" bagefter — er slutdatoen den tidligste, findes der ikke en eneste
 * dag, hvor svaret er "aktiv". **Målt i brugerfladen 2026-09-16:** et kort
 * med start 1. jan. 2027 og slut 1. jan. 2026 blev gemt uden en lyd, og
 * forhåndsvisningen skrev "Kortet gælder fra 1. jan. 2027" — altså et løfte
 * om en dag, hvor kortet i virkeligheden er udløbet. Butikken ville sætte
 * kortet i drift, tro at det kørte, og først opdage det ved disken.
 *
 * Datoerne sammenlignes som tekst, fordi de ER tekst (`yyyy-mm-dd` fra
 * `<input type="date">`), og den form sorterer rigtigt af sig selv. En
 * `Date` ville hertil tilføje en tidszone, som spørgsmålet ikke handler om.
 */
function datoVinduetVendtOm(formData: FormData): string | null {
  const start = String(formData.get("start_date") ?? "").trim();
  const slut = String(formData.get("end_date") ?? "").trim();
  if (!start || !slut || slut >= start) return null;
  return "Slutdatoen ligger før startdatoen, og så er der ingen dage, hvor kortet gælder. Byt om på dem, eller lad det ene felt stå tomt.";
}

/**
 * Opretter et stempelkort (program + primær belønning). Config skrives af ejer
 * via RLS. Kun brugere med canManage må oprette.
 */
export async function createProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) {
    return { error: "Du har ikke adgang til at oprette stempelkort." };
  }

  const vindueFejl = datoVinduetVendtOm(formData);
  if (vindueFejl) return { error: vindueFejl };
  if (!(await loyaltyInPlan(access.companyId))) {
    return { error: "Stempelkort er ikke med i dit abonnement." };
  }

  const name = begraens(formData.get("name"), TEKST_MAKS.navn);
  if (!name) return { error: "Giv stempelkortet et navn." };

  const requiredStamps = int(formData.get("required_stamps"), 10);
  if (requiredStamps < 1) {
    return { error: "Antal stempler til belønning skal være mindst 1." };
  }
  const stampsPerEarn = Math.max(1, int(formData.get("stamps_per_earn"), 1));
  const earnModel = laesValg(formData.get("earn_model"), EARN_MODEL_LABELS, "per_purchase");
  const rewardType = laesValg(formData.get("reward_type"), REWARD_TYPE_LABELS, "free_product");
  const status = laesValg(formData.get("status"), PROGRAM_STATUS_LABELS, "draft");

  const supabase = await createClient();
  const { data: program, error } = await supabase
    .from("loyalty_programs")
    .insert({
      company_id: access.companyId,
      name,
      internal_name: str(formData.get("internal_name")) || null,
      description: str(formData.get("description")) || null,
      status,
      earn_model: earnModel,
      stamps_per_earn: stampsPerEarn,
      amount_per_stamp:
        earnModel === "per_amount" ? numOrNull(formData.get("amount_per_stamp")) : null,
      start_date: str(formData.get("start_date")) || null,
      end_date: str(formData.get("end_date")) || null,
      reset_on_redeem: bool(formData.get("reset_on_redeem")),
      keep_overflow: bool(formData.get("keep_overflow")),
      color: str(formData.get("color")) || "#1e1c1a",
      icon: str(formData.get("icon")) || "star",
      card_text: begraens(formData.get("card_text"), TEKST_MAKS.kortTekst) || null,
      max_stamps_per_txn: Math.max(1, int(formData.get("max_stamps_per_txn"), 1)),
      max_stamps_per_day: numOrNull(formData.get("max_stamps_per_day")) ?? null,
      min_minutes_between: Math.max(0, int(formData.get("min_minutes_between"), 0)),
      require_staff_confirm: bool(formData.get("require_staff_confirm")),
      stamps_expire: bool(formData.get("stamps_expire")),
      stamp_expiry_days: numOrNull(formData.get("stamp_expiry_days")) ?? null,
    })
    .select("id")
    .single();

  if (error || !program) {
    return { error: error?.message ?? "Kunne ikke oprette stempelkortet." };
  }

  if (rewardType !== "none") {
    const rewardName =
      begraens(formData.get("reward_name"), TEKST_MAKS.navn) || "Belønning";
    const { error: rewardErr } = await supabase.from("loyalty_rewards").insert({
      company_id: access.companyId,
      program_id: program.id,
      name: rewardName,
      description: str(formData.get("reward_description")) || null,
      type: rewardType,
      value: numOrNull(formData.get("reward_value")),
      required_stamps: requiredStamps,
      terms: str(formData.get("reward_terms")) || null,
      is_primary: true,
      status: "active",
    });
    if (rewardErr) return { error: rewardErr.message };
  }

  revalidatePath("/dashboard/loyalitet/programmer");
  redirect(`/dashboard/loyalitet/programmer/${program.id}`);
}

/**
 * Retter et EKSISTERENDE stempelkort — alle felter, inkl. datoerne.
 *
 * Samme felter som `createProgram`, og den primære belønning følges med:
 * findes den, opdateres den; er der ingen (eller skiftes til "ingen
 * belønning"), håndteres det. Status ændres IKKE her — den har sin egen knap
 * på detaljesiden (`setProgramStatus`), så de to ikke kæmper om samme felt.
 * Skrives via ejerens egen klient (RLS ejer-only), præcis som oprettelsen.
 */
export async function updateProgram(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) {
    return { error: "Du har ikke adgang til at rette stempelkort." };
  }

  const vindueFejl = datoVinduetVendtOm(formData);
  if (vindueFejl) return { error: vindueFejl };
  if (!(await loyaltyInPlan(access.companyId))) {
    return { error: "Stempelkort er ikke med i dit abonnement." };
  }

  const id = str(formData.get("id"));
  if (!id) return { error: "Ukendt stempelkort." };

  const name = begraens(formData.get("name"), TEKST_MAKS.navn);
  if (!name) return { error: "Giv stempelkortet et navn." };

  const requiredStamps = int(formData.get("required_stamps"), 10);
  if (requiredStamps < 1) {
    return { error: "Antal stempler til belønning skal være mindst 1." };
  }
  const earnModel = laesValg(formData.get("earn_model"), EARN_MODEL_LABELS, "per_purchase");
  const rewardType = laesValg(formData.get("reward_type"), REWARD_TYPE_LABELS, "free_product");

  const supabase = await createClient();
  const { data: opdateret, error } = await supabase
    .from("loyalty_programs")
    .update({
      name,
      internal_name: str(formData.get("internal_name")) || null,
      card_text: begraens(formData.get("card_text"), TEKST_MAKS.kortTekst) || null,
      earn_model: earnModel,
      stamps_per_earn: Math.max(1, int(formData.get("stamps_per_earn"), 1)),
      amount_per_stamp:
        earnModel === "per_amount" ? numOrNull(formData.get("amount_per_stamp")) : null,
      start_date: str(formData.get("start_date")) || null,
      end_date: str(formData.get("end_date")) || null,
      reset_on_redeem: bool(formData.get("reset_on_redeem")),
      keep_overflow: bool(formData.get("keep_overflow")),
      color: str(formData.get("color")) || "#1e1c1a",
      icon: str(formData.get("icon")) || "star",
      max_stamps_per_txn: Math.max(1, int(formData.get("max_stamps_per_txn"), 1)),
      max_stamps_per_day: numOrNull(formData.get("max_stamps_per_day")) ?? null,
      min_minutes_between: Math.max(0, int(formData.get("min_minutes_between"), 0)),
      require_staff_confirm: bool(formData.get("require_staff_confirm")),
      stamps_expire: bool(formData.get("stamps_expire")),
      stamp_expiry_days: numOrNull(formData.get("stamp_expiry_days")) ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("company_id", access.companyId)
    .select("id")
    .maybeSingle();

  if (error) return { error: error.message };
  if (!opdateret) return { error: "Stempelkortet blev ikke fundet." };

  // Den primære belønning følger med. RLS er ejer-only, så vi kan skrive
  // direkte; findes den, opdateres den, ellers oprettes den.
  const { data: primaer } = await supabase
    .from("loyalty_rewards")
    .select("id")
    .eq("program_id", id)
    .eq("is_primary", true)
    .maybeSingle();

  if (rewardType === "none") {
    // Ingen automatisk belønning længere — tag den primære ud af spil, men
    // slet den ikke (den kan hænge på allerede udstedte belønninger).
    if (primaer) {
      /*
       * "INGEN BELØNNING" SKAL FAKTISK SLÅ DEN FRA.
       *
       * Skrivningen var ubetinget og dens svar blev ikke læst. Rammer den nul
       * rækker, bliver belønningen ved med at stå som `active` — og
       * `giveStamp()` udsteder den videre, mens butikken har fået at vide, at
       * den er slået fra. Kunderne får altså en belønning, butikken tror, de
       * har fjernet.
       */
      const { data: arkiveret, error: arkFejl } = await supabase
        .from("loyalty_rewards")
        .update({ status: "archived" })
        .eq("id", primaer.id)
        .select("id");
      if (arkFejl || !arkiveret?.length) {
        return {
          error:
            "Belønningen kunne ikke slås fra. Prøv igen — den er stadig aktiv.",
        };
      }
    }
  } else {
    const rewardFelter = {
      company_id: access.companyId,
      program_id: id,
      name: begraens(formData.get("reward_name"), TEKST_MAKS.navn) || "Belønning",
      description: str(formData.get("reward_description")) || null,
      type: rewardType,
      value: numOrNull(formData.get("reward_value")),
      required_stamps: requiredStamps,
      terms: str(formData.get("reward_terms")) || null,
      is_primary: true,
      status: "active" as const,
    };
    /*
     * ÉN PRIMÆR BELØNNING PR. PROGRAM — OG DET AFGØRES AF BASEN (0042).
     *
     * Opslaget ovenfor er læst for et øjeblik siden. To samtidige
     * redigeringer af samme stempelkort — to faner, eller et dobbelt tryk på
     * "Gem" — fandt begge ingen primær og oprettede begge én.
     *
     * OG DET ER VÆRRE, END DET LYDER. `giveStamp()` slår den primære op med
     * `.maybeSingle()`, og med to rækker svarer PostgREST 406/PGRST116.
     * Fejlen blev slugt, `reward` blev null, og der blev **aldrig udstedt en
     * belønning igen**. Butikkens stempelkort holdt op med at virke, uden at
     * noget fejlede nogen steder. Målt på demodata.
     *
     * Taber man kapløbet, har den anden gemning netop oprettet belønningen —
     * så den opdateres i stedet. Butikken har trykket "Gem" og skal se sine
     * værdier stå der, uanset hvilken af de to der kom først.
     */
    let belErr = primaer
      ? (await supabase.from("loyalty_rewards").update(rewardFelter).eq("id", primaer.id)).error
      : (await supabase.from("loyalty_rewards").insert(rewardFelter)).error;

    if (belErr?.code === "23505") {
      const { data: vandt } = await supabase
        .from("loyalty_rewards")
        .select("id")
        .eq("program_id", id)
        .eq("is_primary", true)
        .maybeSingle();
      belErr = vandt
        ? (await supabase
            .from("loyalty_rewards")
            .update(rewardFelter)
            .eq("id", vandt.id)).error
        : belErr;
    }
    if (belErr) return { error: belErr.message };
  }

  revalidatePath("/dashboard/loyalitet/programmer");
  revalidatePath(`/dashboard/loyalitet/programmer/${id}`);
  redirect(`/dashboard/loyalitet/programmer/${id}`);
}

/** Ændrer et programs status (kladde/aktivt/pauset/arkiveret). */
export async function setProgramStatus(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) return;
  if (!(await loyaltyInPlan(access.companyId))) return;

  const id = str(formData.get("program_id"));
  const status = laesValg(formData.get("status"), PROGRAM_STATUS_LABELS, "draft");
  if (!id) return;

  const supabase = await createClient();
  await supabase
    .from("loyalty_programs")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", id)
    .eq("company_id", access.companyId);

  revalidatePath("/dashboard/loyalitet/programmer");
  revalidatePath(`/dashboard/loyalitet/programmer/${id}`);
}

/**
 * Tilmelder en kunde til et program (opretter medlem + medlemskab + samtykke).
 * Medlemsdata skrives via service-role efter adgangsvalidering.
 */
export async function enrollMember(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang." };

  const name = begraens(formData.get("name"), TEKST_MAKS.navn);
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));
  const programId = str(formData.get("program_id"));
  const udfyldt = { name, email, phone, program_id: programId };

  if (!name && !email && !phone) {
    return { error: "Udfyld mindst navn, e-mail eller telefon.", udfyldt };
  }
  if (!programId) return { error: "Vælg et stempelkort.", udfyldt };
  if (!bool(formData.get("consent_terms"))) {
    return { error: "Kunden skal acceptere vilkårene.", udfyldt };
  }

  const admin = createAdminClient();

  // Programmet skal tilhøre virksomheden.
  const { data: program } = await admin
    .from("loyalty_programs")
    .select("id, company_id")
    .eq("id", programId)
    .maybeSingle();
  if (!program || program.company_id !== access.companyId) {
    return { error: "Ugyldigt stempelkort.", udfyldt };
  }

  /**
   * KUNDEN KAN FINDES I FORVEJEN — OG SÅ ER DET HENDES KORT, DER SKAL BRUGES.
   *
   * Siden 0042 er der et unikt indeks på (company_id, email) og (company_id,
   * phone), og det er netop dét, der gør "ét kort pr. kunde pr. butik" sandt.
   * Men indsættelsen her læste kun `error.message` videre, så personalet ved
   * disken fik databasens rå tekst at se — målt: *duplicate key value violates
   * unique constraint "loyalty_members_en_mail_pr_firma_idx"*. Kunden står ved
   * siden af, og der er ingen vej frem i beskeden.
   *
   * En dublet er ikke en fejl her, men et SVAR: butikken har hende allerede.
   * Så slås hun op og bruges — samme greb som i `selfEnroll`, og det er også
   * dét, personalet ville gøre i hånden. Navnet i formularen skrives IKKE
   * oven i det, der står: en tilmelding må ikke kunne omdøbe en anden kunde.
   */
  let { data: member, error: memberErr } = await admin
    .from("loyalty_members")
    .insert({
      company_id: access.companyId,
      name: name || null,
      email: email || null,
      phone: phone || null,
    })
    .select("id")
    .single();

  let fandtes = false;
  if (memberErr?.code === "23505") {
    const noegle = email
      ? { felt: "email" as const, vaerdi: email }
      : { felt: "phone" as const, vaerdi: phone };
    const { data: eksisterende } = await admin
      .from("loyalty_members")
      .select("id")
      .eq("company_id", access.companyId)
      .eq(noegle.felt, noegle.vaerdi)
      .maybeSingle();
    if (eksisterende) {
      member = eksisterende;
      memberErr = null;
      fandtes = true;
    }
  }
  if (memberErr || !member) {
    return { error: memberErr?.message ?? "Kunne ikke oprette kunden.", udfyldt };
  }

  /**
   * OG MEDLEMSKABET KAN OGSÅ FINDES: `unique (program_id, member_id)` har
   * stået i 0004 hele tiden. Svaret blev bare ikke læst, så en kunde, der
   * allerede var på kortet, fik "tilmeldt" at vide, uden at noget skete —
   * og en hvilken som helst ANDEN fejl forsvandt samme vej.
   */
  const { error: msFejl } = await admin.from("loyalty_memberships").insert({
    company_id: access.companyId,
    program_id: programId,
    member_id: member.id,
  });
  if (msFejl && msFejl.code !== "23505") {
    return {
      error: "Kunden blev oprettet, men ikke tilmeldt stempelkortet.",
      udfyldt,
    };
  }

  // Samtykke: vilkår (påkrævet) + markedsføring (valgfrit, aldrig obligatorisk).
  await admin.from("consent_records").insert({
    company_id: access.companyId,
    member_id: member.id,
    type: "terms",
    granted: true,
    channel: "dashboard",
    source: "staff_enroll",
  });
  if (bool(formData.get("consent_marketing"))) {
    await admin.from("consent_records").insert({
      company_id: access.companyId,
      member_id: member.id,
      type: "marketing",
      granted: true,
      channel: "dashboard",
      source: "staff_enroll",
    });
  }

  revalidatePath("/dashboard/loyalitet/kunder");
  // Personalet skal kunne se, at det er en kunde, butikken HAVDE — ellers
  // ligner den udfyldte formular en ny oprettelse, og navnet, de tastede,
  // står der ikke.
  redirect(
    `/dashboard/loyalitet/kunder/${member.id}${fandtes ? "?besked=fandtes" : ""}`,
  );
}

export interface StampActionState {
  ok?: boolean;
  error?: string;
  balance?: number;
  have?: number;
  required?: number;
  reached?: boolean;
  rewardEarned?: boolean;
  rewardName?: string | null;
  alreadyProcessed?: boolean;
}

/** Giver stempel til et medlemskab via ledger-kernen (idempotent). */
export async function giveStampAction(
  _prev: StampActionState,
  formData: FormData,
): Promise<StampActionState> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang." };

  const membershipId = str(formData.get("membership_id"));
  const stamps = Math.max(1, int(formData.get("stamps"), 1));
  const reference = str(formData.get("reference")) || null;
  const note = str(formData.get("note")) || null;
  const amount = numOrNull(formData.get("amount"));
  if (!membershipId) return { error: "Ugyldigt medlemskab." };

  const result = await giveStamp({
    access,
    membershipId,
    stamps,
    type: "stamp_manual",
    source: "staff",
    reference,
    note,
    amount,
  });

  if (!result.ok) return { error: result.error };

  revalidatePath("/dashboard/loyalitet/kunder");
  return {
    ok: true,
    balance: result.balance,
    have: result.progress.have,
    required: result.progress.required,
    reached: result.progress.reached,
    rewardEarned: result.rewardEarned,
    rewardName: result.rewardName,
    alreadyProcessed: result.alreadyProcessed,
  };
}

/** Indløser en optjent belønning. */
export async function redeemRewardAction(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access) return;
  const id = str(formData.get("customer_reward_id"));
  const memberId = str(formData.get("member_id"));
  if (!id) return;
  await redeemReward(access, id);
  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
}

/** Tilbagefører en transaktion (fejlrettelse). */
export async function reverseStampAction(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access) return;
  const id = str(formData.get("transaction_id"));
  const memberId = str(formData.get("member_id"));
  if (!id) return;
  await reverseStamp(access, id);
  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
}

// ---------------------------------------------------------------------------
// Rabatter
// ---------------------------------------------------------------------------

/** Opretter en rabatdefinition (ejer via RLS). */
export async function createDiscount(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) {
    return { error: "Du har ikke adgang til at oprette rabatter." };
  }
  if (!(await loyaltyInPlan(access.companyId))) {
    return { error: "Rabatter er en del af LoyalSum Komplet." };
  }
  const name = begraens(formData.get("name"), TEKST_MAKS.navn);

  /**
   * Otte felter og ÉT påkrævet: manglede navnet, tømte svaret resten med sig
   * — beløb, grænser og beskrivelse. Se `FormResult.udfyldt`.
   */
  const udfyldt = Object.fromEntries(
    [
      "name",
      "description",
      "type",
      "value",
      "min_purchase",
      "max_discount",
      "per_customer_limit",
      "total_limit",
      "status",
    ].map((felt) => [felt, str(formData.get(felt))]),
  );

  if (!name) return { error: "Giv rabatten et navn.", udfyldt };

  const supabase = await createClient();
  const { error } = await supabase.from("discounts").insert({
    company_id: access.companyId,
    name,
    description: str(formData.get("description")) || null,
    type: laesValg(formData.get("type"), DISCOUNT_TYPE_LABELS, "percent"),
    value: numOrNull(formData.get("value")) ?? 0,
    min_purchase: numOrNull(formData.get("min_purchase")),
    max_discount: numOrNull(formData.get("max_discount")),
    per_customer_limit: numOrNull(formData.get("per_customer_limit")),
    total_limit: numOrNull(formData.get("total_limit")),
    requires_approval: bool(formData.get("requires_approval")),
    status: laesValg(formData.get("status"), DISCOUNT_STATUS_LABELS, "active"),
  });
  if (error) return { error: error.message, udfyldt };

  revalidatePath("/dashboard/loyalitet/rabatter");
  redirect("/dashboard/loyalitet/rabatter");
}

/** Ændrer en rabats status. */
export async function setDiscountStatus(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canManage) return;
  if (!(await loyaltyInPlan(access.companyId))) return;
  const id = str(formData.get("discount_id"));
  const status = laesValg(formData.get("status"), DISCOUNT_STATUS_LABELS, "active");
  if (!id) return;
  const supabase = await createClient();
  await supabase
    .from("discounts")
    .update({ status })
    .eq("id", id)
    .eq("company_id", access.companyId);
  revalidatePath("/dashboard/loyalitet/rabatter");
}

/** Tildeler en rabat til en kunde (fx kompensation via feedback recovery). */
export async function grantDiscountAction(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const access = await getCompanyAccess();
  if (!access) return { error: "Du har ikke adgang." };
  const memberId = str(formData.get("member_id"));
  const discountId = str(formData.get("discount_id"));
  if (!memberId || !discountId) return { error: "Vælg en rabat." };

  const result = await grantDiscount({
    access,
    memberId,
    discountId,
    note: str(formData.get("note")) || null,
    source: "staff",
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
  return { ok: true };
}

/** Indløser en tildelt rabat. */
export async function redeemDiscountAction(formData: FormData): Promise<void> {
  const access = await getCompanyAccess();
  if (!access) return;
  const id = str(formData.get("customer_discount_id"));
  const memberId = str(formData.get("member_id"));
  if (!id) return;
  await redeemDiscount(access, id);
  revalidatePath(`/dashboard/loyalitet/kunder/${memberId}`);
}
