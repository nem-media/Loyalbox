/**
 * Pointprogrammets nøgletal.
 *
 * KUN TAL, DER ER SANDE. Der regnes på ledgeren, ikke på et skøn, og hvert tal
 * har en definition, der står ved siden af det — ellers ville "point i omløb"
 * betyde noget forskelligt på to skærme.
 *
 * DER SIDES GENNEM RÆKKERNE (`hentAlle`). PostgREST kapper tavst ved 1000, og
 * det er præcis her, det gør ondt: et tal, der summeres, bliver stille forkert
 * ved transaktion nummer 1001 og ser stadig rimeligt ud. Samme fejl som
 * `avgRatingTotal` i #211.
 */
import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { hentAlle } from "@/lib/hent-alle";
import type { PointTxnType } from "@/lib/loyalty/point";

export interface PointOverblik {
  /** Kunder med en pointkonto på programmet. */
  medlemmer: number;
  /** Summen af alt, der nogensinde er lagt TIL (optjening + manuelle tillæg). */
  optjent: number;
  /** Summen af alt, der er trukket FRA (indløsninger, fradrag, annulleringer). */
  brugt: number;
  /**
   * Point, kunderne har stående lige nu.
   *
   * Summen af saldi — ikke `optjent - brugt` regnet af de samme rækker. De to
   * SKAL give det samme, og netop derfor regnes de hver for sig: er der
   * forskel, er ledger og saldo kommet fra hinanden, og dét skal kunne ses.
   * Se `point_afstem()` i 0044.
   */
  iOmloeb: number;
  /** Indløsninger, der ikke siden er annulleret. */
  indloesninger: number;
  /** De mest brugte belønninger, flest først. */
  topBeloenninger: { navn: string; antal: number }[];
  /** Er summen af ledgeren og summen af saldiene uenige? */
  uenighed: boolean;
}

interface LedgerRaekke {
  id: string;
  type: PointTxnType;
  points: number;
  reward_navn: string | null;
  reversal_of: string | null;
}

export async function pointOverblik(
  companyId: string,
  programId: string,
): Promise<PointOverblik> {
  const admin = createAdminClient();

  const [konti, ledger] = await Promise.all([
    hentAlle<{ id: string; balance: number }>((fra, til) =>
      admin
        .from("loyalty_point_accounts")
        .select("id, balance")
        .eq("program_id", programId)
        .order("id")
        .range(fra, til),
    ),
    hentAlle<LedgerRaekke>((fra, til) =>
      admin
        .from("loyalty_point_transactions")
        .select("id, type, points, reward_navn, reversal_of")
        .eq("program_id", programId)
        .order("id")
        .range(fra, til),
    ),
  ]);

  let optjent = 0;
  let brugt = 0;
  for (const t of ledger) {
    if (t.points > 0) optjent += t.points;
    else brugt += -t.points;
  }

  const iOmloeb = konti.reduce((s, k) => s + k.balance, 0);

  /*
   * EN ANNULLERET INDLØSNING TÆLLER IKKE MED.
   *
   * Modposten peger på originalen, så de annullerede id'er er kendt. Uden
   * dette ville en fejlindløsning, butikken selv har rullet tilbage, blive
   * stående i tallet "belønninger indløst" — og det tal bruges til at
   * vurdere, om programmet virker.
   */
  const annullerede = new Set(
    ledger.filter((t) => t.reversal_of).map((t) => t.reversal_of as string),
  );

  const indloesninger = ledger.filter(
    (t) => t.type === "redeem" && !annullerede.has(t.id),
  );

  const pr = new Map<string, number>();
  for (const t of indloesninger) {
    const navn = t.reward_navn ?? "Belønning";
    pr.set(navn, (pr.get(navn) ?? 0) + 1);
  }

  return {
    medlemmer: konti.length,
    optjent,
    brugt,
    iOmloeb,
    indloesninger: indloesninger.length,
    topBeloenninger: [...pr.entries()]
      .map(([navn, antal]) => ({ navn, antal }))
      .sort((a, b) => b.antal - a.antal || a.navn.localeCompare(b.navn, "da-DK"))
      .slice(0, 5),
    // Ledgeren og saldiene skal sige det samme. Gør de ikke, er tallet på
    // skærmen ikke til at stole på, og så skal det siges frem for at skjules.
    uenighed: optjent - brugt !== iOmloeb,
  };
}

export interface PointHistorikRaekke {
  id: string;
  created_at: string;
  type: PointTxnType;
  points: number;
  balance_after: number;
  purchase_amount: number | null;
  reward_navn: string | null;
  reason: string | null;
  reversal_of: string | null;
  member_id: string;
  medlemNavn: string;
  medarbejder: string | null;
  /** Er DENNE transaktion siden annulleret? Så skal knappen ikke vises igen. */
  annulleret: boolean;
}

/**
 * Virksomhedens transaktionsliste.
 *
 * Navnene slås op i ÉT kald hver og ikke pr. række — en liste på halvtreds
 * transaktioner ville ellers koste hundrede forespørgsler (N+1), og det er
 * netop den slags, der først mærkes hos den kunde, der bruger systemet mest.
 */
export async function pointHistorik(
  companyId: string,
  programId: string,
  graense = 100,
): Promise<PointHistorikRaekke[]> {
  const admin = createAdminClient();

  const { data: txns } = await admin
    .from("loyalty_point_transactions")
    .select(
      "id, created_at, type, points, balance_after, purchase_amount, reward_navn, reason, reversal_of, member_id, employee_id",
    )
    .eq("company_id", companyId)
    .eq("program_id", programId)
    .order("created_at", { ascending: false })
    .limit(graense);

  const raekker = txns ?? [];
  if (raekker.length === 0) return [];

  const memberIds = [...new Set(raekker.map((t) => t.member_id))];
  const employeeIds = [
    ...new Set(raekker.map((t) => t.employee_id).filter(Boolean) as string[]),
  ];

  const [{ data: members }, { data: employees }] = await Promise.all([
    admin.from("loyalty_members").select("id, name, email").in("id", memberIds),
    employeeIds.length
      ? admin.from("employees").select("id, name").in("id", employeeIds)
      : Promise.resolve({ data: [] as { id: string; name: string }[] }),
  ]);

  const medlemNavn = new Map(
    (members ?? []).map((m) => [m.id, m.name || m.email || "Kunde"]),
  );
  const medarbejderNavn = new Map(
    (employees ?? []).map((e) => [e.id, e.name]),
  );
  const annullerede = new Set(
    raekker.filter((t) => t.reversal_of).map((t) => t.reversal_of as string),
  );

  return raekker.map((t) => ({
    id: t.id,
    created_at: t.created_at,
    type: t.type,
    points: t.points,
    balance_after: t.balance_after,
    purchase_amount: t.purchase_amount,
    reward_navn: t.reward_navn,
    reason: t.reason,
    reversal_of: t.reversal_of,
    member_id: t.member_id,
    medlemNavn: medlemNavn.get(t.member_id) ?? "Kunde",
    medarbejder: t.employee_id
      ? (medarbejderNavn.get(t.employee_id) ?? "Medarbejder")
      : null,
    annulleret: annullerede.has(t.id),
  }));
}
