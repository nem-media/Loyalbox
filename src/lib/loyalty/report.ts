/**
 * Loyalitets-rapport — beregner nøgletal for en virksomhed over en periode.
 * Beregningerne er bevidst dokumenteret, så tallene er entydige.
 */
import { createClient } from "@/lib/supabase/server";

export type Period = "today" | "7" | "30" | "90";

export const PERIOD_LABELS: Record<Period, string> = {
  today: "I dag",
  "7": "7 dage",
  "30": "30 dage",
  "90": "90 dage",
};

export function periodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  if (period === "today") {
    return { from: now.toISOString().slice(0, 10) + "T00:00:00.000Z", to };
  }
  const days = parseInt(period, 10);
  return { from: new Date(now.getTime() - days * 86400000).toISOString(), to };
}

export interface NamedCount {
  memberId: string;
  name: string;
  value: number;
}
export interface NearReward {
  memberId: string;
  name: string;
  have: number;
  required: number;
}
export interface RecentEntry {
  id: string;
  type: string;
  stamps: number;
  memberName: string;
  createdAt: string;
}

export interface LoyaltyReport {
  newMembers: number; // medlemmer oprettet i perioden
  totalMembers: number; // alle medlemmer (all-time)
  activeMembers: number; // medlemmer med ≥1 stempel i perioden
  stampsGiven: number; // sum af positive stempler i perioden
  stampsRemoved: number; // sum af fjernede/tilbageførte stempler i perioden
  rewardsEarned: number; // belønninger optjent i perioden
  rewardsRedeemed: number; // belønninger indløst i perioden
  redemptionRate: number; // indløst / optjent i perioden (%)
  discountsRedeemed: number; // rabatter indløst i perioden
  revisitRate: number; // andel af aktive medlemmer med ≥2 besøgsdage i perioden (%)
  avgStamps: number; // gennemsnitlig aktuel saldo pr. medlemskab
  mostPopularReward: string | null; // mest indløste belønning i perioden
  mostActive: NamedCount[]; // top 5 kunder efter stempler i perioden
  nearReward: NearReward[]; // kunder der mangler 1-2 stempler
  recent: RecentEntry[]; // seneste aktivitet
}

const inRange = (iso: string | null, from: string, to: string) =>
  !!iso && iso >= from && iso <= to;

