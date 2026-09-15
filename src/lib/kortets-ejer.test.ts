import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * HVAD KORTETS EJER KAN SE — OG KAN FÅ IGEN.
 *
 * To fejl, der lignede hinanden: begge var tavse, begge ramte kunden og ikke
 * butikken, og ingen af dem kunne opdages af en, der kiggede på dashboardet.
 *
 * 1. UDLØBSDATOEN STOD INGEN STEDER PÅ KUNDENS KORT. Vinduet håndhæves i
 *    `giveStamp()`, men "Stempelkortet er udløbet" vises til PERSONALET. En
 *    kunde med otte ud af ti stempler kunne samle mod en belønning, der
 *    stille løb ud, og først opdage det ved disken.
 *
 * 2. ET KORT KUNNE OPRETTES MED BARE ET NAVN. Genbrugsopslaget i
 *    `selfEnroll()` slår kun op på e-mail og telefon, så et kort uden dem
 *    kunne kun åbnes med den hemmelige adresse. Mistede kunden linket, var
 *    stemplerne væk — og sitet lover "uden app · uden konto", hvilket kun er
 *    sandt, fordi man kan tilmelde sig igen og få sit eget kort tilbage.
 *
 * PRØVES I KILDEN, fordi det er sider og komponenter: der er ingen returværdi
 * at se på, kun om oplysningen bliver givet videre. Selve reglen er prøvet
 * som ren funktion i `loyalty/program-status.test.ts`.
 */

import {
  kortLinkMail,
  FIND_KORT_KVITTERING,
} from "./loyalty/kort-link";

const kilde = (sti: string) => readFileSync(join(process.cwd(), sti), "utf8");

describe("kortet viser sin egen gyldighed", () => {
  it("regner den ud ét sted og skriver den ikke i hånden", () => {
    const kort = kilde("src/components/loyalty/stamp-card-preview.tsx");
    expect(kort).toContain("gyldighed(");
    expect(kort).toContain("gyldighedTekst(");
  });

  /**
   * ALLE FIRE STEDER, ET KORT TEGNES, SKAL GIVE DATOERNE MED.
   *
   * De to første er kundens egne. De to sidste er butikkens
   * forhåndsvisninger — og wizardens billedtekst lover ligefrem, at "sådan
   * ser kundens kort ud", så sætter ejeren en slutdato uden at se linjen om
   * den, er dét løfte ikke sandt.
   */
  for (const sti of [
    "src/app/kort/[token]/page.tsx",
    "src/app/mine-kort/page.tsx",
    "src/app/dashboard/loyalitet/programmer/program-wizard.tsx",
    "src/app/dashboard/loyalitet/programmer/[id]/page.tsx",
  ]) {
    it(`${sti} giver datoerne videre til kortet`, () => {
      const s = kilde(sti);
      expect(s, sti).toContain("slutDato=");
      expect(s, sti).toContain("startDato=");
    });
  }

  /**
   * "Mine stempelkort" henter kortene et andet sted fra end kortsiden.
   * Glemmes kolonnerne i opslaget, ville oversigten tie om en udløbsdato,
   * kortsiden viser — to svar på samme spørgsmål.
   */
  it("henter datoerne med, når kortene slås op til kontoen", () => {
    const s = kilde("src/lib/loyalty/member-account.ts");
    expect(s).toContain("start_date, end_date");
    expect(s).toContain("startDato");
    expect(s).toContain("slutDato");
  });
});

