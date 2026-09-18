import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/**
 * POINTPROGRAMMETS GARANTIER — DÉR HVOR DE FAKTISK LIGGER.
 *
 * Saldoen flyttes inde i SQL-funktioner (0044), fordi en serverfunktion kører
 * i mange eksemplarer: "læs saldo, beslut, skriv" er en formodning, ikke en
 * regel. Det kostede stempel-ledgeren otte kapløb (0038, 0041, 0042), og
 * pointprogrammet er bygget med dén lektie som udgangspunkt.
 *
 * DERFOR ER PRØVEN EN KILDEPRØVE. Der er ingen funktion at kalde fra en test —
 * migrationen køres i hånden — så det, der kan efterprøves her, er, at
 * garantierne STÅR I SQL'en og ikke kun i en kommentar. Hvert led nedenfor
 * svarer til noget, der ellers går galt hos en kunde ved en disk.
 *
 * KILDEN LÆSES UDEN KOMMENTARER. Migrationen forklarer sig selv med de samme
 * ord, som koden bruger (`balance >= 0` står både i hovedet og i sætningen),
 * og en prøve på den rå tekst ville derfor bestå, når vagten var slettet og
 * forklaringen stod tilbage. Det er sket fire gange i dette projekt.
 */

const MAPPE = "supabase/migrations";

function migration(): string {
  const fil = readdirSync(MAPPE).find((f) => f.includes("pointprogram"));
  if (!fil) throw new Error("0044 findes ikke");
  return readFileSync(`${MAPPE}/${fil}`, "utf8");
}

const udenKommentarer = (s: string) =>
  s
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "");

/** Kroppen af én funktion, uden kommentarer og med samlet mellemrum. */
function funktion(navn: string): string {
  const sql = migration();
  const start = sql.indexOf(`create or replace function public.${navn}`);
  if (start === -1) throw new Error(`${navn} findes ikke i migrationen`);
  const slut = sql.indexOf("$$;", start);
  return udenKommentarer(sql.slice(start, slut)).replace(/\s+/g, " ");
}

const SQL = udenKommentarer(migration()).replace(/\s+/g, " ");

