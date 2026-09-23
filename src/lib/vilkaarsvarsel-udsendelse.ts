import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendKundeMail } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import { noterAdminHandling } from "@/lib/admin-log";
import { TERMS_VERSION } from "@/lib/constants";
import { isTestBuyer } from "@/lib/commerce";
import { DPA_VERSION } from "@/lib/dpa";
import {
  varselMail,
  ikrafttraedelse,
  type VarselSlags,
} from "@/lib/vilkaarsvarsel";

/**
 * UDSENDELSEN AF ET VILKÅRSVARSEL.
 *
 * DETTE ER DEN FARLIGSTE HANDLING I SYSTEMET: den skriver til hver eneste
 * betalende kunde på én gang. Tre ting gør den forsvarlig, og ingen af dem
 * må fjernes.
 *
 * 1. DEN UDLØSES AF ET MENNESKE OG ALDRIG AF EN UDRULNING. Et varsel, der
 *    sendes automatisk, når `TERMS_VERSION` hæves, ville betyde, at et
 *    commit kan maile alle kunder — uden at nogen har set teksten. Versionen
 *    hæves ofte som en del af en rettelse; udsendelsen er en beslutning.
 *
 * 2. DEN KAN IKKE SENDE TO GANGE. Hver sendt mail noteres i `admin_log` med
 *    virksomheden og versionen, og listen over modtagere trækker dem fra, der
 *    allerede har fået den. Trykkes knappen igen, sendes der til dem, der
 *    manglede — og til ingen andre. Spærren ligger i LOGGEN og ikke i en
 *    variabel, fordi en serverfunktion kører i mange eksemplarer.
 *
 * 3. DEN FORTÆLLER, HVEM DER FÅR DEN, FØR DEN SENDES. `modtagere()` er
 *    skilt ud, så admin kan se listen først.
 *
 * HVEM FÅR DEN: virksomheder med en kontaktmail, som har accepteret en ÆLDRE
 * udgave end den gældende, og som ikke er slettet. En kunde, der allerede står
 * på den nye version, har intet at blive varslet om.
 *
 * EN FEJLET MAIL STOPPER IKKE DE ØVRIGE. Den noteres i driftsloggen, og
 * virksomheden bliver IKKE logget som varslet — så næste tryk tager den med.
 * Det er den rigtige vej rundt: hellere en mail for lidt i første omgang end
 * en kunde, der aldrig blev varslet, fordi nummer syv fejlede.
 */

export interface VarselModtager {
  id: string;
  email: string;
  navn: string;
  /** Den version, kunden står på i dag. Vises, så admin kan se hvorfor. */
  nuvaerende: string | null;
}

/** Hvilken version varslet handler om — den, der skal noteres som sendt. */
export function varselNoegle(slags: VarselSlags): string {
  if (slags === "vilkaar") return `vilkaar:${TERMS_VERSION}`;
  if (slags === "dpa") return `dpa:${DPA_VERSION}`;
  return `begge:${TERMS_VERSION}+${DPA_VERSION}`;
}

/**
 * Hvem mangler at blive varslet?
 *
 * TO OPSLAG OG IKKE ET JOIN: `admin_log` er en log og ikke en relation, og et
 * join ville binde listen til, at loggen bliver ved med at se ud som i dag.
 * Antallet af kunder er lille nok til, at forskellen ikke kan måles.
 */
