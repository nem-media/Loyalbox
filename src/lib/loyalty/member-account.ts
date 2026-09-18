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
  /**
   * Kortets datovindue. Oversigten skal sige NØJAGTIG det samme som kortsiden
   * om, hvor længe kortet gælder — se `gyldighed()` i program-status.ts.
   */
  startDato: string | null;
  slutDato: string | null;
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
          // Datovinduet skal MED: kortet viser sin egen gyldighed, og
          // "Mine stempelkort" skal sige nøjagtig det samme som kortsiden.
          .select("id, name, color, card_text, start_date, end_date")
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
        color: "#1e1c1a",
        filled: 0,
        requiredStamps: 10,
        rewardName: null,
        cardText: null,
        availableRewards: 0,
        startDato: null,
        slutDato: null,
      });
      continue;
    }

    for (const ms of mine) {
      const program = programById.get(ms.program_id);
      const reward = rewardByProgram.get(ms.program_id);
      cards.push({
        ...base,
        programName: program?.name ?? "Stempelkort",
        color: program?.color ?? "#1e1c1a",
        filled: ms.balance_cache,
        requiredStamps: reward?.required_stamps ?? 10,
        rewardName: reward?.name ?? null,
        cardText: program?.card_text ?? null,
        availableRewards: (rewardsEarned ?? []).filter(
          (r) => r.membership_id === ms.id,
        ).length,
        startDato: program?.start_date ?? null,
        slutDato: program?.end_date ?? null,
      });
    }
  }

  return cards;
}

export type ClaimResult =
  | { ok: true; alreadyMine: boolean }
  | { ok: false; error: string };

/**
 * Må et NYT kort knyttes automatisk til den, der er logget ind?
 *
 * KUN NÅR E-MAILEN ER DEN SAMME. Tilmeldingen knyttede før kortet til hvem som
 * helst, browseren var logget ind som. På kundens egen telefon er det en
 * venlighed — men tilmeldingen sker typisk på butikkens tablet ved disken, og
 * den er logget ind som ejeren eller en medarbejder. Så blev hver kundes kort
 * bundet til personalets konto, og kunden kunne aldrig få det tilbage.
 *
 * E-mailen er det eneste, der binder den indloggede til den, der står i
 * formularen. Er der ingen e-mail, eller passer de ikke, oprettes kortet frit,
 * og kunden kan selv trykke "Gem på min konto" fra kortets egen adresse — en
 * HANDLING, ikke en bivirkning, præcis som `claimCardForUser` nedenfor.
 *
 * Ren funktion, så reglen kan prøves uden en base og uden en browser.
 */
