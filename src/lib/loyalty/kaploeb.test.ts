import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * DE TO KAPLØB I STEMPELKORTETS KERNE — OG DE SPÆRRER, DER LUKKEDE DEM.
 *
 * Begge var det samme mønster: læs en tilstand, træf en beslutning, skriv.
 * Serverfunktionen kører i mange eksemplarer, så to samtidige anmodninger
 * læste begge den GAMLE tilstand og skrev begge.
 *
 * MÅLT PÅ DEMODATA 2026-09-15, ikke formodet:
 *
 *  1. To samtidige stempler på en kunde med 9 af 10 → **to udestående
 *     belønninger**. To gratis kaffe for ét kort.
 *  2. To samtidige indløsninger af SAMME belønning → begge nulstillede kortet,
 *     og saldoen endte på **-11**. Kunden skulle optjene elleve stempler for at
 *     komme tilbage til nul og ville ikke kunne se hvorfor: `stampProgress()`
 *     klamper til nul og viser "0 af 10".
 *
 * Ingen af dem kan udløses af kunden — kun personale kan stemple og indløse.
 * Det er to ansatte ved samme disk, en gensendt POST eller to faner.
 *
 * KILDEPRØVER, fordi begge spærrer er en betinget skrivning mod databasen:
 * der er ingen ren funktion at kalde, og et rigtigt kapløb kan ikke stilles op
 * i en enhedsprøve. Det, der skal fanges, er heller ikke en forkert beregning
 * — det er en vagt, der bliver fjernet, fordi den ser overflødig ud ved siden
 * af opslaget lige ovenfor.
 */

const MIGRATIONER = "supabase/migrations";

function kilde(sti: string): string {
  return readFileSync(join(process.cwd(), sti), "utf8");
}

describe("kun én udestående belønning ad gangen", () => {
  /**
   * REGLEN SKAL LIGGE I BASEN. `giveStamp()` slår op, om der allerede ligger
   * en `available`-belønning — men et opslag efterfulgt af en indsættelse er
   * ikke en regel, det er et ønske.
   */
  it("et partielt unikt indeks håndhæver den", () => {
    const alle = readdirSync(MIGRATIONER)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => kilde(`${MIGRATIONER}/${f}`))
      .join("\n");

    const indeks =
      /create\s+unique\s+index[^;]*?on\s+public\.customer_rewards\s*\(\s*membership_id\s*\)\s*where\s+status\s*=\s*'available'/is;
    expect(alle).toMatch(indeks);
  });

  /**
   * ...OG KUN DE UDESTÅENDE. En kunde skal kunne have mange INDLØSTE
   * belønninger over tid — et indeks uden `where` ville gøre den anden gratis
   * kaffe umulig i stedet for den anden samtidige.
   */
  it("indekset gælder ikke indløste belønninger", () => {
    const alle = readdirSync(MIGRATIONER)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => kilde(`${MIGRATIONER}/${f}`))
      .join("\n");

    const uden =
      /create\s+unique\s+index[^;]*?on\s+public\.customer_rewards\s*\(\s*membership_id\s*\)\s*;/is;
    expect(alle).not.toMatch(uden);
  });

  /**
   * Taber man kapløbet, er belønningen udstedt af den ANDEN anmodning. Kunden
   * er ikke snydt, så `23505` må ikke blive til en fejlbesked ved disken.
   */
  it("service.ts tager imod en tabt kapløbsindsættelse uden at fejle", () => {
    const src = kilde("src/lib/loyalty/service.ts");
    const i = src.indexOf("customer_rewards");
    const blok = src.slice(i, i + 1800);
    expect(blok).toContain("23505");
  });
});

