import { describe, it, expect } from "vitest";
import { renderCaption } from "./templates";

describe("renderCaption", () => {
  it("fletter alle felter ind", () => {
    const out = renderCaption(
      `"{anmeldelse}" — tak, {firmanavn}! ({antal} anmeldelser)`,
      { firmanavn: "Café Sol", anmeldelse: "Skøn kaffe", antal: 42 },
    );
    expect(out).toBe(`"Skøn kaffe" — tak, Café Sol! (42 anmeldelser)`);
  });

  it("fjerner tomme citationstegn og hængende bindestreg ved tom anmeldelse", () => {
    const out = renderCaption(`⭐️ "{anmeldelse}" — tusind tak!`, {
      firmanavn: "X",
      anmeldelse: "",
    });
    // "" fjernes, ⭐️ beholdes (emojis til), hængende "—" i starten trimmes efter stjernen
    expect(out).not.toContain('""');
    expect(out).toContain("tusind tak!");
  });

  it("stripper emojis når emojis=false", () => {
    const out = renderCaption(`Tak 🙏 for alt ⭐️`, { firmanavn: "X" }, { emojis: false });
    expect(out).toBe("Tak for alt");
  });

  it("fjerner ⭐-emojis med stripStars (men beholder andre emojis)", () => {
    const out = renderCaption(`⭐️⭐️⭐️⭐️⭐️ Tak! 🙏`, { firmanavn: "X" }, { stripStars: true });
    expect(out).not.toContain("⭐");
    expect(out).toContain("🙏");
    expect(out).toContain("Tak!");
  });

  it("bruger fallback for tomt firmanavn og manglende antal", () => {
    const out = renderCaption(`{antal} tak fra {firmanavn}`, { firmanavn: "  " });
    expect(out).toBe("mange tak fra os");
  });

  it("rydder dobbelte mellemrum og mellemrum før tegn", () => {
    const out = renderCaption(`Hej  {anmeldelse} !`, { firmanavn: "X", anmeldelse: "" });
    expect(out).toBe("Hej!");
  });
});
