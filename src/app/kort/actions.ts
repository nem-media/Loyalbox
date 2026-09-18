"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { getCurrentUser } from "@/lib/auth";
import {
  claimCardForUser,
  maaKnyttesAutomatisk,
} from "@/lib/loyalty/member-account";
import { giveStamp, redeemReward } from "@/lib/loyalty/service";
import {
  hentAktivePointProgrammer,
  sikrePointKonto,
} from "@/lib/loyalty/point-service";
import { begraens, TEKST_MAKS } from "@/lib/tekstgraenser";
import {
  kortLinkMail,
  KORT_LINK_KARANTAENE_MINUTTER,
} from "@/lib/loyalty/kort-link";
import { sendKundeMail } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import { getSiteUrl } from "@/lib/site";

export interface EnrollState {
  error?: string;
  /** Kortet er beskyttet af en konto — kunden skal logge ind for at åbne det. */
  loginRequired?: boolean;
  /**
   * Hvilket forsøg i rækken det her svar hører til.
   *
   * Bruges som `key` på afkrydsningsfelterne i formularen. React nulstiller en
   * formular, når en server action svarer, og for et STYRET afkrydsningsfelt
   * bliver DOM'ens `checked` sat tilbage uden at React opdager det — tilstanden
   * er jo uændret, så der gentegnes ikke. Feltet så derfor tomt ud, mens
   * komponenten mente det modsatte. Et nyt `key` pr. svar tvinger felterne til
   * at blive tegnet forfra fra tilstanden. Teksterne har ikke problemet.
   */
  forsoeg?: number;
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
  const name = begraens(formData.get("name"), TEKST_MAKS.navn);
  const email = str(formData.get("email"));
  const phone = str(formData.get("phone"));

  // Ét sted ud med en fejl, så forsøgstælleren aldrig kan blive glemt på en af
  // dem — se `forsoeg` i EnrollState.
  const forsoeg = (_prev.forsoeg ?? 0) + 1;
  const fejl = (error: string, extra: Partial<EnrollState> = {}): EnrollState => ({
    error,
    forsoeg,
    ...extra,
  });

  if (!slug) return fejl("Ugyldig stander.");

  /*
   * E-MAIL ELLER TELEFON ER NØGLEN TIL AT FÅ KORTET IGEN — OG DERFOR KRÆVET.
   *
   * Før rakte et NAVN. Det lyder venligt og var det modsatte: navnet bruges
   * ikke til at genkende nogen (genbrugsopslaget nedenfor slår kun op på
   * e-mail og telefon), så et kort oprettet med bare et fornavn kunne kun
   * åbnes med den hemmelige adresse. Mistede kunden linket, var kortet og
   * stemplerne væk — uden at nogen kunne hjælpe, heller ikke butikken.
   *
   * Sitet lover "uden app · uden konto", og dét løfte holder KUN, fordi man
   * kan tilmelde sig igen med de samme oplysninger og få sit eget kort
   * tilbage. Uden en nøgle er løftet ikke sandt.
   *
   * NAVNET ER STADIG FRIVILLIGT: det står på kortet og er en venlighed ved
   * disken, men det er ikke dét, der finder kortet frem igen.
   */
  if (!email && !phone) {
    return fejl(
      "Skriv din e-mail eller dit telefonnummer — det er dét, der gør, at du kan få kortet frem igen, hvis du mister linket.",
    );
  }
  if (!bool(formData.get("consent_terms"))) {
    return fejl("Du skal acceptere vilkårene for at blive medlem.");
  }

  const admin = createAdminClient();

  // Stander → virksomhed
  const { data: stand } = await admin
    .from("stands")
    .select("company_id, is_active")
    .eq("slug", slug)
    .maybeSingle();
  if (!stand || !stand.is_active) return fejl("Standeren blev ikke fundet.");

