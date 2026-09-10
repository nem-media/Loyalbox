import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * HVEM MÅ GIVE STEMPLER — og hvem må ikke ved et uheld.
 *
 * Prøvet på LIVE 2026-09-10 mod produktionen med rigtige server-actions:
 *   · ejer stempler eget kort            → virker ("have":1)
 *   · Nem Media-ejer stempler NIELSINE-kort → "Kortet blev ikke fundet."
 *   · eget kort, fremmed membership_id   → "passer ikke til denne kunde."
 *   · ANONYM (ingen cookie) med ægte action-id → "Kun personale kan give stempler."
 *
 * En live-prøve er et øjebliksbillede. DISSE prøver holder de fire grene fast,
 * så en senere ændring ikke tavst kan fjerne et lag. Det er KILDEPRØVER, fordi
 * grenene ligger i server-actions, der slår op i basen — det, der skal holdes
 * fast, er en KONTROL i en bestemt rækkefølge, ikke en returværdi.
 *
 * TRE LAG, OG HVERT ER NØDVENDIGT:
 *  1. Er der overhovedet et personale-login med rettigheden? (`getCompanyAccess`)
 *  2. Hører kortet til personalets EGEN virksomhed? (`company_id`-match)
 *  3. `giveStamp` re-validerer virksomhed + program — dybdeforsvar, hvis en
 *     fremtidig kalder glemmer lag 2.
 */

const L = (p: string) => readFileSync(join(process.cwd(), p), "utf8");
const KORT = L("src/app/kort/actions.ts");
const SERVICE = L("src/lib/loyalty/service.ts");
const ACCESS = L("src/lib/loyalty/access.ts");

/** Kroppen af en bestemt exporteret funktion, til næste `export`. */
function krop(kilde: string, navn: string): string {
  const start = kilde.indexOf(`export async function ${navn}`);
  expect(start, `${navn} skal findes`).toBeGreaterThan(-1);
  const rest = kilde.slice(start + 10);
  const naeste = rest.indexOf("\nexport ");
  return naeste === -1 ? rest : rest.slice(0, naeste);
}

describe("de to handlinger fra et offentligt kort kræver personale", () => {
  for (const [navn, rettighed, besked] of [
    ["stampByToken", "canStamp", "Kun personale kan give stempler."],
    ["redeemRewardByToken", "canRedeem", "Kun personale kan indløse belønninger."],
  ] as const) {
    /**
     * Kundens `public_token` er OFFENTLIGT — det står i QR-koden, alle kan
     * scanne. Uden dette lag kunne enhver, der åbnede sit eget kort, stemple
     * sig selv. Prøven læser de FØRSTE linjer af funktionen, så en tilføjet
     * gren ikke kan snige sig ind FØR spærren.
     */
    it(`${navn} spærrer før noget andet sker`, () => {
      const k = krop(KORT, navn);
      const iAccess = k.indexOf("await getCompanyAccess()");
      const iRettighed = k.indexOf(`permissions.${rettighed}`);
      const iAdmin = k.indexOf("createAdminClient()");
      expect(iAccess, "skal hente adgangen").toBeGreaterThan(-1);
      expect(iRettighed, `skal kræve ${rettighed}`).toBeGreaterThan(-1);
      // Spærren SKAL stå før basen røres.
      expect(iAccess).toBeLessThan(iAdmin);
      expect(iRettighed).toBeLessThan(iAdmin);
      expect(k).toContain(besked);
    });

    /**
     * Lag 2: kortet skal høre til personalets EGEN virksomhed. Det er dét, der
     * blokerede Nem Media-ejeren fra at stemple et Frisør Nielsine-kort på
     * live. Uden det kunne enhver butik stemple enhver andens kunder.
     */
    it(`${navn} afviser et kort fra en anden virksomhed`, () => {
      const k = krop(KORT, navn);
      expect(k).toMatch(/member\.company_id !== access\.companyId/);
      expect(k).toContain("Kortet blev ikke fundet.");
    });
  }
});

describe("selvbetjening bruger token-besiddelse og IKKE personale-adgang", () => {
  /**
   * `selfEnroll` og `claimCard` er KUNDENS egne handlinger. De må netop IKKE
   * kræve `getCompanyAccess` — en kunde er hverken ejer eller ansat. Tokenet i
   * URL'en ER autorisationen, præcis som for kortet selv. Stod der en
   * personale-spærre her, kunne ingen kunde melde sig ind.
   */
  it("selfEnroll spørger ikke om personale-adgang", () => {
    expect(krop(KORT, "selfEnroll")).not.toContain("getCompanyAccess");
  });
  it("claimCard spørger ikke om personale-adgang", () => {
    expect(krop(KORT, "claimCard")).not.toContain("getCompanyAccess");
  });
});

