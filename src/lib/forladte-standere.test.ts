import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";

/**
 * STANDEREN FRA ET AFBRUDT KØB — OG DE FIRE VAGTER, DER SKAL BLIVE STÅENDE.
 *
 * Designet og standeren oprettes af det SAMME afbrudte køb, men kun designet
 * blev ryddet; adressen blev liggende med sit slug. `ryd_forladte_standere`
 * (0043) tager den nu.
 *
 * FORSKELLEN PÅ DE TO ER, AT EN STANDER KAN KOMME TO STEDER FRA. Et design
 * findes kun, fordi nogen var i gang med at bestille. En adresse kan butikken
 * selv have oprettet i dashboardet — og sådan en har ingen ordre og skal aldrig
 * røres. Derfor er reglen her længere end designets, og derfor står prøven her:
 * hvert led, der forsvinder, gør sletningen bredere, og det ses ikke på noget.
 *
 * DET ER EN KILDEPRØVE, fordi reglen er SQL i en migration, der køres i hånden
 * — der er ingen funktion at kalde fra en test. Den læser den SENESTE
 * definition, præcis som databasen ville: `create or replace` overskriver den
 * forrige.
 */

const MAPPE = "supabase/migrations";

/** Stripe prøver en webhook igen i op til tre døgn. Det er gulvet. */
const STRIPE_FORSOEGSVINDUE_TIMER = 72;

function senesteDefinition(navn: string): string {
  const filer = readdirSync(MAPPE)
    .filter((f) => f.endsWith(".sql"))
    .sort();

  let fundet = "";
  for (const fil of filer) {
    const sql = readFileSync(`${MAPPE}/${fil}`, "utf8");
    /*
     * SELVE DEFINITIONEN — ikke bare navnet. En `revoke`- eller
     * `comment on function`-linje bærer det samme navn, og 0043 har begge
     * dele; uden `create or replace` foran ville en senere migration, der
     * kun rørte rettighederne, blive taget for definitionen. Det skete for
     * nabofilen, i samme kørsel som denne blev skrevet.
     */
    const i = sql.indexOf(`create or replace function public.${navn}`);
    if (i !== -1) fundet = sql.slice(i);
  }
  return fundet;
}

/**
 * Selve kroppen — UDEN kommentarer.
 *
 * Migrationen forklarer sig selv med de samme ord, som koden bruger
 * (`stripe_payment_intent` står både i hovedet og i sætningen). En prøve på den
 * rå tekst ville derfor bestå, når vagten var slettet og forklaringen stod
 * tilbage. Det er sket fire gange i dette projekt.
 */
function kropUdenKommentarer(navn: string): string {
  const def = senesteDefinition(navn);
  const start = def.indexOf("begin");
  const slut = def.indexOf("end;", start);
  return def
    .slice(start, slut)
    .replace(/--.*$/gm, "")
    .replace(/\s+/g, " ");
}

/** `'7 days'` → 168. Kun de to enheder, der bruges; alt andet skal fejle. */
function iTimer(interval: string): number {
  const m = /^(\d+)\s*(hours?|days?)$/.exec(interval.trim());
  if (!m) throw new Error(`ukendt interval: ${interval}`);
  return Number(m[1]) * (m[2].startsWith("day") ? 24 : 1);
}

