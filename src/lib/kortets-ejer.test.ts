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
