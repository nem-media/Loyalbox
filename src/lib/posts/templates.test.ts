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

import {
  customBackground,
  farveLyshed,
  normaliserPostFarve,
  EGEN_FARVE_ID,
  POST_BACKGROUNDS,
} from "./templates";

describe("egen farve", () => {
  it("skriver med hvidt på en mørk farve og navy på en lys", () => {
    const moerk = customBackground("#101820");
    expect(moerk.ink).toBe("#ffffff");
    const lys = customBackground("#f3f0e8");
    expect(lys.ink).toBe("#19375c");
  });

  it("bruger den valgte farve som baggrund og har id 'egen'", () => {
    const b = customBackground("#1B916A");
    expect(b.bgColor).toBe("#1b916a");
    expect(b.id).toBe(EGEN_FARVE_ID);
  });

  it("falder tilbage på navy ved ugyldig hex", () => {
    expect(normaliserPostFarve("ikke-en-farve")).toBe("#19375c");
    expect(customBackground("###").bgColor).toBe("#19375c");
  });

  it("farveLyshed: sort < hvid", () => {
    expect(farveLyshed("#000000")).toBeLessThan(farveLyshed("#ffffff"));
  });
});

describe("de faste baggrunde", () => {
  it("har unikke id'er og hver sin ink/starColor", () => {
    const ids = POST_BACKGROUNDS.map((b) => b.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const b of POST_BACKGROUNDS) {
      expect(b.bgColor || b.bgImage, b.id).toBeTruthy();
      expect(b.ink, b.id).toBeTruthy();
    }
  });
});
