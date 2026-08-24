import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Kundekonti: bindeleddet mellem en auth-bruger og butikkernes `loyalty_members`.
 *
 * En slutkunde behøver ALDRIG en konto — token-URL'en `/kort/<public_token>` er
 * fortsat den primære vej ind. Kontoen er et frivilligt lag ovenpå, så kunden
 * kan finde sine kort igen på en ny telefon og samle kort fra flere butikker ét
 * sted (`/mine-kort`).
 *
 * Regel for tilknytning: BESIDDELSE AF TOKENET er beviset. Et kort kan kun
 * knyttes til en konto fra kortets egen URL — aldrig ved at matche på e-mail,
 * da e-mails ikke er verificerede ved signup. Se `claimCardForUser`.
 */

export interface MemberCard {
  /** Kortets offentlige token — linket til `/kort/<token>`. */
  token: string;
  memberId: string;
  memberName: string | null;
  companyName: string;
  companyLogo: string | null;
  /** Null når kunden er oprettet, men endnu ikke tilmeldt et program. */
  programName: string | null;
  color: string;
  filled: number;
  requiredStamps: number;
  rewardName: string | null;
  cardText: string | null;
  /** Antal optjente, endnu ikke indløste belønninger på dette kort. */
  availableRewards: number;
}

/**
 * Alle stempelkort knyttet til en bruger — ét element pr. medlemskab, så en
 * kunde med kort i flere butikker (eller flere programmer i samme butik) får
 * dem alle. Læses med service-role, fordi kortdata ligger bag RLS pr. firma.
 */
export async function getCardsForUser(userId: string): Promise<MemberCard[]> {
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("loyalty_members")
    .select("id, company_id, name, public_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!members || members.length === 0) return [];

  const memberIds = members.map((m) => m.id);
  const companyIds = [...new Set(members.map((m) => m.company_id))];

  const [{ data: companies }, { data: memberships }, { data: rewardsEarned }] =
    await Promise.all([
      admin.from("companies").select("id, name, logo_url").in("id", companyIds),
      admin
        .from("loyalty_memberships")
        .select("id, member_id, program_id, balance_cache")
        .in("member_id", memberIds),
      admin
        .from("customer_rewards")
        .select("id, member_id, membership_id")
        .in("member_id", memberIds)
        .eq("status", "available"),
    ]);

  const programIds = [...new Set((memberships ?? []).map((ms) => ms.program_id))];
  const [{ data: programs }, { data: rewards }] = await Promise.all([
    programIds.length
      ? admin
          .from("loyalty_programs")
          .select("id, name, color, card_text")
          .in("id", programIds)
      : Promise.resolve({ data: [] as never[] }),
    programIds.length
      ? admin
          .from("loyalty_rewards")
          .select("program_id, name, required_stamps")
          .in("program_id", programIds)
          .eq("is_primary", true)
      : Promise.resolve({ data: [] as never[] }),
  ]);

  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));
  const programById = new Map((programs ?? []).map((p) => [p.id, p]));
  const rewardByProgram = new Map((rewards ?? []).map((r) => [r.program_id, r]));

  const cards: MemberCard[] = [];
  for (const member of members) {
    const company = companyById.get(member.company_id);
    const mine = (memberships ?? []).filter((ms) => ms.member_id === member.id);

    const base = {
      token: member.public_token,
      memberId: member.id,
      memberName: member.name,
      companyName: company?.name ?? "Butik",
      companyLogo: company?.logo_url ?? null,
    };

    if (mine.length === 0) {
      cards.push({
        ...base,
        programName: null,
        color: "#2c324e",
        filled: 0,
        requiredStamps: 10,
        rewardName: null,
        cardText: null,
        availableRewards: 0,
      });
      continue;
    }

    for (const ms of mine) {
      const program = programById.get(ms.program_id);
      const reward = rewardByProgram.get(ms.program_id);
      cards.push({
        ...base,
        programName: program?.name ?? "Stempelkort",
        color: program?.color ?? "#2c324e",
        filled: ms.balance_cache,
        requiredStamps: reward?.required_stamps ?? 10,
        rewardName: reward?.name ?? null,
        cardText: program?.card_text ?? null,
        availableRewards: (rewardsEarned ?? []).filter(
          (r) => r.membership_id === ms.id,
        ).length,
      });
    }
  }

  return cards;
}

export type ClaimResult =
  | { ok: true; alreadyMine: boolean }
  | { ok: false; error: string };

/**
 * Knytter kortet bag `token` til `userId`.
 *
 * Tokenet ER autorisationen: kun den, der har kortets URL, kan knytte det til en
 * konto. Et kort der allerede tilhører en ANDEN konto røres aldrig — ellers
 * kunne et delt link overtage en fremmed kundes kort.
 */
export async function claimCardForUser(
  token: string,
  userId: string,
): Promise<ClaimResult> {
  if (!token) return { ok: false, error: "Ugyldigt kort." };

  const admin = createAdminClient();
  const { data: member, error } = await admin
    .from("loyalty_members")
    .select("id, user_id")
    .eq("public_token", token)
    .maybeSingle();

  if (error) {
    return { ok: false, error: "Kunne ikke hente kortet lige nu. Prøv igen." };
  }
  if (!member) return { ok: false, error: "Kortet blev ikke fundet." };
  if (member.user_id === userId) return { ok: true, alreadyMine: true };
  if (member.user_id) {
    return {
      ok: false,
      error: "Kortet er allerede knyttet til en anden konto.",
    };
  }

  const { error: updateError } = await admin
    .from("loyalty_members")
    .update({ user_id: userId, claimed_at: new Date().toISOString() })
    .eq("id", member.id)
    .is("user_id", null);

  if (updateError) {
    return { ok: false, error: "Kunne ikke gemme kortet på din konto." };
  }
  return { ok: true, alreadyMine: false };
}

/** Har brugeren mindst ét stempelkort? Bruges til at vælge landingsside. */
export async function userHasCards(userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("loyalty_members")
    .select("id")
    .eq("user_id", userId)
    .limit(1)
    .maybeSingle();
  return Boolean(data);
}
