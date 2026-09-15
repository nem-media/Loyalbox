import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

/**
 * ROLLEN ER EN BESLUTNING, SYSTEMET TRÆFFER — ALDRIG EN OPLYSNING FRA
 * DEN, DER OPRETTES.
 *
 * FUNDET 2026-09-15, og det alvorligste i hele gennemgangen.
 * `handle_new_user()` tog rollen fra den nye brugers egen metadata:
 *
 *     coalesce((new.raw_user_meta_data ->> 'role')::user_role, 'customer')
 *
 * `raw_user_meta_data` er dét, klienten sender i `options.data`. Anon-nøglen
 * ligger i browserens bundt og er offentlig med vilje, og selvbetjent
 * oprettelse er slået til — så enhver kunne kalde Supabases eget endpoint:
 *
 *     POST /auth/v1/signup  { "data": { "role": "admin" } }
 *
 * AFPRØVET MOD PRODUKTIONSPROJEKTET: brugeren blev oprettet, og
 * `public.users.role` stod bagefter på **admin**. Prøvebrugeren blev slettet
 * igen. Rollen dér er dét, både `getCurrentUser()` og `is_admin()` — og
 * dermed RLS på tværs af hele skemaet — bygger på.
 *
 * HVORFOR DET KUNNE STÅ: alt i lagene ovenover var rigtigt. `users` kan kun
 * skrives af en admin, der er ingen selvbetjent rolleskifter, og hver eneste
 * kaldesti i appen sendte `"customer"`. Hullet lå det ene sted, hvor en
 * værdi fra brugeren blev behandlet som en oplysning fra systemet — i en
 * trigger, altså uden for al koden, hvor ingen kildelæsning finder den.
 *
 * Prøverne her læser BÅDE migrationerne og appen, og de læser uden
 * kommentarer: forklaringerne ovenfor citerer med vilje den kode, de handler
 * om.
 */

const MIGRATIONER = "supabase/migrations";

function udenKommentarer(s: string): string {
  return s
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/(^|[^:])\/\/.*$/gm, "$1")
    .replace(/^\s*--.*$/gm, "");
}

/** Den SIDSTE definition af triggerfunktionen vinder — som i databasen. */
function senesteTrigger(): string {
  const filer = readdirSync(MIGRATIONER)
    .filter((f) => f.endsWith(".sql"))
    .sort();
  let fundet = "";
  for (const fil of filer) {
    const sql = udenKommentarer(
      readFileSync(join(MIGRATIONER, fil), "utf8"),
    );
    const i = sql.indexOf("function public.handle_new_user");
    if (i !== -1) fundet = sql.slice(i, sql.indexOf("$$;", i));
  }
  return fundet;
}

describe("triggeren tager ikke rollen fra brugerens metadata", () => {
  const krop = senesteTrigger();

  it("funktionen findes", () => {
    expect(krop.length, "handle_new_user findes ikke").toBeGreaterThan(100);
  });

  /** SELVE FEJLEN. Den må aldrig komme tilbage i nogen senere migration. */
  it("læser ikke 'role' ud af raw_user_meta_data", () => {
    expect(krop).not.toMatch(/raw_user_meta_data\s*->>\s*'role'/);
  });

  it("indsætter rollen som en fast værdi", () => {
    expect(krop).toMatch(/'customer'/);
  });

  /**
   * Og den skal stadig indsætte brugeren. En trigger, der blev tom, ville
   * betyde konti uden en række i `public.users` — altså brugere uden rolle
   * overhovedet, som `getCurrentUser()` ville behandle som `customer`, mens
   * intet andet kunne finde dem.
   */
  it("indsætter stadig id og e-mail i public.users", () => {
    expect(krop).toMatch(/insert into public\.users/i);
    expect(krop).toMatch(/new\.id/);
    expect(krop).toMatch(/new\.email/);
  });
});

describe("appen sender ikke en rolle med, når en konto oprettes", () => {
  /**
   * Efter rettelsen i basen er feltet harmløst — men et felt, der SER ud til
   * at bestemme rollen uden at gøre det, er netop dét, der får den næste til
   * at tro, at rollen kan sendes med. Og skulle triggeren en dag blive rullet
   * tilbage, ville de fire kaldesteder være ladt.
   */
  const FILER = [
    "src/app/(auth)/actions.ts",
    "src/app/aktiver/actions.ts",
    "src/app/dashboard/personale/actions.ts",
  ];

  for (const fil of FILER) {
    it(`${fil} sender ingen rolle i metadata`, () => {
      const kode = udenKommentarer(
        readFileSync(join(process.cwd(), fil), "utf8"),
      );
      expect(kode).not.toMatch(/role:\s*["']/);
    });
  }
});

describe("rollen kan kun skrives af en admin", () => {
  /**
   * Den anden halvdel af spærren, og den var rigtig hele tiden: `users` har
   * kun ÉN skrivepolitik, og den kræver `is_admin()`. Uden den kunne en
   * kunde bare opdatere sin egen række bagefter, og migrationen ville være
   * uden virkning.
   */
  it("users har ingen selvbetjent opdateringspolitik", () => {
    const sql = readdirSync(MIGRATIONER)
      .filter((f) => f.endsWith(".sql"))
      .map((f) => udenKommentarer(readFileSync(join(MIGRATIONER, f), "utf8")))
      .join("\n");

    const politikker = [
      ...sql.matchAll(
        /create policy (\w+) on public\.users\s+for (\w+)([\s\S]*?);/g,
      ),
    ];
    expect(politikker.length).toBeGreaterThan(0);

    for (const [, navn, slags, krop] of politikker) {
      if (slags.toLowerCase() === "select") continue;
      // Enhver ikke-select-politik på users SKAL kræve is_admin().
      expect(krop, `${navn} (${slags}) skriver uden at kræve admin`).toContain(
        "is_admin()",
      );
    }
  });
});
