import { describe, it, expect } from "vitest";
import {
  readPermissions,
  normalizeEmail,
  isEmail,
  permissionSummary,
  PERMISSION_FIELDS,
} from "./employees";

describe("readPermissions", () => {
  it("læser afkrydsede felter som true", () => {
    const form = new FormData();
    form.set("can_stamp", "on");
    form.set("can_redeem", "on");
    expect(readPermissions(form)).toEqual({
      can_stamp: true,
      can_redeem: true,
      can_discount: false,
    });
  });

  it("sætter fravalgte felter eksplicit til false", () => {
    // Et fravalgt afkrydsningsfelt sendes slet ikke med. Returnerede vi bare
    // de felter, der var i formularen, ville en FJERNET rettighed blive
    // stående i databasen — medarbejderen ville beholde adgangen.
    const tom = readPermissions(new FormData());
    expect(tom).toEqual({
      can_stamp: false,
      can_redeem: false,
      can_discount: false,
    });
    for (const f of PERMISSION_FIELDS) {
      expect(Object.keys(tom)).toContain(f.name);
    }
  });

  it("giver aldrig can_manage — medarbejdere må ikke tilføje andre", () => {
    const form = new FormData();
    form.set("can_manage", "on");
    expect(Object.keys(readPermissions(form))).not.toContain("can_manage");
  });
});

describe("normalizeEmail", () => {
  it("trimmer og sænker, så samme adresse ikke oprettes to gange", () => {
    expect(normalizeEmail("  Anne@Eksempel.DK ")).toBe("anne@eksempel.dk");
  });
});

describe("isEmail", () => {
  it("accepterer almindelige adresser", () => {
    expect(isEmail("anne@eksempel.dk")).toBe(true);
    expect(isEmail("anne.b+job@under.eksempel.dk")).toBe(true);
  });

  it("afviser det der tydeligvis ikke er en adresse", () => {
    expect(isEmail("anne")).toBe(false);
    expect(isEmail("anne@eksempel")).toBe(false);
    expect(isEmail("anne @eksempel.dk")).toBe(false);
    expect(isEmail("")).toBe(false);
  });
});

describe("permissionSummary", () => {
  it("skriver rettighederne i et læseligt sprog", () => {
    expect(
      permissionSummary({ can_stamp: true, can_redeem: true, can_discount: false }),
    ).toBe("Må give stempler og indløse belønninger");
    expect(
      permissionSummary({ can_stamp: true, can_redeem: false, can_discount: false }),
    ).toBe("Må give stempler");
  });

  it("siger det ligeud, når der ingen rettigheder er", () => {
    expect(
      permissionSummary({ can_stamp: false, can_redeem: false, can_discount: false }),
    ).toBe("Ingen rettigheder");
  });
});
