"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { getCurrentUser } from "@/lib/auth";
import { claimCardForUser } from "@/lib/loyalty/member-account";
import { giveStamp, redeemReward } from "@/lib/loyalty/service";

export interface EnrollState {
  error?: string;
  /** Kortet er beskyttet af en konto — kunden skal logge ind for at åbne det. */
  loginRequired?: boolean;
}

export interface ClaimCardState {
  ok?: boolean;
  error?: string;
}

export interface StampByTokenState {
  ok?: boolean;
  error?: string;
  have?: number;
  required?: number;
  rewardEarned?: boolean;
  rewardName?: string | null;
}

export interface RedeemByTokenState {
  ok?: boolean;
  error?: string;
}

const str = (v: FormDataEntryValue | null) => String(v ?? "").trim();
const bool = (v: FormDataEntryValue | null) => v === "on" || v === "true";

/**
 * Offentlig selvtilmelding fra en stander. Kunden opretter (eller genåbner) sit
 * eget stempelkort. Der gives ALDRIG stempler her — kun medlemskabet oprettes,
 * så en kunde ikke kan give sig selv stempler ved at genindlæse siden.
 */
export async function selfEnroll(
  _prev: EnrollState,
  formData: FormData,
): Promise<EnrollState> {
  const slug = str(formData.get("slug"));
  const name = str(formData.get("name"));
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));

  if (!slug) return { error: "Ugyldig stander." };
  if (!name && !email && !phone) {
    return { error: "Udfyld mindst dit navn, din e-mail eller dit telefonnummer." };
  }
  if (!bool(formData.get("consent_terms"))) {
    return { error: "Du skal acceptere vilkårene for at oprette et stempelkort." };
  }

  const admin = createAdminClient();

  // Stander → virksomhed
  const { data: stand } = await admin
    .from("stands")
    .select("company_id, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!stand || !stand.is_active) return { error: "Standeren blev ikke fundet." };

  // Aktivt stempelkort for virksomheden
  const { data: program } = await admin
    .from("loyalty_programs")
    .select("id")
    .eq("company_id", stand.company_id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  if (!program) {
    return { error: "Der er endnu ikke noget aktivt stempelkort her." };
  }

  // Er den besøgende logget ind, knyttes kortet til deres konto med det samme.
  const visitor = await getCurrentUser();

  // Genbrug eksisterende medlem (åbn kort) hvis e-mail/telefon matcher.
  let memberId: string | null = null;
  let token: string | null = null;
  if (email || phone) {
    const { data: existing } = await admin
      .from("loyalty_members")
      .select("id, public_token, user_id")
      .eq("company_id", stand.company_id)
      .or([email ? `email.eq.${email}` : "", phone ? `phone.eq.${phone}` : ""]
        .filter(Boolean)
        .join(","))
      .limit(1)
      .maybeSingle();
    if (existing) {
      // Har kunden knyttet kortet til en konto, er e-mail/telefon ikke længere
      // nok til at åbne det — ellers kunne en fremmed med kendskab til blot en
      // e-mailadresse få kortets token udleveret her.
      if (existing.user_id && existing.user_id !== visitor?.id) {
        return {
          error:
            "Der findes allerede et stempelkort med de oplysninger, og det er knyttet til en konto. Log ind for at åbne det.",
          loginRequired: true,
        };
      }
      memberId = existing.id;
      token = existing.public_token;
    }
  }

  if (!memberId) {
    const { data: member, error } = await admin
      .from("loyalty_members")
      .insert({
        company_id: stand.company_id,
        name: name || null,
        email: email || null,
        phone: phone || null,
        user_id: visitor?.id ?? null,
        claimed_at: visitor ? new Date().toISOString() : null,
      })
      .select("id, public_token")
      .single();
    if (error || !member) {
      return { error: "Kunne ikke oprette kortet. Prøv igen." };
    }
    memberId = member.id;
    token = member.public_token;
  } else if (visitor && token) {
    // Eksisterende, endnu ikke tilknyttet kort — knyt det til den indloggede.
    await claimCardForUser(token, visitor.id);
  }

  // Sikr medlemskab til programmet (idempotent).
  const { data: membership } = await admin
    .from("loyalty_memberships")
    .select("id")
    .eq("program_id", program.id)
    .eq("member_id", memberId)
    .maybeSingle();
  if (!membership) {
    await admin.from("loyalty_memberships").insert({
      company_id: stand.company_id,
      program_id: program.id,
      member_id: memberId,
    });
  }

  // Samtykke
  const ip = (await headers()).get("x-forwarded-for");
  await admin.from("consent_records").insert({
    company_id: stand.company_id,
    member_id: memberId,
    type: "terms",
    granted: true,
    channel: "self_enroll",
    source: `stand:${slug}`,
    ip,
  });
  if (bool(formData.get("consent_marketing"))) {
    await admin.from("consent_records").insert({
      company_id: stand.company_id,
      member_id: memberId,
      type: "marketing",
      granted: true,
      channel: "self_enroll",
      source: `stand:${slug}`,
      ip,
    });
  }

  redirect(`/kort/${token}`);
}

/**
 * Gem kortet på kundens konto. Kaldes fra kortets egen side, og det er netop
 * pointen: BESIDDELSE AF TOKENET er autorisationen. Der knyttes aldrig kort ud
 * fra e-mail-match, fordi e-mails ikke verificeres ved signup. Et kort der
 * allerede tilhører en anden konto røres ikke.
 */
export async function claimCard(
  _prev: ClaimCardState,
  formData: FormData,
): Promise<ClaimCardState> {
  const user = await getCurrentUser();
  if (!user) return { error: "Log ind for at gemme kortet." };

  const token = str(formData.get("token"));
  if (!token) return { error: "Ugyldigt kort." };

  const result = await claimCardForUser(token, user.id);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/kort/${token}`);
  return { ok: true };
}

/**
 * Scan-til-stempel: personale scanner kundens QR (`/kort/[token]`) og giver et
 * stempel direkte fra kortet. Kundens `public_token` er offentligt, så denne
 * handling kræver ALTID et gyldigt personale-login med `canStamp` for netop
 * kortets virksomhed — ellers kunne kunden stemple sig selv. `giveStamp`
 * re-validerer desuden firma-tilhørsforholdet, så tjekket her er dybde-forsvar.
 */
export async function stampByToken(
  _prev: StampByTokenState,
  formData: FormData,
): Promise<StampByTokenState> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canStamp) {
    return { error: "Kun personale kan give stempler." };
  }

  const token = str(formData.get("token"));
  const membershipId = str(formData.get("membership_id"));
  if (!token || !membershipId) return { error: "Ugyldigt kort." };

  const admin = createAdminClient();

  // Token → medlem. Kortet skal tilhøre personalets egen virksomhed.
  // En netværks-/DB-fejl giver også data=null, så vi skelner den fra "findes
  // ikke" og beder om et nyt forsøg i stedet for at melde kortet ukendt.
  const { data: member, error: memberErr } = await admin
    .from("loyalty_members")
    .select("id, company_id")
    .eq("public_token", token)
    .maybeSingle();
  if (memberErr) {
    return { error: "Kunne ikke hente kortet lige nu. Tjek forbindelsen og prøv igen." };
  }
  if (!member || member.company_id !== access.companyId) {
    return { error: "Kortet blev ikke fundet." };
  }

  // Medlemskabet skal høre til netop dette medlem.
  const { data: membership, error: membershipErr } = await admin
    .from("loyalty_memberships")
    .select("id, member_id")
    .eq("id", membershipId)
    .maybeSingle();
  if (membershipErr) {
    return { error: "Kunne ikke hente kortet lige nu. Tjek forbindelsen og prøv igen." };
  }
  if (!membership || membership.member_id !== member.id) {
    return { error: "Stempelkortet passer ikke til denne kunde." };
  }

  const result = await giveStamp({
    access,
    membershipId,
    stamps: 1,
    type: "stamp_manual",
    source: "staff",
  });
  if (!result.ok) return { error: result.error };

  revalidatePath(`/kort/${token}`);
  return {
    ok: true,
    have: result.progress.have,
    required: result.progress.required,
    rewardEarned: result.rewardEarned,
    rewardName: result.rewardName,
  };
}

/**
 * Indløs-fra-kort: personale indløser en optjent belønning direkte fra kundens
 * QR-kort. Samme sikkerhedsmønster som `stampByToken` — kræver ALTID et gyldigt
 * personale-login med `canRedeem` for kortets egen virksomhed, og belønningen
 * skal tilhøre netop dette medlem. `redeemReward` re-validerer firma-
 * tilhørsforholdet, så tjekket her er dybde-forsvar.
 */
export async function redeemRewardByToken(
  _prev: RedeemByTokenState,
  formData: FormData,
): Promise<RedeemByTokenState> {
  const access = await getCompanyAccess();
  if (!access || !access.permissions.canRedeem) {
    return { error: "Kun personale kan indløse belønninger." };
  }

  const token = str(formData.get("token"));
  const rewardId = str(formData.get("customer_reward_id"));
  if (!token || !rewardId) return { error: "Ugyldigt kort." };

  const admin = createAdminClient();

  // Token → medlem. Kortet skal tilhøre personalets egen virksomhed. En
  // netværks-/DB-fejl giver også data=null, så vi skelner den fra "findes ikke".
  const { data: member, error: memberErr } = await admin
    .from("loyalty_members")
    .select("id, company_id")
    .eq("public_token", token)
    .maybeSingle();
  if (memberErr) {
    return { error: "Kunne ikke hente kortet lige nu. Tjek forbindelsen og prøv igen." };
  }
  if (!member || member.company_id !== access.companyId) {
    return { error: "Kortet blev ikke fundet." };
  }

  // Belønningen skal høre til netop dette medlem.
  const { data: cr, error: crErr } = await admin
    .from("customer_rewards")
    .select("id, member_id")
    .eq("id", rewardId)
    .maybeSingle();
  if (crErr) {
    return { error: "Kunne ikke hente belønningen lige nu. Tjek forbindelsen og prøv igen." };
  }
  if (!cr || cr.member_id !== member.id) {
    return { error: "Belønningen passer ikke til denne kunde." };
  }

  const result = await redeemReward(access, rewardId);
  if (!result.ok) return { error: result.error };

  revalidatePath(`/kort/${token}`);
  return { ok: true };
}