  /*
   * BUTIKKEN KAN HAVE ET STEMPELKORT, ET POINTPROGRAM ELLER BEGGE.
   *
   * Før krævede tilmeldingen et aktivt STEMPELKORT, og det var rigtigt, så
   * længe der kun fandtes én loyalitetsform. Med pointprogrammet ville den
   * samme linje have lukket en café ude, der kun kører point: kunden scanner
   * standeren, skriver sin mail og får at vide, at der ikke er noget kort.
   *
   * Der er ÉN tilmelding til begge former — kunden tilmelder sig BUTIKKEN, og
   * hvad hun så kommer med i, følger af, hvad butikken har åbent.
   */
  const { data: program } = await admin
    .from("loyalty_programs")
    .select("id")
    .eq("company_id", stand.company_id)
    .eq("status", "active")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  // ALLE aktive pointprogrammer — en butik kan have op til fem (0045), og
  // kunden melder sig ind i dem med ét tryk, præcis som med stempelkortet.
  const pointProgrammer = await hentAktivePointProgrammer(stand.company_id, admin);

  if (!program && pointProgrammer.length === 0) {
    return fejl("Der er endnu ikke noget aktivt kundeprogram her.");
  }

  const visitor = await getCurrentUser();

  /*
   * KORTET KNYTTES KUN TIL KONTOEN, HVIS E-MAILEN ER DEN SAMME.
   *
   * Før blev kortet knyttet til hvem som helst, der var logget ind i browseren.
   * Det lyder som en venlighed og er det på kundens egen telefon — men
   * tilmeldingen sker typisk på butikkens tablet ved disken, og den er logget
   * ind som ejeren eller en medarbejder. Så blev HVER kundes kort bundet til
   * personalets konto, og kunden kunne aldrig få det: spærren nedenfor ("er
   * knyttet til en konto — log ind") lukkede hende ude af sit eget kort.
   * Konstateret i en gennemtest, hvor et kort oprettet i en kundes navn endte
   * under en administrators "Mine stempelkort".
   *
   * E-mailen er det eneste, der binder den indloggede til den, der står i
   * formularen. Passer de ikke — eller er der ingen e-mail — oprettes kortet
   * frit, og kunden kan selv trykke "Gem på min konto" fra kortets egen
   * adresse. Det er samme regel som resten af systemet: besiddelse af tokenet
   * er autorisationen, og tilknytning er en HANDLING, ikke en bivirkning.
   */
  const ejer =
    visitor && maaKnyttesAutomatisk(visitor.email, email) ? visitor : null;

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
      if (existing.user_id && existing.user_id !== ejer?.id) {
        return fejl(
          "Der findes allerede et stempelkort med de oplysninger, og det er knyttet til en konto. Log ind for at åbne det.",
          { loginRequired: true },
        );
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
        user_id: ejer?.id ?? null,
        claimed_at: ejer ? new Date().toISOString() : null,
      })
      .select("id, public_token")
      .single();

    /*
     * OPSLAGET OVENFOR ER IKKE EN REGEL — INDEKSET ER (migration 0042).
     *
     * To samtidige tilmeldinger med samme e-mail læste begge "findes ikke" og
     * oprettede begge. Målt på demodata: **to kort med hver sit token**.
     * Kunden står med to, og kun det ene kan findes igen, for både
     * `selfEnroll` og `/kort/find` slår op med `limit(1)` og rammer vilkårligt
     * det ene — stemplerne fordeler sig så på to kort, uden at nogen kan se
     * hvorfor.
     *
     * Det sker ved to tryk på "Opret mit stempelkort", og dét er der ingen
     * grund til at tro, folk ikke gør: knappen svarer ikke med det samme, og
     * man står ved en disk.
     *
     * Taber man kapløbet (`23505`), har den anden anmodning netop oprettet
     * KUNDENS kort. Så slås det op og bruges — det er det samme kort, hun
     * skulle have haft.
     */
    if (error?.code === "23505") {
      const { data: vandt } = await admin
        .from("loyalty_members")
        .select("id, public_token")
        .eq("company_id", stand.company_id)
        .or(
          [email ? `email.eq.${email}` : "", phone ? `phone.eq.${phone}` : ""]
            .filter(Boolean)
            .join(","),
        )
        .limit(1)
        .maybeSingle();
      if (!vandt) return fejl("Kunne ikke oprette kortet. Prøv igen.");
      memberId = vandt.id;
      token = vandt.public_token;
    } else if (error || !member) {
      return fejl("Kunne ikke oprette kortet. Prøv igen.");
    } else {
      memberId = member.id;
      token = member.public_token;
    }
  } else if (ejer && token) {
    // Eksisterende, endnu ikke tilknyttet kort — knyt det til den indloggede,
    // men KUN når e-mailen er den samme. Se kommentaren ved `sammeKonto`.
    await claimCardForUser(token, ejer.id);
  }

  // Sikr medlemskab til stempelkortet (idempotent) — kun hvis der er et.
  const { data: membership } = program
    ? await admin
        .from("loyalty_memberships")
        .select("id")
        .eq("program_id", program.id)
        .eq("member_id", memberId)
        .maybeSingle()
    : { data: null };
  if (program && !membership) {
    /*
     * `unique (program_id, member_id)` fra 0004 er vagten her, og den var der
     * i forvejen — men svaret blev ikke set på. En dublet er ufarlig at møde:
     * den betyder, at medlemskabet allerede findes, hvilket er præcis dét, vi
     * ville sikre. Alt ANDET skal derimod kunne ses.
     */
    const { error: msFejl } = await admin
      .from("loyalty_memberships")
      .insert({
        company_id: stand.company_id,
        program_id: program.id,
        member_id: memberId,
      });
    if (msFejl && msFejl.code !== "23505") {
      return fejl("Kortet blev oprettet, men kunne ikke knyttes til stempelkortet. Prøv igen.");
    }
  }

  /*
   * POINTKONTOEN OPRETTES I SAMME TILMELDING.
   *
   * Kunden skal ikke tilmelde sig to gange, og der er kun ét kort. Kontoen er
   * idempotent i basen (`unique (program_id, member_id)`), så to tryk på
   * knappen giver én saldo.
   */
  for (const p of pointProgrammer) {
    await sikrePointKonto(stand.company_id, p.id, memberId, admin);
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

  /*
   * IDEMPOTENSNØGLEN, som gør en gensendt formular til det samme stempel og
   * ikke til ét mere. Den laves på serveren ved hver visning af kortet — se
   * `StaffStampPanel`. Den begrænses i længde af samme grund som alle andre
   * felter, vi tager imod: ingen kolonne i basen har en, og feltet kommer fra
   * en formular, som kan sendes uden om vores egen side.
   *
   * ER DEN TOM, STEMPLES DER STADIG. Nøglen er en beskyttelse mod et uheld,
   * ikke en autorisation, og en manglende nøgle må aldrig koste kunden det
   * stempel, de står og venter på ved disken.
   */
  const reference = begraens(formData.get("reference"), 80) || null;

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
    reference,
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

/* ------------------------------------------------------ find mit kort --- */

export interface FindKortState {
  /** Sat når forsøget er behandlet. Beskeden er ALTID den samme — se nedenfor. */
  sendt?: boolean;
  error?: string;
}

/**
 * Mailer kunden linket til hendes eget stempelkort.
 *
 * HULLET DEN LUKKER: `selfEnroll()` genbruger et medlem på e-mail eller
 * telefon, så kortet kan hentes tilbage med alle sine stempler — men kun fra
 * butikkens egen tilmeldingsside. En kunde, der havde mistet linket og sad
 * hjemme, kunne ikke komme til sit eget kort, og hverken vi eller butikken
 * kunne hjælpe. Det er dét, der gjorde "uden app · uden konto" til et halvt
 * løfte.
 *
 * SVARET ER ALTID DET SAMME, uanset hvad vi fandt. Ellers ville formularen
 * kunne bruges til at spørge, om en bestemt e-mail handler et bestemt sted —
 * et opslagsværk over butikkernes kundelister, åbent for enhver.
 *
 * TOKENET NÅR ALDRIG SKÆRMEN. Det sendes kun til den indbakke, der i forvejen
 * står på kortet. Samme regel som aktiveringslinket efter et køb: besiddelse
 * af adressen ER autorisationen, og så skal adressen kun gå ét sted hen.
 *
 * KORT PÅ EN KONTO FÅR IKKE DERES TOKEN MED — dér er login adgangen, præcis
 * som i `selfEnroll()`. Mailen nævner dem ved butiksnavn og henviser til
 * login; det er nyttigt for ejeren og siger ingenting til en fremmed, for en
 * fremmed får ikke mailen.
 */
export async function findMitKort(
  _prev: FindKortState,
  formData: FormData,
): Promise<FindKortState> {
  const email = str(formData.get("email")).toLowerCase();

  // Den eneste fejl, siden viser. Alt andet ender i den faste kvittering.
  if (!email || !email.includes("@")) {
    return { error: "Skriv den e-mailadresse, du brugte, da du fik kortet." };
  }

  const admin = createAdminClient();

  const { data: medlemmer } = await admin
    .from("loyalty_members")
    .select("id, company_id, public_token, user_id, kort_link_sendt_den")
    .eq("email", email);

  /*
   * KARANTÆNEN AFGØRES AF DATABASEN OG IKKE AF EN VARIABEL. Handlingen kører
   * i mange eksemplarer, og hver af dem ville have sin egen tæller — to
   * samtidige forsøg ville begge sende. Den betingede opdatering nedenfor er
   * dét, der gør, at kun den ene vinder.
   *
   * Uden en grænse er siden en knap, en fremmed kan trykke på i det
   * uendelige, og kundens indbakke er den, der betaler. Samme fælde som
   * alarmerne: alarmér aldrig fra en sti, en udefrakommende kan udløse frit.
   */
  const graense = new Date(
    Date.now() - KORT_LINK_KARANTAENE_MINUTTER * 60_000,
  ).toISOString();

  const kandidater = (medlemmer ?? []).filter(
    (m) => !m.kort_link_sendt_den || m.kort_link_sendt_den < graense,
  );

  if (kandidater.length === 0) {
    // Enten findes der intet kort, eller også er der lige sendt et. Kunden
    // får det samme at vide i begge tilfælde — se funktionens hoved.
    return { sendt: true };
  }

  const { data: reserveret } = await admin
    .from("loyalty_members")
    .update({ kort_link_sendt_den: new Date().toISOString() })
    .in(
      "id",
      kandidater.map((m) => m.id),
    )
    .or(`kort_link_sendt_den.is.null,kort_link_sendt_den.lt.${graense}`)
    .select("id");

  if (!reserveret || reserveret.length === 0) return { sendt: true };

  const vandt = new Set(reserveret.map((r) => r.id));
  const sender = kandidater.filter((m) => vandt.has(m.id));

  const { data: firmaer } = await admin
    .from("companies")
    .select("id, name")
    .in("id", [...new Set(sender.map((m) => m.company_id))]);
  const navnPaa = new Map((firmaer ?? []).map((c) => [c.id, c.name]));

  const base = getSiteUrl();
  const { emne, tekst } = kortLinkMail(
    sender.map((m) => ({
      butik: navnPaa.get(m.company_id) ?? "Butik",
      // Et kort på en konto får IKKE sit token med.
      url: m.user_id ? null : `${base}/kort/${m.public_token}`,
    })),
    base,
  );

  if (!(await sendKundeMail(email, emne, tekst))) {
    /*
     * FEJLEN SKAL UD AF SYSTEMET, men kunden får stadig den faste kvittering:
     * en anden besked her ville afsløre, at der FANDTES et kort at sende til.
     * Driftsloggen må ikke bære e-mailen — kun at det skete.
     */
    await noterFejl(
      "find-mit-kort",
      `Kunne ikke sende kortlink til ${sender.length} kort.`,
    );
  }

  return { sendt: true };
}
