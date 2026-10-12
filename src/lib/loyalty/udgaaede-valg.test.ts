import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import {
  EARN_MODEL_LABELS,
  EARN_MODEL_HELP,
  PROGRAM_TEMPLATES,
  VALGBARE_EARN_MODELS,
  earnModelErValgbar,
  vaelgEarnModel,
  type EarnModel,
} from "./constants";

/**
 * TRE VALG I STEMPELKORT-WIZARDEN, DER INTET GJORDE (taget ud 12. okt. 2026).
 *
 * "Efter beløb", "Kampagne" og "Stempler udløber" blev gemt på programmet,
 * men stemplingen læser dem ikke. De er fjernet fra VALGET — ikke fra
 * databasen — og et kort, der allerede står med dem, må ikke blive ændret af
 * en almindelig redigering. Prøverne her holder begge halvdele fast.
 */

function kilde(sti: string): string {
  return readFileSync(join(process.cwd(), sti), "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");
}

const WIZARD = "src/app/dashboard/loyalitet/programmer/program-wizard.tsx";
const ACTIONS = "src/app/dashboard/loyalitet/actions.ts";

/** Kroppen af én eksporteret funktion — til at prøve create og update hver for sig. */
function funktion(s: string, navn: string): string {
  const start = s.indexOf(`export async function ${navn}(`);
  expect(start, navn).toBeGreaterThan(-1);
  const naeste = s.indexOf("export async function", start + 10);
  return s.slice(start, naeste === -1 ? undefined : naeste);
}

describe("hvilke optjeningsmodeller et nyt kort kan få", () => {
  it("de to modeller uden virkning kan ikke vælges", () => {
    expect(earnModelErValgbar("per_amount")).toBe(false);
    expect(earnModelErValgbar("campaign")).toBe(false);
    expect([...VALGBARE_EARN_MODELS].sort()).toEqual(
      ["manual", "per_purchase", "per_visit"].sort(),
    );
  });

  it("enum og etiketter er BEVARET, så eksisterende kort stadig kan vises", () => {
    for (const m of ["per_amount", "campaign"] as EarnModel[]) {
      expect(EARN_MODEL_LABELS[m]).toBeTruthy();
      expect(EARN_MODEL_HELP[m]).toBeTruthy();
    }
  });

  it("ingen skabelon sætter en udgået model", () => {
    for (const t of PROGRAM_TEMPLATES) {
      expect(earnModelErValgbar(t.earnModel), t.key).toBe(true);
    }
  });
});

describe("vaelgEarnModel — det, serveren gemmer", () => {
  it("et nyt kort kan ikke få en udgået model", () => {
    expect(vaelgEarnModel("per_amount", null)).toBe("per_purchase");
    expect(vaelgEarnModel("campaign", null)).toBe("per_purchase");
  });

  it("en valgbar model gemmes, som den er", () => {
    for (const m of VALGBARE_EARN_MODELS) {
      expect(vaelgEarnModel(m, null)).toBe(m);
      expect(vaelgEarnModel(m, "per_amount")).toBe(m);
    }
  });

  it("et eksisterende kort BEHOLDER sin udgåede model ved en redigering", () => {
    expect(vaelgEarnModel("per_amount", "per_amount")).toBe("per_amount");
    expect(vaelgEarnModel("campaign", "campaign")).toBe("campaign");
  });

  it("man kan ikke skifte TIL en udgået model, heller ikke fra en anden udgået", () => {
    expect(vaelgEarnModel("per_amount", "per_visit")).toBe("per_purchase");
    expect(vaelgEarnModel("campaign", "per_amount")).toBe("per_purchase");
  });
});

describe("wizarden tilbyder ikke valgene", () => {
  const s = kilde(WIZARD);

  it("listen bygges af de valgbare modeller og ikke af alle etiketter", () => {
    expect(s).toContain("VALGBARE_EARN_MODELS");
    expect(s).not.toMatch(/Object\.keys\(EARN_MODEL_LABELS\)/);
  });

  it("der er intet felt til udløb eller beløb pr. stempel", () => {
    expect(s).not.toMatch(/name="stamps_expire"/);
    expect(s).not.toMatch(/name="stamp_expiry_days"/);
    expect(s).not.toMatch(/name="amount_per_stamp"/);
  });

  it("et eksisterende kort med en udgået model får den vist og forklaret", () => {
    expect(s).toMatch(/earnModelErValgbar\(initial\.earnModel\)/);
    expect(s).toContain("(udgået)");
  });
});