describe("saldoen kan ikke gå i minus", () => {
  it("tabellen har en check-betingelse", () => {
    expect(SQL).toMatch(/balance int not null default 0 check \(balance >= 0\)/);
  });

  /*
   * BETINGELSEN LIGGER I SELVE OPDATERINGEN og ikke i en if-sætning før den.
   * To samtidige fradrag ville ellers begge kunne se en saldo, der rakte —
   * præcis det kapløb, der gav -11 på et stempelkort i september.
   */
  it("hvert fradrag er betinget i samme sætning", () => {
    const giv = funktion("point_giv");
    expect(giv).toMatch(/set balance = balance \+ p_points.*where id = konto\.id and balance \+ p_points >= 0/);

    const ind = funktion("point_indloes");
    expect(ind).toMatch(/set balance = balance - bel\.points_cost.*where id = konto\.id and balance - bel\.points_cost >= 0/);

    const ann = funktion("point_annuller");
    expect(ann).toMatch(/set balance = balance - org\.points.*where id = konto\.id and balance - org\.points >= 0/);
  });

  it("rammer opdateringen nul rækker, sker intet af det følgende", () => {
    for (const navn of ["point_giv", "point_indloes", "point_annuller"]) {
      expect(funktion(navn), navn).toMatch(/if ny_saldo is null then return jsonb_build_object\('ok', false/);
    }
  });
});

describe("kontoen låses, mens saldoen flyttes", () => {
  it("point_konto_laast henter rækken med for update", () => {
    expect(funktion("point_konto_laast")).toMatch(/where program_id = p_program and member_id = p_member for update/);
  });

  it("kontoen oprettes uden et opslag først", () => {
    // `on conflict do nothing` frem for "findes den?" — to samtidige
    // tilmeldinger må ikke kunne give kunden to saldi.
    expect(funktion("point_konto_laast")).toMatch(/on conflict \(program_id, member_id\) do nothing/);
  });

  it("annulleringen låser også kontoen", () => {
    expect(funktion("point_annuller")).toMatch(/from public\.loyalty_point_accounts where id = org\.account_id for update/);
  });
});

describe("dobbelt-indsendelse giver ikke dobbelt point", () => {
  it("nøglen er unik pr. konto i basen", () => {
    expect(SQL).toMatch(
      /create unique index if not exists loyalty_point_txn_reference_idx on public\.loyalty_point_transactions \(account_id, reference\) where reference is not null/,
    );
  });

  /*
   * OG SALDOÆNDRINGEN RULLES TILBAGE. En plpgsql-undtagelsesblok sætter et
   * savepoint, så `update`'en inde i blokken gøres om, når indsættelsen
   * rammer det unikke indeks. Uden dette ville en gentagelse hæve saldoen
   * uden at efterlade en linje — det værst tænkelige: en saldo, ledgeren
   * ikke kan forklare.
   */
  it("gentagelsen svarer med den tilstand, der ER", () => {
    for (const navn of ["point_giv", "point_indloes"]) {
      const f = funktion(navn);
      expect(f, navn).toMatch(/exception when unique_violation then/);
      expect(f, navn).toMatch(/'gentagelse', true/);
    }
  });
});

describe("indløsningen er sikker", () => {
  const ind = funktion("point_indloes");

  it("prisen læses i basen og kommer aldrig fra klienten", () => {
    expect(ind).toMatch(/balance - bel\.points_cost/);
    // Der findes ingen parameter med en pris at sende ind.
    expect(ind).not.toMatch(/p_points|p_pris|p_cost/);
  });

  it("belønningen skal høre til programmet OG virksomheden", () => {
    expect(ind).toMatch(
      /where id = p_reward and program_id = p_program and company_id = p_company/,
    );
  });

  it("en arkiveret belønning kan ikke indløses", () => {
    expect(ind).toMatch(/if bel\.status <> 'active' then/);
  });

  /*
   * AFTRYKKET ER HELE POINTEN MED HISTORIKKEN. Ændrer butikken prisen på
   * "Gratis kaffe" fra 50 til 75 i morgen, skal kvitteringen fra i dag stadig
   * sige 50. Uden navn og pris på selve transaktionen ville en prisændring
   * skrive historien om bagud.
   */
  it("navn og pris skrives med som et aftryk", () => {
    expect(ind).toMatch(/reward_navn, reward_point/);
    expect(ind).toMatch(/bel\.name, bel\.points_cost/);
  });
});

describe("pause og arkivering standser bevægelserne", () => {
  it("alle tre funktioner kræver et AKTIVT program", () => {
    for (const navn of ["point_giv", "point_indloes", "point_annuller"]) {
      expect(funktion(navn), navn).toMatch(/if prog\.status <> 'active' then/);
    }
  });

  it("programmet skal tilhøre virksomheden", () => {
    for (const navn of ["point_giv", "point_indloes"]) {
      expect(funktion(navn), navn).toMatch(
        /where id = p_program and company_id = p_company/,
      );
    }
  });
});

describe("en fejl rettes med en modpost — aldrig med en sletning", () => {
  const ann = funktion("point_annuller");

  it("modposten peger på originalen", () => {
    expect(ann).toMatch(/'reversal', -org\.points/);
    expect(ann).toMatch(/org\.id, p_user, p_employee, p_reason/);
  });

  it("en transaktion kan kun annulleres én gang — afgjort i basen", () => {
    expect(SQL).toMatch(
      /create unique index if not exists loyalty_point_txn_en_annullering_idx on public\.loyalty_point_transactions \(reversal_of\) where reversal_of is not null/,
    );
    expect(ann).toMatch(/exception when unique_violation then/);
    expect(ann).toMatch(/'allerede-annulleret'/);
  });

  it("en modpost kan ikke selv annulleres", () => {
    expect(ann).toMatch(/if org\.type = 'reversal' then/);
  });

  it("der slettes ikke i ledgeren nogen steder", () => {
    // Den eneste `delete` på transaktionerne står i sletterutinen, hvor hele
    // virksomheden fjernes efter databehandleraftalens § 13.
    const iLedger = SQL.match(/delete from public\.loyalty_point_transactions/g) ?? [];
    expect(iLedger.length).toBe(1);
    expect(SQL).toMatch(
      /delete from public\.loyalty_point_transactions where company_id = p_company_id/,
    );
  });
});

describe("saldo og ledger kan holdes op mod hinanden", () => {
  it("der findes en afstemning", () => {
    const afstem = funktion("point_afstem");
    expect(afstem).toMatch(/having a\.balance <> coalesce\(sum\(t\.points\), 0\)/);
  });

  /*
   * DEN RETTER IKKE AF SIG SELV. En uenighed er et symptom; en stille
   * selvhelbredelse ville skjule årsagen og gøre den næste fejl umulig at
   * finde. Derfor svarer funktionen kun med, hvad den fandt.
   */
  it("afstemningen ændrer ingenting", () => {
    const afstem = funktion("point_afstem");
    expect(afstem).not.toMatch(/update public\.loyalty_point_accounts/);
    expect(afstem).not.toMatch(/insert into/);
  });
});

describe("funktionerne er service-role-only", () => {
  it("alle fem er lukket for anon og authenticated", () => {
    // Listen står i migrationen som et array, funktionerne løbes igennem.
    for (const navn of [
      "point_giv",
      "point_indloes",
      "point_annuller",
      "point_afstem",
      "point_konto_laast",
    ]) {
      expect(SQL, navn).toContain(`public.${navn}(`);
    }
    expect(SQL).toMatch(/revoke all on function %s from anon, authenticated/);
    expect(SQL).toMatch(/grant execute on function %s to service_role/);
  });
});

describe("RLS er slået til på alle fire tabeller", () => {
  it("hver tabel har row level security", () => {
    for (const tabel of [
      "loyalty_point_programs",
      "loyalty_point_rewards",
      "loyalty_point_accounts",
      "loyalty_point_transactions",
    ]) {
      expect(SQL, tabel).toContain(
        `alter table public.${tabel} enable row level security`,
      );
    }
  });

  /*
   * ORGANISATIONSISOLATION. Politikkerne er de samme som stempelkortets:
   * konfiguration kan ejeren skrive, ledger og saldo kan hun kun læse — og kun
   * sin egen virksomheds.
   */
  it("politikken binder til virksomhedens ejer", () => {
    expect(SQL).toMatch(
      /company_id in \(select id from public\.companies where user_id = auth\.uid\(\)\)/,
    );
  });
});

describe("sletningen kender pointtabellerne", () => {
  it("alle fire står på listen over håndterede", () => {
    for (const tabel of [
      "loyalty_point_transactions",
      "loyalty_point_accounts",
      "loyalty_point_rewards",
      "loyalty_point_programs",
    ]) {
      expect(SQL, tabel).toMatch(new RegExp(`'${tabel}'`));
    }
  });

  /*
   * SIKKERHEDSNETTET I `slet_virksomhedens_data` STANDSER ENHVER SLETNING,
   * hvis en tabel med `company_id` mangler på listen. Uden dette afsnit ville
   * de fire nye tabeller altså ikke bare blive glemt — de ville BLOKERE hver
   * eneste sletning, og databehandleraftalens § 13 kunne ikke opfyldes.
   */
  it("rækkefølgen respekterer fremmednøglerne", () => {
    const i = (t: string) =>
      SQL.indexOf(`delete from public.${t} where company_id = p_company_id`);
    expect(i("loyalty_point_transactions")).toBeLessThan(i("loyalty_point_accounts"));
    expect(i("loyalty_point_accounts")).toBeLessThan(i("loyalty_point_programs"));
    expect(i("loyalty_point_rewards")).toBeLessThan(i("loyalty_point_programs"));
  });
});
