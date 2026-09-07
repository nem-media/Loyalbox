import { describe, it, expect, vi, beforeEach } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * Supportadgang: admin ser og retter en kundes dashboard SOM ADMIN.
 *
 * Prøverne her handler næsten alle om ÉN egenskab: at cookien kun VÆLGER en
 * virksomhed og aldrig giver adgang til den. Adgangen afgøres af rollen, som
 * slås op på serveren ved hver forespørgsel. Falder den skelnen, er en cookie
 * pludselig en adgangsnøgle, enhver kan skrive selv — og det ville være den
 * slags fejl, der ikke viser sig, før nogen leder efter den.
 */

const getCurrentUser = vi.fn();
vi.mock("@/lib/auth", () => ({ getCurrentUser: () => getCurrentUser() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: async () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            order: () => ({ limit: () => ({ maybeSingle: async () => ({ data: null }) }) }),
          }),
        }),
      }),
    }),
  }),
}));

const { getCompanyAccess } = await import("./loyalty/access");

function kilde(sti: string): string {
  return readFileSync(join(process.cwd(), sti), "utf8");
}

/** Kilden uden kommentarer — prøverne handler om KODEN, ikke om ordvalget. */
function udenKommentarer(sti: string): string {
  return kilde(sti)
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const virksomhed = (id: string) => ({ id, name: "Kundens butik" });

beforeEach(() => getCurrentUser.mockReset());

describe("adgangen afgøres af rollen, ikke af cookien", () => {
  /**
   * MODULET MED COOKIEN MÅ IKKE KENDE ROLLEN. Kunne det selv sige ja, ville
   * der være to steder, adgangen blev afgjort — og det ene ville før eller
   * siden komme bagud.
   */
  it("cookie-modulet afgør ikke noget", () => {
    const src = udenKommentarer("src/lib/support-adgang.ts");
    expect(src).not.toMatch(/\brole\b/);
    expect(src).not.toMatch(/is_admin|isAdmin/);
    // Og den må ikke hente brugeren: så ville den kunne fristes til at svare.
    expect(src).not.toMatch(/getCurrentUser/);
  });

  /** Opslaget af supportvirksomheden sker KUN for en admin. */
  it("kun en admin får en supportvirksomhed slået op", () => {
    const src = kilde("src/lib/auth.ts");
    const del = src.slice(src.indexOf("let supportFor"), src.indexOf("let company"));
    expect(del).toMatch(/role === "admin"/);
    expect(del).toContain("valgtSupportVirksomhed");
  });

  /** Begge handlinger skal kræve admin, før de rører cookien. */
  it("både åbn og luk kræver admin", () => {
    const src = kilde("src/app/admin/actions.ts");
    for (const navn of ["aabnSupportAdgang", "lukSupportAdgang"]) {
      const i = src.indexOf(`export async function ${navn}`);
      expect(i, `${navn} findes ikke`).toBeGreaterThan(-1);
      const krop = src.slice(i, i + 500);
      expect(krop, `${navn} spørger ikke requireAdmin`).toContain("requireAdmin()");
      // Rollen skal slås op FØR cookien sættes eller slettes.
      expect(krop.indexOf("requireAdmin()")).toBeLessThan(
        krop.search(/cookies\(\)/),
      );
    }
  });
});

describe("supporttilstanden kan ses på adgangen", () => {
  /**
   * ROLLEN ER `owner`, fordi support skal kunne alt det, ejeren kan — ellers
   * kan vi ikke hjælpe med det, der er gået galt. Men `actorUserId` bliver ved
   * at være admins eget, og flaget gør det muligt at SIGE det.
   */
  it("markerer support, når virksomheden kommer fra supporttilstanden", async () => {
    const c = virksomhed("c1");
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@loyalbox.test",
      role: "admin",
      company: c,
      supportFor: c,
    });
    const a = await getCompanyAccess();
    expect(a?.companyId).toBe("c1");
    expect(a?.actorUserId).toBe("admin-1");
    expect(a?.role).toBe("owner");
    expect(a?.erSupport).toBe(true);
  });

  /** En rigtig ejer må ALDRIG markeres som support. */
  it("markerer ikke en almindelig ejer som support", async () => {
    getCurrentUser.mockResolvedValue({
      id: "ejer-1",
      email: "ejer@butik.dk",
      role: "customer",
      company: virksomhed("c1"),
      supportFor: null,
    });
    const a = await getCompanyAccess();
    expect(a?.erSupport).toBe(false);
    expect(a?.actorUserId).toBe("ejer-1");
  });

  /**
   * Og peger supporttilstanden på en ANDEN virksomhed end den, adgangen
   * gælder, er det ikke support — det er en uoverensstemmelse, og så skal
   * flaget ikke pynte på den.
   */
  it("markerer ikke support, når de to virksomheder ikke er den samme", async () => {
    getCurrentUser.mockResolvedValue({
      id: "admin-1",
      email: "admin@loyalbox.test",
      role: "admin",
      company: virksomhed("c1"),
      supportFor: virksomhed("c2"),
    });
    const a = await getCompanyAccess();
    expect(a?.erSupport).toBe(false);
  });
});

describe("man skal kunne se og forlade det", () => {
  /**
   * Skærmen er kundens i ét og alt, og den eneste forskel er, hvem der sidder
   * foran den. Det er præcis den slags, man glemmer efter to minutter.
   */
  it("dashboardet viser et banner med vejen tilbage", () => {
    const shell = kilde("src/components/dashboard-shell.tsx");
    expect(shell).toContain("som ADMIN");
    expect(shell).toContain("lukSupportAdgang");
    expect(shell).toContain("Tilbage til admin");
  });

  /** Og virksomhedssiden skal have vejen ind. */
  it("admin kan åbne kundens dashboard fra virksomheden", () => {
    const side = kilde("src/app/admin/virksomheder/[id]/page.tsx");
    expect(side).toContain("aabnSupportAdgang");
  });

  /**
   * ADGANGEN NOTERES. Det er svaret på det spørgsmål, en kunde stiller — "har
   * I været inde i min konto?". Uden linjen ville supporttilstanden være den
   * eneste vej ind uden et spor, og det var netop dét, admin_log blev bygget
   * for at rette.
   */
  it("både åbning og lukning noteres i admin-loggen", () => {
    const log = kilde("src/lib/admin-log.ts");
    expect(log).toContain("support-adgang-aabnet");
    expect(log).toContain("support-adgang-lukket");
    const src = kilde("src/app/admin/actions.ts");
    expect(src).toContain('handling: "support-adgang-aabnet"');
    expect(src).toContain('handling: "support-adgang-lukket"');
  });
});