describe("giveStamp re-validerer — dybdeforsvar bag kaldet", () => {
  /**
   * Selv hvis en fremtidig kalder glemmer lag 2, må `giveStamp` ikke skrive et
   * stempel på tværs af virksomheder. Den tjekker BÅDE medlemskabet og
   * programmet mod `access.companyId`, og at begge er aktive.
   */
  it("kræver rettighed, virksomhedsmatch og aktivt program", () => {
    const k = krop(SERVICE, "giveStamp");
    expect(k).toContain("access.permissions.canStamp");
    expect(k).toMatch(/membership\.company_id !== access\.companyId/);
    expect(k).toMatch(/program\.company_id !== access\.companyId/);
    expect(k).toMatch(/membership\.status !== "active"/);
    expect(k).toMatch(/program\.status !== "active"/);
  });
});

describe("getCompanyAccess giver kun adgang til ejer eller aktiv ansat", () => {
  /**
   * En slutkunde med konto (rolle `customer`) har ingen virksomhed og ingen
   * `employees`-række — så funktionen ender med `null`, og lag 1 lukker dem
   * ude. Det er dét, der gør, at en kunde ikke kan stemple sit eget kort, selv
   * når de er logget ind. Prøven holder fast i, at en ansat SKAL være aktiv.
   */
  it("kræver en AKTIV medarbejderrække", () => {
    expect(ACCESS).toMatch(/\.eq\("is_active", true\)/);
  });
  it("falder tilbage til null uden virksomhed og uden ansættelse", () => {
    // Der er en gren, der returnerer null, når intet passer.
    expect(ACCESS).toMatch(/return null;/);
  });
});

/**
 * MEDARBEJDERENS EGNE STEMPELKORT-HANDLINGER (`/personale/stempelkort`).
 *
 * De findes, fordi dashboardets `createProgram` skriver med brugerens EGEN
 * klient (RLS, ejer-only) — en medarbejder ville få sit write afvist uden en
 * tydelig fejl. Derfor valideres `canManage` og skrives med SERVICE-ROLE
 * bagefter. Prøven holder BEGGE dele fast: spærren OG at det er service-role,
 * der skriver (ellers ville funktionen se rigtig ud og ramme RLS).
 */
const PERSONALE_KORT = L("src/app/personale/stempelkort/actions.ts");

describe("medarbejderens stempelkort-handlinger kræver canManage", () => {
  for (const navn of ["opretStempelkort", "saetStempelkortStatus"] as const) {
    it(`${navn} spærrer uden canManage og skriver med service-role`, () => {
      const k = krop(PERSONALE_KORT, navn);
      const iAccess = k.indexOf("await getCompanyAccess()");
      const iManage = k.indexOf("permissions.canManage");
      const iAdmin = k.indexOf("createAdminClient()");
      expect(iAccess, "skal hente adgangen").toBeGreaterThan(-1);
      expect(iManage, "skal kræve canManage").toBeGreaterThan(-1);
      // Spærren FØR basen røres.
      expect(iManage).toBeLessThan(iAdmin);
      // Service-role og ikke brugerens egen (RLS ville afvise en medarbejder).
      expect(k).toContain("createAdminClient()");
      expect(k).not.toContain("createClient(");
    });
  }

  /**
   * Org-isolering: en status-ændring SKAL binde sig til egen virksomhed, så et
   * gættet program-id ikke kan ramme en anden butiks kort.
   */
  it("saetStempelkortStatus binder sig til egen virksomhed", () => {
    const k = krop(PERSONALE_KORT, "saetStempelkortStatus");
    expect(k).toMatch(/\.eq\("company_id", access\.companyId\)/);
    expect(k).toContain("Stempelkortet blev ikke fundet.");
  });

  /**
   * En medarbejder må ALDRIG arkivere — kun kladde/aktiv/pause. `archived` er
   * en irreversibel oprydning, der hører til ejeren.
   */
  it("tillader kun kladde, aktiv og pause — aldrig arkivering", () => {
    expect(PERSONALE_KORT).toMatch(
      /MEDARBEJDER_STATUS[^=]*=\s*\[\s*"active",\s*"paused",\s*"draft"\s*\]/,
    );
    expect(PERSONALE_KORT).not.toMatch(/"archived"/);
  });
});

/**
 * At styre stempelkort er IKKE at styre medarbejdere. can_manage er nu en
 * rettighed, ejeren kan give — men medarbejder-administrationen er stadig
 * bundet til `requireOwner`, så en medarbejder med canManage ikke kan invitere
 * kolleger ind eller hæve sine egne rettigheder.
 */
describe("medarbejder-administration er stadig ejer-only", () => {
  const PERSONALE_ACT = L("src/app/dashboard/personale/actions.ts");
  for (const navn of ["addEmployee", "updateEmployee", "removeEmployee", "setEmployeeActive"] as const) {
    it(`${navn} kræver ejer, ikke bare canManage`, () => {
      expect(krop(PERSONALE_ACT, navn)).toContain("await requireOwner()");
    });
  }
  it("requireOwner kræver rollen owner", () => {
    expect(PERSONALE_ACT).toMatch(/role !== "owner"/);
  });
});
