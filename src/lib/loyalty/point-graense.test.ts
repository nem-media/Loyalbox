import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { MAKS_POINTPROGRAMMER } from "@/lib/loyalty/point";

/**
 * FEM PROGRAMMER — OG HVORFOR GRÆNSEN LIGGER TO STEDER.
 *
 * Tallet står i `point.ts` (skærmen skal kunne sige det) og i migration 0045
 * (basen skal kunne håndhæve det). To steder er nødvendigt, og præcis derfor
 * er det farligt: en brugerflade, der lover seks, og en base, der giver fem,
 * er en fejl, butikken møder MIDT i en opsætning — efter at have skrevet
 * navnet og valgt optjeningen.
 *
 * Det er samme mønster som `opbevaring.test.ts`, hvor fristerne i `FRISTER`
 * skal passe én til én med SQL-funktionen: en regel, der siges ét sted og
 * håndhæves et andet, skal kunne prøves ét tredje.
 */

const MAPPE = "supabase/migrations";

function migration(): string {
  const fil = readdirSync(MAPPE).find((f) => f.includes("flere_pointprogrammer"));
  if (!fil) throw new Error("0045 findes ikke");
  return readFileSync(`${MAPPE}/${fil}`, "utf8");
}

/** Uden kommentarer: filen forklarer sig selv med de samme ord, som koden bruger. */
const KROP = migration()
  .replace(/--.*$/gm, "")
  .replace(/\s+/g, " ");

describe("grænsen på fem", () => {
  it("koden og basen siger det samme tal", () => {
    const m = /maks constant int := (\d+);/.exec(KROP);
    expect(m, "grænsen skal stå som en konstant i 0045").not.toBeNull();
    expect(Number(m![1])).toBe(MAKS_POINTPROGRAMMER);
  });

  /*
   * LÅSEN ER HELE FORSKELLEN PÅ EN REGEL OG EN FORMODNING. Uden den kan to
   * samtidige oprettelser begge tælle fire og begge indsætte — nøjagtig det,
   * der gav tre rabatter på en kampagne med plads til én (0041).
   */
  it("virksomheden låses, før der tælles", () => {
    expect(KROP).toMatch(
      /perform 1 from public\.companies where id = new\.company_id for update; select count\(\*\) into levende/,
    );
  });

  it("rækken tæller ikke sig selv", () => {
    // Uden `id <> new.id` ville en statusændring på program nummer fem blive
    // afvist, fordi rækken allerede står i tabellen.
    expect(KROP).toMatch(/and id <> new\.id/);
  });

  it("arkiverede tæller ikke med", () => {
    expect(KROP).toMatch(/and status <> 'archived'/);
  });

  it("fejlen bærer en kode, brugerfladen kan oversætte", () => {
    expect(KROP).toContain("for-mange-pointprogrammer");
    const handlinger = readFileSync(
      "src/app/dashboard/loyalitet/point/actions.ts",
      "utf8",
    );
    expect(handlinger).toContain("for-mange-pointprogrammer");
  });

  /*
   * TRIGGEREN SKAL OGSÅ FANGE EN GENÅBNING. At tage et arkiveret program
   * tilbage i drift er lige så meget en oprettelse som en indsættelse, set fra
   * grænsen — ellers kunne man arkivere sig til ubegrænset mange og hente dem
   * frem igen bagefter.
   */
  it("triggeren dækker både oprettelse og genåbning", () => {
    expect(KROP).toMatch(
      /before insert or update of status on public\.loyalty_point_programs/,
    );
    expect(KROP).toMatch(/when \(new\.status <> 'archived'\)/);
  });

  it("ét-program-indekset fra 0044 er væk", () => {
    expect(KROP).toContain(
      "drop index if exists public.loyalty_point_programs_et_levende_idx",
    );
  });

  it("funktionen er service-role-only", () => {
    expect(KROP).toMatch(
      /revoke all on function public\.point_program_graense\(\) from anon, authenticated/,
    );
  });
});

describe("koden regner ikke længere med ét program", () => {
  const udenKommentarer = (s: string) =>
    s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

  const SERVICE = udenKommentarer(
    readFileSync("src/lib/loyalty/point-service.ts", "utf8"),
  );

  /*
   * `.maybeSingle()` PÅ EN TABEL MED FLERE RÆKKER ER EN TAVS FEJL: PostgREST
   * svarer 406/PGRST116, og svaret bliver til null. Butikken ville oprette
   * program nummer to, og så ville ALLE pointdele forsvinde fra kortet,
   * kundesiden og personalefladen på én gang, uden at noget fejlede. Samme
   * fælde som de to primære belønninger i 0042.
   */
  it("programlisten hentes uden maybeSingle", () => {
    const blok = SERVICE.slice(
      SERVICE.indexOf("export async function hentPointProgrammer"),
      SERVICE.indexOf("export async function hentAktivePointProgrammer"),
    );
    expect(blok).not.toMatch(/maybeSingle/);
    expect(blok).toMatch(/\.order\("created_at"/);
  });

  it("ét program hentes på sit id OG sin virksomhed", () => {
    const blok = SERVICE.slice(
      SERVICE.indexOf("export async function hentPointProgram("),
    );
    expect(blok).toMatch(/\.eq\("id", programId\)[\s\S]{0,80}\.eq\("company_id", companyId\)/);
  });

  it("ingen flade henter 'virksomhedens ene program' længere", () => {
    for (const sti of [
      "src/app/kort/[token]/page.tsx",
      "src/app/kort/actions.ts",
      "src/app/kort/tilmeld/[slug]/page.tsx",
      "src/components/loyalty/point-panel.tsx",
      "src/app/dashboard/loyalitet/page.tsx",
    ]) {
      const kilde = udenKommentarer(readFileSync(sti, "utf8"));
      expect(kilde, sti).not.toMatch(/hentPointProgram\(\s*[a-zA-Z.?]+\s*[,)]/);
    }
  });
});