export function maaKnyttesAutomatisk(
  kontoEmail: string | null | undefined,
  formularEmail: string | null | undefined,
): boolean {
  const a = (kontoEmail ?? "").trim().toLowerCase();
  const b = (formularEmail ?? "").trim().toLowerCase();
  if (!a || !b) return false;
  return a === b;
}

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

  /*
   * DEN BETINGEDE OPDATERING VAR DER — SVARET BLEV BARE IKKE SET PÅ.
   *
   * `.is("user_id", null)` er præcis det rigtige greb: den afgør kapløbet i
   * databasen, så to konti ikke kan tage det samme kort. Men resultatet blev
   * ikke læst, og en `update` mod PostgREST svarer glad, når den rammer nul
   * rækker — så taberen fik `{ ok: true }` og beskeden om, at kortet nu lå på
   * deres konto. Det gjorde det ikke, og de ville først opdage det, når
   * "Mine stempelkort" var tom.
   *
   * MÅLT 2026-09-15: to samtidige forsøg på samme token gav "OK" begge gange;
   * kun det ene ramte en række. Opslaget ovenfor fanger det IKKE — det er
   * netop derfor, der er en betinget opdatering, og derfor dens svar skal
   * læses. `aktiver/actions.ts` gør det rigtigt på præcis samme mønster; det
   * er kun her, tjekket manglede.
   *
   * ET DELT KORTLINK ER IKKE en fjern mulighed: to i en husstand, der scanner
   * det samme kort og begge trykker "gem på min konto".
   */
  const { data: knyttet, error: updateError } = await admin
    .from("loyalty_members")
    .update({ user_id: userId, claimed_at: new Date().toISOString() })
    .eq("id", member.id)
    .is("user_id", null)
    .select("id");

  if (updateError) {
    return { ok: false, error: "Kunne ikke gemme kortet på din konto." };
  }
  if (!knyttet?.length) {
    // Kapløbet er tabt. Beskeden er den samme, som hvis kortet allerede havde
    // en ejer ved opslaget ovenfor — for det er præcis dét, der er sket.
    return {
      ok: false,
      error: "Kortet er allerede knyttet til en anden konto.",
    };
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


/**
 * Kundens POINTKORT — samme konto, samme oversigt som stempelkortene.
 *
 * Der er ikke en pointkonto ved siden af LoyalSum-kontoen: nøglen er den
 * samme `loyalty_members`-række, kortet ligger på den samme adresse, og
 * "Mine fordele" viser begge former i én liste. Det er hele meningen med at
 * bygge pointprogrammet ind i platformen frem for ved siden af.
 */
export interface PointKortOversigt {
  token: string;
  memberId: string;
  companyName: string;
  companyLogo: string | null;
  programName: string;
  saldo: number;
  /** Den billigste belønning, kunden endnu ikke har råd til. */
  naesteNavn: string | null;
  naestePris: number | null;
  /** Kan kunden bruge mindst én belønning lige nu? */
  klarTilBrug: boolean;
  paused: boolean;
}

export async function getPointCardsForUser(
  userId: string,
): Promise<PointKortOversigt[]> {
  const admin = createAdminClient();

  const { data: members } = await admin
    .from("loyalty_members")
    .select("id, company_id, public_token")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (!members || members.length === 0) return [];

  const memberIds = members.map((m) => m.id);

  const { data: konti } = await admin
    .from("loyalty_point_accounts")
    .select("id, member_id, program_id, balance")
    .in("member_id", memberIds);

  if (!konti || konti.length === 0) return [];

  const programIds = [...new Set(konti.map((k) => k.program_id))];
  const companyIds = [...new Set(members.map((m) => m.company_id))];

  /*
   * TRE OPSLAG I ALT — ikke ét pr. kort. En kunde med kort i fem butikker
   * ville ellers koste femten forespørgsler på en side, der skal åbne på en
   * telefon i en kø.
   */
  const [{ data: programs }, { data: companies }, { data: rewards }] =
    await Promise.all([
      admin
        .from("loyalty_point_programs")
        .select("id, name, status")
        .in("id", programIds),
      admin.from("companies").select("id, name, logo_url").in("id", companyIds),
      admin
        .from("loyalty_point_rewards")
        .select("id, program_id, name, points_cost, status")
        .in("program_id", programIds)
        .eq("status", "active"),
    ]);

  const programById = new Map((programs ?? []).map((p) => [p.id, p]));
  const companyById = new Map((companies ?? []).map((c) => [c.id, c]));
  const memberById = new Map(members.map((m) => [m.id, m]));

  const kort: PointKortOversigt[] = [];
  for (const k of konti) {
    const program = programById.get(k.program_id);
    const member = memberById.get(k.member_id);
    if (!program || !member) continue;
    // Et arkiveret program er historik og hører ikke til i kundens oversigt.
    if (program.status === "archived") continue;

    const company = companyById.get(member.company_id);
    const mine = (rewards ?? []).filter((r) => r.program_id === k.program_id);
    const naeste = mine
      .filter((r) => r.points_cost > k.balance)
      .sort((a, b) => a.points_cost - b.points_cost)[0];

    kort.push({
      token: member.public_token,
      memberId: member.id,
      companyName: company?.name ?? "Butik",
      companyLogo: company?.logo_url ?? null,
      programName: program.name,
      saldo: k.balance,
      naesteNavn: naeste?.name ?? null,
      naestePris: naeste?.points_cost ?? null,
      klarTilBrug: mine.some((r) => r.points_cost <= k.balance),
      paused: program.status !== "active",
    });
  }

  return kort;
}
