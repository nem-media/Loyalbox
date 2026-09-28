import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import {
  BETALINGSVARSEL_DAGE,
  BETALING_LUKKER_EFTER_DAGE,
  betalingLukker,
  betalingssagIDag,
  erBetalingssag,
} from "./abonnement";
import { betalingsvarselMail } from "./abonnementsmail";

/**
 * TRE HØFLIGE VARSLER, FØR ADGANGEN LUKKER — og KUN hvis der ikke er betalt.
 *
 * Ejerens beslutning 28. september 2026. Før lukkede adgangen ved første
 * fejlede betaling, mens §7 lovede noget andet. Efterprøvet samme dag mod
 * Stripe test: en betalt faktura gav `aaben: false`, et afvist kort gav
 * `past_due` med 375 kr. udestående og `aaben: true`, og efter at kunden
 * betalte med et nyt kort var den `false` igen.
 */

const start = new Date("2026-10-01T10:00:00Z");
const dag = (n: number) => new Date(start.getTime() + n * 86_400_000);

describe("tidsplanen", () => {
  it("varsler dag 0, 4 og 8 og lukker dag 11", () => {
    expect(betalingssagIDag(start, 0, dag(0))).toEqual({ varsel: 1 });
    expect(betalingssagIDag(start, 1, dag(3))).toBeNull();
    expect(betalingssagIDag(start, 1, dag(4))).toEqual({ varsel: 2 });
    expect(betalingssagIDag(start, 2, dag(7))).toBeNull();
    expect(betalingssagIDag(start, 2, dag(8))).toEqual({ varsel: 3 });
    expect(betalingssagIDag(start, 3, dag(10))).toBeNull();
    expect(betalingssagIDag(start, 3, dag(11))).toEqual({ luk: true });
  });

  it("lukker ALDRIG, før alle tre varsler er sendt — heller ikke efter en glemt nat", () => {
    expect(betalingssagIDag(start, 1, dag(20))).toEqual({ varsel: 2 });
    expect(betalingssagIDag(start, 2, dag(20))).toEqual({ varsel: 3 });
  });

  it("lukker før Stripe giver op efter to uger — ellers var datoen i mailen løgn", () => {
    expect(BETALING_LUKKER_EFTER_DAGE).toBeLessThan(14);
    expect(BETALING_LUKKER_EFTER_DAGE).toBeGreaterThan(
      BETALINGSVARSEL_DAGE[BETALINGSVARSEL_DAGE.length - 1],
    );
    expect(BETALINGSVARSEL_DAGE).toHaveLength(3);
  });

  it("kun past_due og unpaid er en betalingssag", () => {
    expect(erBetalingssag("past_due")).toBe(true);
    expect(erBetalingssag("unpaid")).toBe(true);
    for (const s of ["active", "canceled", "incomplete", null]) {
      expect(erBetalingssag(s)).toBe(false);
    }
  });
});

describe("mailene", () => {
  const faelles = {
    firmanavn: "Café Aurora",
    vare: "LoyalSum Komplet",
    lukker: betalingLukker(start),
    udestaaendeOere: 49875,
    fakturaUrl: "https://invoice.stripe.com/i/test",
  };

  it("første varsel er høfligt og nævner ingen dato", () => {
    const { emne, tekst } = betalingsvarselMail({ ...faelles, nummer: 1 });
    expect(emne).toBe("Betalingen for LoyalSum Komplet gik ikke igennem");
    expect(tekst).toContain("498,75 kr. inkl. moms");
    expect(tekst).toContain("helt uændret");
    expect(tekst).not.toContain("12. oktober 2026");
  });

  it("tredje varsel siger datoen, og at intet slettes", () => {
    const { emne, tekst } = betalingsvarselMail({ ...faelles, nummer: 3 });
    expect(emne).toContain("12. oktober 2026");
    expect(tekst).toContain("den 12. oktober 2026");
    expect(tekst).toContain("der slettes ingenting");
  });

  it("alle tre har vejen til at betale og 'har du allerede betalt'", () => {
    for (const nummer of [1, 2, 3] as const) {
      const { tekst } = betalingsvarselMail({ ...faelles, nummer });
      expect(tekst).toContain(faelles.fakturaUrl);
      expect(tekst).toContain("Har du allerede betalt");
    }
  });
});