export async function modtagere(slags: VarselSlags): Promise<VarselListe> {
  const admin = createAdminClient();
  const noegle = varselNoegle(slags);

  /* `contact_email` OG IKKE `billing_email`. Fakturamailen går ofte til et
     bogholderi — et varsel om ændrede vilkår skal til den, der KAN opsige, og
     det er kontaktpersonen. Se 0009 for forskellen. */
  const { data: firmaer, error } = await admin
    .from("companies")
    .select("id, name, contact_email, terms_version, dpa_version, slettet_den")
    .is("slettet_den", null)
    .order("name");

  if (error) throw new Error(`kunne ikke hente virksomheder: ${error.message}`);

  const { data: sendte } = await admin
    .from("admin_log")
    .select("company_id, efter")
    .eq("handling", "vilkaarsvarsel-sendt");

  const alleredeSendt = new Set(
    (sendte ?? [])
      .filter((r) => (r.efter as { noegle?: string } | null)?.noegle === noegle)
      .map((r) => r.company_id),
  );

  /*
    TESTKONTIENE UDELADES — OG FILTERET HÆNGER PÅ E-MAILEN, ALDRIG PÅ NAVNET.

    Basen deles af udvikling og produktion, så seed-virksomhederne står side
    om side med rigtige kunder. De skal ikke have et varsel: adresserne findes
    ikke, hver afvist mail ville lande i driftsloggen, og en alarm, der altid
    larmer, er en alarm, man holder op med at læse.

    `isTestBuyer()` er husets EGEN definition (`commerce.ts`) og genbruges
    frem for at blive skrevet af — to definitioner af "testkonto" ville før
    eller siden være uenige, og uenigheden ville vise sig her.

    DER FILTRERES IKKE PÅ NAVNET, selv om listen rummer "Testkiosk Basic" og
    "Test Café Aarhus". En rigtig butik må gerne hedde noget med Test, og et
    navnefilter ville udelade hende fra et varsel, handelsbetingelsernes §15
    LOVER hende — tavst. Fejlen skal falde ud til den sikre side: hellere en
    mail til vores egen indbakke end en kunde, der aldrig blev varslet.
  */
  const udenTest = (firmaer ?? []).filter((f) => !isTestBuyer(f.contact_email));
  const testkonti = (firmaer ?? []).length - udenTest.length;

  const liste = udenTest
    .filter((f) => {
      if (!f.contact_email) return false;
      if (alleredeSendt.has(f.id)) return false;
      /* KUN DEN, DER STÅR PÅ NOGET ANDET. Har kunden allerede accepteret den
         gældende udgave, er der intet at varsle — og en mail om en ændring,
         man allerede har sagt ja til, sår tvivl om, hvad man så har sagt ja
         til. */
      if (slags !== "dpa" && f.terms_version !== TERMS_VERSION) return true;
      if (slags !== "vilkaar" && f.dpa_version !== DPA_VERSION) return true;
      return false;
    })
    .map((f) => ({
      id: f.id,
      email: f.contact_email as string,
      navn: f.name ?? "(uden navn)",
      nuvaerende:
        slags === "dpa" ? (f.dpa_version ?? null) : (f.terms_version ?? null),
    }));

  return { liste, testkonti };
}

export interface VarselListe {
  liste: VarselModtager[];
  /**
   * Hvor mange testkonti der blev udeladt.
   *
   * TALLET VISES, OG DET ER IKKE PYNT. Et filter, der bare gør listen
   * kortere, er den farlige slags: den dag nogen undrer sig over, hvorfor en
   * kunde aldrig blev varslet, skal svaret kunne ses på siden og ikke kun i
   * koden. Samme grund som at driftsloggen også noterer de GODE kørsler —
   * stilhed ligner succes.
   */
  testkonti: number;
}

export interface UdsendelseResultat {
  sendt: number;
  fejlede: number;
  ikrafttraeden: string;
}

/**
 * Send varslet til alle, der mangler det.
 *
 * `actor*` kommer fra SESSIONEN og aldrig fra en formular — loggen skal kunne
 * svare på, hvem der trykkede, og et skjult felt kunne forfalskes.
 */
export async function sendVilkaarsvarsel(opts: {
  slags: VarselSlags;
  actorId: string | null;
  actorEmail: string;
}): Promise<UdsendelseResultat> {
  const { liste } = await modtagere(opts.slags);
  const ikraft = ikrafttraedelse();
  const { emne, tekst } = varselMail({
    slags: opts.slags,
    ikrafttraeden: ikraft,
  });
  const noegle = varselNoegle(opts.slags);

  let sendt = 0;
  let fejlede = 0;

  for (const m of liste) {
    const ok = await sendKundeMail(m.email, emne, tekst);
    if (!ok) {
      fejlede++;
      /* Virksomheden logges IKKE som varslet, så næste tryk tager den med. */
      await noterFejl(
        "vilkaarsvarsel",
        `Kunne ikke sende varsel (${noegle}) til virksomhed ${m.id}`,
      );
      continue;
    }
    sendt++;
    await noterAdminHandling({
      actorId: opts.actorId,
      actorEmail: opts.actorEmail,
      companyId: m.id,
      handling: "vilkaarsvarsel-sendt",
      /* KUN NØGLEN OG DATOEN. Loggen må ikke blive endnu en kopi af kunden,
         der skal huskes ved en sletning — hverken navn eller mailadresse. */
      efter: { noegle, ikrafttraeden: ikraft.toISOString().slice(0, 10) },
    });
  }

  return {
    sendt,
    fejlede,
    ikrafttraeden: ikraft.toISOString().slice(0, 10),
  };
}