describe("serveren holder samme regel", () => {
  const s = kilde(ACTIONS);

  it("oprettelsen bruger vaelgEarnModel uden eksisterende model og slår udløb fra", () => {
    const create = funktion(s, "createProgram");
    expect(create).toMatch(/vaelgEarnModel\([\s\S]*?,\s*null,?\s*\)/);
    expect(create).toMatch(/stamps_expire:\s*false/);
    expect(create).toMatch(/stamp_expiry_days:\s*null/);
    expect(create).not.toMatch(/formData\.get\("stamps_expire"\)/);
  });

  it("redigeringen slår kortets nuværende model op og rører ikke udløbsfelterne", () => {
    const update = funktion(s, "updateProgram");
    expect(update).toMatch(/select\("earn_model, amount_per_stamp"\)/);
    expect(update).toMatch(/vaelgEarnModel\([\s\S]*?nu\.earn_model/);
    expect(update).not.toMatch(/stamps_expire/);
    expect(update).not.toMatch(/stamp_expiry_days/);
    // Beløbet tages fra det gemte kort, ikke fra et felt, der ikke findes.
    expect(update).not.toMatch(/formData\.get\("amount_per_stamp"\)/);
  });

  it("medarbejderens hurtige oprettelse giver heller ikke udløb eller en udgået model", () => {
    const p = kilde("src/app/personale/stempelkort/actions.ts");
    expect(p).toMatch(/earn_model:\s*"per_purchase"/);
    expect(p).toMatch(/stamps_expire:\s*false/);
  });
});

/**
 * OG TO TIL (godkendt 12. okt. 2026): "Antal stempler pr. optjening" og
 * "Medarbejder skal bekræfte hvert stempel". Ingen af dem læses af
 * stemplingen (`giveStamp`, `stampByToken`, commerce) — et tryk giver ét
 * stempel, og personalet bekræfter ved at trykke. To eksisterende kladder
 * står med 6 og 10 pr. optjening; de værdier skal blive stående.
 */
describe("stempler pr. optjening og medarbejderbekræftelse", () => {
  const wizard = kilde(WIZARD);
  const s = kilde(ACTIONS);

  it("wizarden har ingen felter til dem — hverken ved oprettelse eller redigering", () => {
    expect(wizard).not.toMatch(/name="stamps_per_earn"/);
    expect(wizard).not.toMatch(/name="require_staff_confirm"/);
  });

  it("et nyt kort får databasens standard, uanset hvad requesten sender", () => {
    const create = funktion(s, "createProgram");
    expect(create).toMatch(/stamps_per_earn:\s*1,/);
    expect(create).toMatch(/require_staff_confirm:\s*true,/);
    expect(create).not.toMatch(/formData\.get\("stamps_per_earn"\)/);
    expect(create).not.toMatch(/formData\.get\("require_staff_confirm"\)/);
  });

  it("en redigering overskriver ikke de gemte værdier", () => {
    const update = funktion(s, "updateProgram");
    expect(update).not.toMatch(/stamps_per_earn/);
    expect(update).not.toMatch(/require_staff_confirm/);
  });

  it("stemplingen læser stadig ingen af dem — ellers er det en ny beslutning", () => {
    for (const sti of [
      "src/lib/loyalty/service.ts",
      "src/app/kort/actions.ts",
      "src/lib/commerce-api/service.ts",
    ]) {
      const k = kilde(sti);
      expect(k, sti).not.toMatch(/stamps_per_earn|require_staff_confirm/);
    }
  });

  it("et kort med en gemt værdi over 1 får den forklaret i wizarden", () => {
    expect(wizard).toMatch(/gemtPrOptjening > 1/);
  });

  it("detaljesiden viser ikke længere 'X stempel/optjening'", () => {
    const d = kilde("src/app/dashboard/loyalitet/programmer/[id]/page.tsx");
    expect(d).not.toMatch(/stempel\/optjening/);
  });
});

describe("databasefelterne er bevaret", () => {
  it("typerne kender stadig kolonnerne", () => {
    const t = readFileSync(join(process.cwd(), "src/lib/types/database.ts"), "utf8");
    for (const felt of [
      "stamps_expire",
      "stamp_expiry_days",
      "amount_per_stamp",
      "earn_model",
      "stamps_per_earn",
      "require_staff_confirm",
    ]) {
      expect(t, felt).toContain(felt);
    }
  });
});
