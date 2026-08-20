import { describe, it, expect } from "vitest";
import { erForaeldet, type DriftRaekke } from "./drift";

/**
 * Det, der er værd at teste her, er ikke om en fejl bliver skrevet ned — det
 * ville være at teste Supabase. Det er om STILHED bliver opdaget: en opgave,
 * der er holdt op med at køre, siger ikke selv fra, og en grænse, der er sat
 * forkert, lader den gemme sig.
 */
function raekke(timerSiden: number, ok = true): DriftRaekke {
  return {
    opgave: "oprydning",
    ok,
    resultat: null,
    besked: null,
    created_at: new Date(Date.now() - timerSiden * 3_600_000).toISOString(),
  };
}

describe("erForaeldet", () => {
  it("regner en manglende linje som forældet", () => {
    // Har en opgave aldrig kørt, er det ikke "ingen data" — det er en fejl.
    expect(erForaeldet(null, 36)).toBe(true);
  });

  it("accepterer en kørsel inden for grænsen", () => {
    expect(erForaeldet(raekke(4), 36)).toBe(false);
    expect(erForaeldet(raekke(35), 36)).toBe(false);
  });

  it("fanger en opgave, der er holdt op med at køre", () => {
    expect(erForaeldet(raekke(37), 36)).toBe(true);
    expect(erForaeldet(raekke(24 * 30), 36)).toBe(true);
  });

  it("ser på alderen og ikke på om kørslen gik godt", () => {
    // En gammel SUCCES er stadig et problem: den betyder, at intet er sket
    // siden. Fejlede-tilstanden håndteres for sig, med sin egen besked.
    expect(erForaeldet(raekke(48, true), 36)).toBe(true);
    expect(erForaeldet(raekke(2, false), 36)).toBe(false);
  });

  it("giver en døgnkørsel plads til at blive forsinket", () => {
    // Grænsen er 36 timer for en opgave, der kører hver nat kl. 3. En kørsel,
    // der er et par timer forsinket, må ikke slå ud som nedbrud — men to
    // sprungne nætter skal.
    expect(erForaeldet(raekke(26), 36)).toBe(false);
    expect(erForaeldet(raekke(50), 36)).toBe(true);
  });
});