describe("kortet kan findes igen uden en konto", () => {
  const ACTIONS = kilde("src/app/kort/actions.ts");

  /**
   * NAVNET FINDER INGENTING. Genbrugsopslaget nedenfor slår op på e-mail og
   * telefon; et kort oprettet med bare et fornavn kunne kun åbnes med den
   * hemmelige adresse.
   */
  it("kræver e-mail eller telefon ved tilmelding", () => {
    expect(ACTIONS).toContain("if (!email && !phone)");
    // Og den gamle regel, hvor et navn var nok, må ikke snige sig tilbage.
    expect(ACTIONS).not.toContain("if (!name && !email && !phone)");
  });

  /**
   * BESKEDEN SKAL SIGE HVORFOR. "Påkrævet" ligner endnu en butik, der vil
   * have en e-mail; "det er dét, der gør, at du kan få kortet frem igen" er
   * en grund til at give den.
   */
  it("siger hvad oplysningen bruges til — både i handlingen og i formularen", () => {
    expect(ACTIONS).toMatch(/kortet frem igen/i);
    expect(kilde("src/app/kort/tilmeld/[slug]/self-enroll-form.tsx")).toMatch(
      /kortet\s+\n?\s*frem igen|frem igen/i,
    );
  });

  /**
   * GENBRUGET ER DÉT, DER GØR LØFTET SANDT. Forsvinder opslaget på
   * e-mail/telefon, kan kortet ikke hentes frem igen — og så er "uden konto"
   * ikke længere en beskrivelse af produktet, men en påstand.
   */
  it("genbruger et eksisterende medlem på e-mail eller telefon", () => {
    expect(ACTIONS).toContain("loyalty_members");
    expect(ACTIONS).toMatch(/email\.eq\.\$\{email\}/);
    expect(ACTIONS).toMatch(/phone\.eq\.\$\{phone\}/);
  });

  /**
   * ...MEN IKKE, NÅR KORTET ER KNYTTET TIL EN KONTO. Ellers kunne en fremmed
   * med kendskab til blot en e-mailadresse få kortets token udleveret.
   * Prøven står her, fordi den er bagsiden af den, lige ovenfor.
   */
  it("lukker e-mail-vejen, når kortet er knyttet til en konto", () => {
    expect(ACTIONS).toContain("existing.user_id");
    expect(ACTIONS).toMatch(/loginRequired/);
  });

  /**
   * OG KORTSIDEN SKAL SIGE DET HØJT. Stod der kun "opret en konto", ville
   * blokken sige det modsatte af forsidens "uden konto" — og kunden ville tro,
   * at stemplerne hænger på en konto, de ikke har.
   */
  it("fortæller på kortet, at der ikke kræves en konto", () => {
    const side = kilde("src/app/kort/[token]/page.tsx");
    expect(side).toMatch(/behøver ingen konto/i);
    // Kun når der FAKTISK er en nøgle at kende kunden på.
    expect(side).toContain("member.email || member.phone");
  });
});

/**
 * "FIND MIT KORT" — VEJEN TILBAGE HJEMMEFRA.
 *
 * `selfEnroll()` genbruger et medlem på e-mail eller telefon, så et mistet
 * kort kan hentes tilbage med alle sine stempler — men kun fra butikkens egen
 * tilmeldingsside. En kunde uden linket, der sad hjemme, havde ingen vej ind,
 * og dét gjorde "uden app · uden konto" til et halvt løfte: kortet var ikke
 * væk, hun kunne bare ikke nå det.
 *
 * HELE SIKKERHEDEN LIGGER I TO TING, og begge prøves her: svaret er ens hver
 * gang, og tokenet går kun til indbakken.
 */