function kode(sti: string): string {
  return readFileSync(new URL(sti, import.meta.url), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

describe("der sendes kun, hvis der ikke er betalt", () => {
  const lib = kode("./betalingsvarsler.ts");
  const send = lib.slice(lib.indexOf("async function sendVarsel"));

  it("fakturaen slås op FØR tælleren løftes og mailen sendes", () => {
    const opslag = send.indexOf("await udestaaende(sub)");
    const tjek = send.indexOf("if (!faktura.aaben)");
    const loeft = send.indexOf("betalingsvarsler_sendt: nummer");
    const mail = send.indexOf("sendKundeMail(");
    expect(opslag).toBeGreaterThan(-1);
    expect(tjek).toBeGreaterThan(opslag);
    expect(loeft).toBeGreaterThan(tjek);
    expect(mail).toBeGreaterThan(loeft);
  });

  it("åben betyder åben, forsøgt og med et beløb tilbage", () => {
    expect(lib).toMatch(/faktura\.status === "open"/);
    expect(lib).toMatch(/faktura\.attempted === true/);
    expect(lib).toMatch(/amount_remaining \?\? 0\) > 0/);
  });

  it("tælleren løftes betinget, så samme varsel ikke sendes to gange", () => {
    expect(send).toMatch(/\.eq\("betalingsvarsler_sendt", nummer - 1\)/);
  });

  it("lukningen kræver også en åben faktura", () => {
    const luk = lib.slice(lib.indexOf("LUK") >= 0 ? 0 : 0);
    expect(luk).toMatch(/const faktura = await udestaaende\(sub\);\s*if \(!faktura\.aaben\) continue;/);
  });

  it("natkørslen henter abonnementet friskt og nulstiller en betalt sag", () => {
    const koer = lib.slice(lib.indexOf("export async function koerBetalingsvarsler"));
    expect(koer).toContain("subscriptions.retrieve(");
    expect(koer).toMatch(/if \(erBetalende\(sub\.status\)\)/);
  });
});

describe("koblingen", () => {
  it("webhooken starter en betalingssag i stedet for at suspendere", () => {
    const w = kode("../app/api/stripe/webhook/route.ts");
    const sag = w.indexOf("if (erBetalingssag(sub.status))");
    const suspension = w.indexOf('plan: "basic" as const, stripe_status: sub.status');
    expect(sag).toBeGreaterThan(-1);
    expect(suspension).toBeGreaterThan(sag);
    expect(w).toContain("startBetalingssag(firmaId, sub)");
  });

  it("en betaling nulstiller sagen", () => {
    const w = kode("../app/api/stripe/webhook/route.ts");
    expect(w).toMatch(/betaling_fejlet_siden: null,\s*betalingsvarsler_sendt: 0/);
  });

  it("natkørslen kører varslerne", () => {
    expect(kode("../app/api/cron/oprydning/route.ts")).toContain(
      "koerBetalingsvarsler(toerloeb)",
    );
  });

  it("§7 læser tallene af konstanterne og skrives aldrig af", () => {
    const side = kode("../app/handelsbetingelser/page.tsx");
    expect(side).toContain("{BETALINGSVARSEL_DAGE[1]}");
    expect(side).toContain("{BETALING_LUKKER_EFTER_DAGE}");
  });

  it("dashboardet viser sagen, mens adgangen er åben", () => {
    const banner = kode("../components/betaling-mangler.tsx");
    expect(banner).toContain("erBetalingssag(firma.stripe_status)");
    expect(banner).toContain('vej="opdater_kort"');
  });
});