export async function getLoyaltyReport(
  companyId: string,
  period: Period,
): Promise<LoyaltyReport> {
  const { from, to } = periodRange(period);
  const supabase = await createClient();

  const [
    { data: txns },
    { data: members },
    { data: memberships },
    { data: rewards },
    { data: customerRewards },
    { data: customerDiscounts },
  ] = await Promise.all([
    supabase
      .from("loyalty_transactions")
      .select("id, member_id, stamps, type, created_at")
      .eq("company_id", companyId)
      .gte("created_at", from)
      .lte("created_at", to)
      .order("created_at", { ascending: false }),
    supabase
      .from("loyalty_members")
      .select("id, name, created_at")
      .eq("company_id", companyId)
      .limit(5000),
    supabase
      .from("loyalty_memberships")
      .select("member_id, program_id, balance_cache")
      .eq("company_id", companyId),
    supabase
      .from("loyalty_rewards")
      .select("id, program_id, required_stamps, name")
      .eq("company_id", companyId)
      .eq("is_primary", true),
    supabase
      .from("customer_rewards")
      .select("reward_id, earned_at, redeemed_at")
      .eq("company_id", companyId),
    supabase
      .from("customer_discounts")
      .select("redeemed_at")
      .eq("company_id", companyId),
  ]);

  const memberName = new Map(
    (members ?? []).map((m) => [m.id, m.name || "Uden navn"]),
  );
  const rewardName = new Map((rewards ?? []).map((r) => [r.id, r.name]));
  const requiredByProgram = new Map(
    (rewards ?? []).map((r) => [r.program_id, r.required_stamps]),
  );

  const positive = (txns ?? []).filter((t) => t.stamps > 0);
  const stampsGiven = positive.reduce((s, t) => s + t.stamps, 0);
  const stampsRemoved = (txns ?? [])
    .filter((t) => t.stamps < 0)
    .reduce((s, t) => s + Math.abs(t.stamps), 0);

  // Aktive medlemmer + besøgsdage (til genbesøgsrate)
  const daysByMember = new Map<string, Set<string>>();
  for (const t of positive) {
    if (!t.member_id) continue;
    const set = daysByMember.get(t.member_id) ?? new Set<string>();
    set.add(t.created_at.slice(0, 10));
    daysByMember.set(t.member_id, set);
  }
  const activeMembers = daysByMember.size;
  const revisitMembers = [...daysByMember.values()].filter(
    (s) => s.size >= 2,
  ).length;
  const revisitRate = activeMembers
    ? Math.round((revisitMembers / activeMembers) * 100)
    : 0;

  // Mest aktive kunder (stempler i perioden)
  const stampsByMember = new Map<string, number>();
  for (const t of positive) {
    if (!t.member_id) continue;
    stampsByMember.set(
      t.member_id,
      (stampsByMember.get(t.member_id) ?? 0) + t.stamps,
    );
  }
  const mostActive: NamedCount[] = [...stampsByMember.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([memberId, value]) => ({
      memberId,
      name: memberName.get(memberId) ?? "Uden navn",
      value,
    }));

  // Kunder tæt på en belønning (mangler 1-2 stempler)
  const nearReward: NearReward[] = [];
  for (const ms of memberships ?? []) {
    const required = requiredByProgram.get(ms.program_id);
    if (!required) continue;
    const remaining = required - ms.balance_cache;
    if (remaining >= 1 && remaining <= 2) {
      nearReward.push({
        memberId: ms.member_id,
        name: memberName.get(ms.member_id) ?? "Uden navn",
        have: ms.balance_cache,
        required,
      });
    }
  }
  nearReward.sort((a, b) => b.have - a.have);

  // Belønninger optjent/indløst i perioden
  const rewardsEarned = (customerRewards ?? []).filter((r) =>
    inRange(r.earned_at, from, to),
  ).length;
  const redeemedInPeriod = (customerRewards ?? []).filter((r) =>
    inRange(r.redeemed_at, from, to),
  );
  const rewardsRedeemed = redeemedInPeriod.length;
  const redemptionRate = rewardsEarned
    ? Math.round((rewardsRedeemed / rewardsEarned) * 100)
    : 0;

  // Mest populære belønning (mest indløst i perioden)
  const redeemCount = new Map<string, number>();
  for (const r of redeemedInPeriod) {
    redeemCount.set(r.reward_id, (redeemCount.get(r.reward_id) ?? 0) + 1);
  }
  const topReward = [...redeemCount.entries()].sort((a, b) => b[1] - a[1])[0];
  const mostPopularReward = topReward
    ? rewardName.get(topReward[0]) ?? null
    : null;

  const discountsRedeemed = (customerDiscounts ?? []).filter((d) =>
    inRange(d.redeemed_at, from, to),
  ).length;

  const totalBalance = (memberships ?? []).reduce(
    (s, m) => s + m.balance_cache,
    0,
  );
  const avgStamps = memberships && memberships.length
    ? Math.round((totalBalance / memberships.length) * 10) / 10
    : 0;

  const recent: RecentEntry[] = (txns ?? []).slice(0, 8).map((t) => ({
    id: t.id,
    type: t.type,
    stamps: t.stamps,
    memberName: t.member_id ? memberName.get(t.member_id) ?? "Kunde" : "Kunde",
    createdAt: t.created_at,
  }));

  return {
    newMembers: (members ?? []).filter((m) => inRange(m.created_at, from, to))
      .length,
    totalMembers: (members ?? []).length,
    activeMembers,
    stampsGiven,
    stampsRemoved,
    rewardsEarned,
    rewardsRedeemed,
    redemptionRate,
    discountsRedeemed,
    revisitRate,
    avgStamps,
    mostPopularReward,
    mostActive,
    nearReward: nearReward.slice(0, 6),
    recent,
  };
}
