import { describe, it, expect } from "vitest";
import { safeNextPath, emailOtpType } from "./auth-links";

/**
 * Reglerne for auth-links. De prøves her, fordi begge indgange —
 * /auth/callback og /auth/confirm — læner sig på dem, og et hul ét sted
 * gælder for begge.
 */

describe("safeNextPath", () => {
  it("tillader interne stier", () => {
    expect(safeNextPath("/nulstil-adgangskode")).toBe("/nulstil-adgangskode");
    expect(safeNextPath("/dashboard?fane=standere")).toBe("/dashboard?fane=standere");
  });

  it("afviser absolutte URL'er — ellers var linket en åben viderestilling", () => {
    expect(safeNextPath("https://eksempel.dk")).toBeNull();
    expect(safeNextPath("http://eksempel.dk")).toBeNull();
  });

  it("afviser protokolrelative og backslash-varianter", () => {
    // Begge læses som en fremmed vært af browseren, selvom de starter med /
    expect(safeNextPath("//eksempel.dk")).toBeNull();
    expect(safeNextPath(String.raw`/\eksempel.dk`)).toBeNull();
  });

  it("afviser tom og manglende værdi", () => {
    expect(safeNextPath("")).toBeNull();
    expect(safeNextPath(null)).toBeNull();
    expect(safeNextPath(undefined)).toBeNull();
  });
});

describe("emailOtpType", () => {
  it("accepterer de flows vi sender mails for", () => {
    expect(emailOtpType("recovery")).toBe("recovery");
    expect(emailOtpType("signup")).toBe("signup");
    expect(emailOtpType("email_change")).toBe("email_change");
  });

  it("afviser alt andet, så URL'en ikke kan diktere flowet", () => {
    expect(emailOtpType("phone_change")).toBeNull();
    expect(emailOtpType("noget-andet")).toBeNull();
    expect(emailOtpType("")).toBeNull();
    expect(emailOtpType(null)).toBeNull();
  });
});