describe("ryd_forladte_standere", () => {
  const DEF = senesteDefinition("ryd_forladte_standere");
  const KROP = kropUdenKommentarer("ryd_forladte_standere");

  it("findes i en migration", () => {
    expect(DEF, "0043 skal definere funktionen").not.toBe("");
  });

  /*
   * SAMME GULV SOM DESIGNET, og af samme grund: i Stripes forsøgsvindue
   * betyder status `new` ikke "aldrig betalt", men "betalt, ikke registreret
   * endnu". Perioden må gerne blive længere — en tom adresse koster ingenting
   * — men aldrig kortere end det, den skal dække.
   */
  it("venter længere end Stripes forsøgsvindue", () => {
    const m = /naadeperiode\s+constant\s+interval\s*:=\s*'([^']+)'/.exec(DEF);
    expect(m, "nådeperioden skal stå som en konstant").not.toBeNull();
    expect(iTimer(m![1])).toBeGreaterThanOrEqual(STRIPE_FORSOEGSVINDUE_TIMER);
  });

  it("tager kun standere, der kom af en bestilling UDEN KONTO", () => {
    expect(
      KROP,
      "uden dette led slettes en adresse, butikken selv har oprettet i dashboardet",
    ).toMatch(
      /and exists \( select 1 from public\.orders o where o\.stand_id = s\.id and o\.uden_konto is true \)/,
    );
  });

  it("fredes af enhver betalt ordre — på begge spor", () => {
    expect(KROP).toMatch(/o\.status <> 'new' or o\.stripe_payment_intent is not null/);
    expect(KROP).toMatch(/and not exists \( select 1 from public\.orders o where o\.stand_id = s\.id and \(/);
  });

  /*
   * DEN FALSKE POSITIV, DER VAR I FØRSTE UDKAST — og som ingen prøve fangede,
   * fordi alle prøverne handlede om, hvad reglen SKULLE ramme.
   *
   * En INDLOGGET butik, der bestiller flere skilte til en adresse, de allerede
   * har (`/bestil?stand=…`), og fortryder hos Stripe, efterlader en ubetalt
   * ordre på en adresse, de bruger hver dag. Med kun "kom af en ordre" og
   * "ingen betalt ordre" ville vi have slettet den syv dage senere. Scanninger
   * freder den kun, HVIS der er nogen — en nyoprettet adresse, hvor skiltet
   * ikke er kommet frem endnu, har ingen.
   */
  it("fredes af en ordre, der IKKE er uden konto", () => {
    expect(
      KROP,
      "uden dette led rammer oprydningen den indloggede butiks egen adresse",
    ).toMatch(/or o\.uden_konto is not true/);
  });

  /*
   * `scans` og `feedback` peger på standeren med `on delete cascade`. Uden de
   * to led ville en sletning tage butikkens tal og kundernes beskeder med sig
   * UDEN at sige det — og en adresse, der er blevet scannet, har været i brug,
   * uanset hvad ordrerne siger.
   */
  it("fredes af en scanning og af feedback", () => {
    expect(KROP).toMatch(/not exists \( select 1 from public\.scans sc where sc\.stand_id = s\.id \)/);
    expect(KROP).toMatch(/not exists \( select 1 from public\.feedback f where f\.stand_id = s\.id \)/);
  });

  it("har en alder på sig", () => {
    expect(KROP).toMatch(/s\.created_at < now\(\) - naadeperiode/);
  });

  it("rører ingenting i et tørløb", () => {
    expect(KROP).toMatch(/if not p_toerloeb and n > 0 then delete from public\.stands/);
  });
});

/**
 * RETTIGHEDERNE, OG HVORFOR DE ER EN PRØVE VÆRD.
 *
 * MÅLT MOD PRODUKTIONEN 2026-09-18 med den anon-nøgle, der ligger i browserens
 * bundt: `POST /rest/v1/rpc/ryd_forladte_designs` svarede **200**, mens
 * `ryd_op_efter_frister` svarede 401. Den første blev aldrig lukket, sådan som
 * 0012 lukkede den anden — en funktion er som udgangspunkt kørbar for `public`.
 *
 * Der skete ingen skade: funktionen kører som den, der kalder den, så RLS
 * gjorde SELECT'en tom. Men typefilen sagde "Kun service-role" om noget, der
 * svarede enhver, og dét er den slags påstand, der får den næste til at holde
 * op med at kigge. Alle kaldesteder i `src/` bruger admin-klienten.
 */
describe("oprydningsfunktionerne er service-role-only", () => {
  const SQL = readdirSync(MAPPE)
    .filter((f) => f.endsWith(".sql"))
    .map((f) => readFileSync(`${MAPPE}/${f}`, "utf8"))
    .join("\n");

  for (const navn of ["ryd_forladte_standere", "ryd_forladte_designs"]) {
    it(`${navn} er lukket for anon og authenticated`, () => {
      expect(SQL).toContain(
        `revoke all on function public.${navn}(boolean) from anon, authenticated;`,
      );
      expect(SQL).toContain(
        `grant execute on function public.${navn}(boolean) to service_role;`,
      );
    });
  }
});

describe("den natlige oprydning kalder den", () => {
  const RUTE = readFileSync(
    "src/app/api/cron/oprydning/route.ts",
    "utf8",
  ).replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  it("kalder funktionen med samme tørløb som resten", () => {
    expect(RUTE).toMatch(/rpc\(\s*"ryd_forladte_standere",\s*\{ p_toerloeb: toerloeb \}/);
  });

  it("tæller den med i kørslens linje", () => {
    expect(
      RUTE,
      "uden et tal i driftsloggen kan ingen se, om skridtet gør noget",
    ).toContain("forladte_standere");
  });

  /*
   * MIGRATIONER KØRES I HÅNDEN, så koden står i drift, før 0043 er kørt. Uden
   * denne gren sender `noterFejl` en alarmmail hver nat indtil da — og en
   * alarm, man forventer, er en alarm, man holder op med at læse. Alt ANDET
   * end "funktionen findes ikke" skal stadig larme.
   */
  it("alarmerer ikke, fordi migrationen mangler", () => {
    expect(RUTE).toMatch(/standerFejl && standerFejl\.code !== "PGRST202"/);
  });
});
