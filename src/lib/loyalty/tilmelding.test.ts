import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * EN DUBLET ER IKKE EN FEJL VED DISKEN — DET ER ET SVAR.
 *
 * `0042` gjorde "ét kort pr. kunde pr. butik" til en DB-garanti, og det var
 * rigtigt. Men indsættelsen i `enrollMember` gav `error.message` videre, som
 * den altid havde gjort, og fra den dag indekset fandtes, betød det, at
 * personalet ved disken fik databasens rå tekst at se:
 *
 *     duplicate key value violates unique constraint
 *     "loyalty_members_en_mail_pr_firma_idx"
 *
 * Målt mod den kørende base 2026-09-16. Kunden står ved siden af, og
 * beskeden peger ingen steder hen. Det er dén slags rettelse, der laver en
 * ny fejl et andet sted: spærren kom i basen, og stedet der SKREV, blev
 * ikke fulgt med — samme halvhed som webhookens ordre kontra virksomhed.
 *
 * Kuren er `selfEnroll`s: findes hun, er det hendes kort, der skal bruges.
 *
 * OG MEDLEMSKABET HAVDE SIN EGEN: `unique (program_id, member_id)` har stået
 * i 0004 siden begyndelsen, men svaret blev slet ikke læst. En kunde, der
 * allerede var på kortet, fik "tilmeldt" at vide, uden at noget skete — og
 * enhver ANDEN fejl på den linje forsvandt samme vej.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const KILDE = udenKommentarer(
  readFileSync(
    join(process.cwd(), "src/app/dashboard/loyalitet/actions.ts"),
    "utf8",
  ),
);

/** Kroppen af `enrollMember` — frem til næste `export`. */
const KROP = (() => {
  const i = KILDE.indexOf("export async function enrollMember(");
  expect(i, "enrollMember findes ikke").toBeGreaterThan(-1);
  const rest = KILDE.slice(i + 10);
  const slut = rest.indexOf("\nexport ");
  return slut === -1 ? rest : rest.slice(0, slut);
})();

describe("tilmelding af en kunde, butikken har i forvejen", () => {
  it("slår kunden op i stedet for at vise databasens besked", () => {
    expect(KROP, "23505 behandles ikke").toContain('memberErr?.code === "23505"');
    const i = KROP.indexOf('memberErr?.code === "23505"');
    const efter = KROP.slice(i, i + 700);
    // Opslaget skal være bundet til BUTIKKEN — indekset er pr. virksomhed.
    expect(efter).toContain('.eq("company_id", access.companyId)');
    expect(efter).toMatch(/fandtes = true/);
  });

  /**
   * NAVNET MÅ IKKE SKRIVES OVEN I. En tilmelding er ikke en redigering, og
   * to kunder kan dele en e-mail, butikken har tastet forkert — en `update`
   * her ville omdøbe en anden kunde uden at nogen bad om det.
   */
  it("opdaterer ikke den kunde, der blev fundet", () => {
    const i = KROP.indexOf('memberErr?.code === "23505"');
    expect(KROP.slice(i, i + 700)).not.toMatch(/\.update\(/);
  });

  /** Beskeden skal frem — ellers ligner det en ny oprettelse med et andet navn. */
  it("siger det på kundesiden bagefter", () => {
    expect(KROP).toMatch(/besked=fandtes/);
    const side = udenKommentarer(
      readFileSync(
        join(process.cwd(), "src/app/dashboard/loyalitet/kunder/[id]/page.tsx"),
        "utf8",
      ),
    );
    expect(side).toContain('besked === "fandtes"');
    expect(side).toMatch(/i forvejen/);
  });
});

describe("medlemskabets indsættelse", () => {
  it("læser svaret", () => {
    const m = /from\("loyalty_memberships"\)\.insert\(/.exec(KROP);
    expect(m, "indsættelsen findes ikke").not.toBeNull();
    expect(KROP.slice(Math.max(0, m!.index - 120), m!.index)).toMatch(
      /const \{ error: msFejl \}/,
    );
  });

  /** En dublet er "hun er der allerede"; alt andet skal siges højt. */
  it("tåler en dublet, men ikke enhver anden fejl", () => {
    expect(KROP).toMatch(/msFejl && msFejl\.code !== "23505"/);
    const i = KROP.indexOf('msFejl.code !== "23505"');
    expect(KROP.slice(i, i + 300)).toMatch(/ikke tilmeldt stempelkortet/);
  });
});

describe("et datovindue, der slutter før det begynder", () => {
  /**
   * `programVindue()` svarer "foer", indtil startdatoen er nået, og "efter"
   * bagefter — ligger slutdatoen først, findes der ikke én dag, hvor svaret
   * er "aktiv". **Målt i brugerfladen 2026-09-16:** start 1. jan. 2027 og
   * slut 1. jan. 2026 blev gemt uden en lyd, og forhåndsvisningen skrev
   * "Kortet gælder fra 1. jan. 2027" — et løfte om en dag, hvor kortet i
   * virkeligheden er udløbet.
   */
  const KODE = udenKommentarer(
    readFileSync(
      join(process.cwd(), "src/app/dashboard/loyalitet/actions.ts"),
      "utf8",
    ),
  );

  it("afvises ved oprettelse OG ved rettelse", () => {
    for (const navn of ["createProgram", "updateProgram"]) {
      const i = KODE.indexOf(`export async function ${navn}(`);
      expect(i, `${navn} findes ikke`).toBeGreaterThan(-1);
      const rest = KODE.slice(i);
      const slut = rest.indexOf("\nexport ");
      const krop = slut === -1 ? rest : rest.slice(0, slut);
      expect(krop, `${navn} tjekker ikke datovinduet`).toContain(
        "datoVinduetVendtOm(formData)",
      );
    }
  });

  /** Ét felt tomt er lovligt — og en endagsdato er det også. */
  it("kun et omvendt vindue rammes", () => {
    const m = /function datoVinduetVendtOm[\s\S]*?\n}/.exec(KODE);
    expect(m).not.toBeNull();
    expect(m![0]).toMatch(/!start \|\| !slut \|\| slut >= start/);
  });
});