describe("en belønning kan kun indløses én gang", () => {
  const src = kilde("src/lib/loyalty/service.ts");
  const krop = (() => {
    const i = src.indexOf("export async function redeemReward");
    const rest = src.slice(i + 10);
    const slut = rest.indexOf("\nexport ");
    return slut === -1 ? rest : rest.slice(0, slut);
  })();

  it("funktionens krop kunne læses", () => {
    expect(krop.length).toBeGreaterThan(500);
  });

  /**
   * `cr.status !== "available"` ovenfor er læst for et øjeblik siden. Det er
   * den BETINGEDE opdatering, der afgør kapløbet — samme greb som
   * `.is("user_id", null)` i aktiveringen og `.eq("adresser_tilladt", foer)`
   * i adressekøbet.
   */
  it("markeringen som indløst er betinget af, at den stadig er udestående", () => {
    expect(krop).toMatch(/\.eq\("status",\s*"available"\)/);
  });

  /**
   * En betinget opdatering, hvis resultat ingen ser på, er det samme som
   * ingen. Rammes nul rækker, skal nulstillingen af kortet IKKE ske — det var
   * netop den anden nulstilling, der sendte saldoen i minus.
   */
  it("nulstillingen sker først, når kapløbet er vundet", () => {
    const vundet = krop.search(/if\s*\(!vundet\?\.length\)/);
    const nulstil = krop.indexOf("reset_on_redeem");
    expect(vundet).toBeGreaterThan(-1);
    expect(nulstil).toBeGreaterThan(vundet);
  });
});

describe("den daglige grænse måler en dansk dag", () => {
  const src = kilde("src/lib/loyalty/service.ts");

  /**
   * Midnat UTC er kl. 02 dansk sommertid. En forretning med åbent hen over
   * midnat ville få den daglige grænse nulstillet MIDT i aftenen. Resten af
   * modulet har hele tiden regnet i dansk tid — to definitioner af "en dag" i
   * samme fil er en fejl, der venter.
   */
  it("bruger københavnerdagen og ikke UTC", () => {
    const i = src.indexOf("const todayStartIso");
    const krop = src.slice(i, src.indexOf("\n};", i));
    expect(krop).toContain("iDagDatoKoebenhavn");
    expect(krop).not.toMatch(/toISOString\(\)\.slice\(0,\s*10\)/);
  });

  /** Sommer- og vintertid skifter forskydningen; et fast tal ville være
   *  forkert det halve år. */
  it("slår tidsforskydningen op frem for at hardcode den", () => {
    const i = src.indexOf("const todayStartIso");
    const krop = src.slice(i, src.indexOf("\n};", i));
    expect(krop).toContain("longOffset");
    expect(krop).not.toMatch(/\+0[12]:00"/);
  });
});

describe("personalets stempelknap sender en idempotensnøgle", () => {
  /**
   * `service.ts` har altid lovet, at "dobbelt-submit ikke giver dobbelt
   * stempel" — men løftet hviler på `loyalty_txn_ref_idx` over
   * `(membership_id, reference)`, og netop den vej, personalet bruger ved
   * disken, sendte ingen reference. Knappen er spærret, mens den arbejder, men
   * det dækker kun ét klik i én fane.
   */
  it("panelet har et referencefelt", () => {
    const panel = kilde("src/app/kort/[token]/staff-stamp-panel.tsx");
    expect(panel).toMatch(/name="reference"/);
  });

  /**
   * NØGLEN LAVES PÅ SERVEREN. `useId()` er den samme for alle, der har siden
   * åben, så to medarbejdere på hver sin telefon ville dele nøgle, og den enes
   * stempel ville stiltiende blive slugt som et gentaget.
   */
  it("nøglen kommer fra siden og ikke fra useId", () => {
    const side = kilde("src/app/kort/[token]/page.tsx");
    const panel = kilde("src/app/kort/[token]/staff-stamp-panel.tsx");
    expect(side).toMatch(/reference=\{`kort-\$\{crypto\.randomUUID\(\)\}`\}/);
    // På IMPORTEN og ikke på ordet: panelets egen kommentar forklarer netop,
    // hvorfor useId er forkert her, og den forklaring skal have lov at stå.
    expect(panel).not.toMatch(/import\s*\{[^}]*\buseId\b/);
  });

  /** Og handlingen skal faktisk give den videre til ledgeren. */
  it("stampByToken sender referencen med til giveStamp", () => {
    const actions = kilde("src/app/kort/actions.ts");
    const i = actions.indexOf("const result = await giveStamp({");
    const kald = actions.slice(i, actions.indexOf("});", i));
    expect(kald).toContain("reference");
  });
});