describe("find mit kort", () => {
  const ACTIONS = kilde("src/app/kort/actions.ts");
  const BASE = "https://loyalsum.dk";

  it("sender linket til et kort, der ikke er på en konto", () => {
    const { emne, tekst } = kortLinkMail(
      [{ butik: "Café Nord", url: `${BASE}/kort/abc123` }],
      BASE,
    );
    expect(emne).toBe("Dit stempelkort");
    expect(tekst).toContain("Café Nord");
    expect(tekst).toContain(`${BASE}/kort/abc123`);
  });

  /**
   * ET KORT PÅ EN KONTO FÅR ALDRIG SIT TOKEN MED. Dér er login adgangen —
   * samme spærre som i `selfEnroll()`, hvor e-mail alene heller ikke længere
   * åbner kortet. Ellers ville "gem på min konto" gøre kortet mindre sikkert
   * i stedet for mere.
   */
  it("sender ALDRIG et token for et kort, der er knyttet til en konto", () => {
    const { tekst } = kortLinkMail([{ butik: "Salon Syd", url: null }], BASE);
    expect(tekst).toContain("Salon Syd");
    expect(tekst).not.toContain("/kort/");
    expect(tekst).toContain("/mine-kort");
  });

  it("holder de to slags adskilt i samme mail", () => {
    const { emne, tekst } = kortLinkMail(
      [
        { butik: "Café Nord", url: `${BASE}/kort/abc123` },
        { butik: "Salon Syd", url: null },
      ],
      BASE,
    );
    // Flere kort med link → flertal i emnefeltet.
    expect(emne).toBe("Dine stempelkort");
    expect(tekst).toContain(`${BASE}/kort/abc123`);
    // Butikken nævnes, men uden en vej ind uden om login.
    expect(tekst).toContain("Salon Syd");
    expect(tekst).not.toContain("Salon Syd\n  https");
  });

  /**
   * KVITTERINGEN MÅ IKKE AFSLØRE, HVAD VI FANDT. Siden ville ellers kunne
   * bruges til at spørge, om en bestemt e-mail handler et bestemt sted — et
   * opslagsværk over butikkernes kundelister, åbent for enhver.
   */
  it("siger det samme, uanset om der blev fundet et kort", () => {
    expect(FIND_KORT_KVITTERING).toMatch(/hvis der findes/i);
    expect(FIND_KORT_KVITTERING).not.toMatch(/vi fandt|dit kort er|ingen kort/i);
  });

  it("har kun ét svar efter e-mailen er godkendt", () => {
    const i = ACTIONS.indexOf("export async function findMitKort");
    expect(i).toBeGreaterThan(-1);
    const krop = ACTIONS.slice(i);
    // Tre udgange — intet kort, ramt af karantænen, og mailen sendt — og de
    // giver alle sammen præcis det samme svar.
    expect(krop.match(/return \{ sendt: true \};/g)?.length).toBeGreaterThan(2);
    // Den ENESTE fejl, siden viser, er en adresse, der ikke ligner en e-mail.
    expect(krop.match(/error:/g)?.length).toBe(1);
  });

  /**
   * DÆMPNINGEN LIGGER I DATABASEN OG IKKE I EN VARIABEL. Handlingen kører i
   * mange eksemplarer, og hver af dem ville have sin egen tæller — to
   * samtidige forsøg ville begge sende. Uden en grænse er siden en knap, en
   * fremmed kan trykke på i det uendelige, og kundens indbakke betaler.
   */
  it("dæmper gentagne forsøg med en betinget opdatering", () => {
    const krop = ACTIONS.slice(ACTIONS.indexOf("export async function findMitKort"));
    expect(krop).toContain("kort_link_sendt_den");
    expect(krop).toMatch(/kort_link_sendt_den\.is\.null,kort_link_sendt_den\.lt\./);
  });

  /**
   * TOKENET NÅR ALDRIG SKÆRMEN. Det er hele grunden til, at siden er
   * forsvarlig: kun den, der kan læse mailen, får adgangen.
   */
  it("returnerer aldrig et token til browseren", () => {
    const stat = ACTIONS.slice(
      ACTIONS.indexOf("export interface FindKortState"),
      ACTIONS.indexOf("export interface FindKortState") + 260,
    );
    expect(stat).not.toContain("token");
    expect(kilde("src/app/kort/find/find-form.tsx")).not.toContain("token");
  });

  /** Siden må ikke indekseres — den handler om, hvem der har kort hvor. */
  it("holder siden ude af søgemaskiner", () => {
    expect(kilde("src/app/kort/find/page.tsx")).toContain("PRIVAT_SIDE");
  });

  /**
   * DEN SKAL KUNNE FINDES. En vej tilbage, ingen kan komme til, er ingen vej
   * tilbage — og tilmeldingssiden er dér, hvor kunden ellers er ved at
   * oprette kort nummer to ved en fejl.
   */
  for (const sti of [
    "src/app/kort/tilmeld/[slug]/page.tsx",
    "src/app/kort/[token]/page.tsx",
  ]) {
    it(`${sti} henviser til /kort/find`, () => {
      expect(kilde(sti)).toContain("/kort/find");
    });
  }
});
