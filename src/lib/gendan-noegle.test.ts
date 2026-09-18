import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createHmac } from "node:crypto";
import {
  lavGendanNoegle,
  laesGendanNoegle,
  GENDAN_LEVETID_MS,
} from "@/lib/gendan-noegle";

/**
 * NØGLEN TIL EN FORTRUDT BESTILLING UDEN KONTO.
 *
 * Adressen, kunden får med hjem fra Stripe, åbner en formular med firmanavn,
 * CVR, mail, farver og logo. Uden signaturen ville et gættet UUID i adressen
 * være nok til at læse en fremmed butiks oplysninger — der er ingen konto at
 * kontrollere ejerskabet imod, og dét er hele grunden til, at nøglen findes.
 *
 * PRØVEN GÅR EFTER EGENSKABEN OG IKKE FORMATET: at en nøgle, vi selv har
 * udstedt, kan læses igen, og at ALT andet giver null. Skifter kodningen en
 * dag, skal prøven blive stående.
 */

const DESIGN = "11111111-1111-4111-8111-111111111111";
const FIRMA = "22222222-2222-4222-8222-222222222222";

let oprindelig: string | undefined;

beforeEach(() => {
  oprindelig = process.env.SUPABASE_SERVICE_ROLE_KEY;
  process.env.SUPABASE_SERVICE_ROLE_KEY = "hemmelighed-til-proeven";
});

afterEach(() => {
  if (oprindelig === undefined) delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  else process.env.SUPABASE_SERVICE_ROLE_KEY = oprindelig;
});

describe("gendan-nøglen", () => {
  it("kan læses igen med det, den blev lavet af", () => {
    const noegle = lavGendanNoegle({ designId: DESIGN, companyId: FIRMA });
    expect(laesGendanNoegle(noegle)).toEqual({
      designId: DESIGN,
      companyId: FIRMA,
    });
  });

  it("holder, så længe betalingssessionen kunne have levet", () => {
    const nu = Date.UTC(2026, 8, 18, 12, 0, 0);
    const noegle = lavGendanNoegle({ designId: DESIGN, companyId: FIRMA }, nu);

    // Et sekund før fristen: stadig gyldig.
    expect(laesGendanNoegle(noegle, nu + GENDAN_LEVETID_MS - 1000)).not.toBeNull();
    // Et sekund efter: væk.
    expect(laesGendanNoegle(noegle, nu + GENDAN_LEVETID_MS + 1000)).toBeNull();
  });

  /*
   * DET FARLIGE TILFÆLDE. Kunden har sin egen gyldige nøgle og prøver at
   * skrive et andet design-id ind i den. Signaturen dækker nyttelasten, så
   * enhver ændring af den slår nøglen ihjel.
   */
  it("kan ikke peges på et andet design", () => {
    const noegle = lavGendanNoegle({ designId: DESIGN, companyId: FIRMA });
    const [nyttelast, sig] = noegle.split(".");

    const andet = Buffer.from(
      JSON.stringify({
        d: "99999999-9999-4999-8999-999999999999",
        c: FIRMA,
        u: Math.floor((Date.now() + GENDAN_LEVETID_MS) / 1000),
      }),
      "utf8",
    ).toString("base64url");

    expect(nyttelast).not.toBe(andet);
    expect(laesGendanNoegle(`${andet}.${sig}`)).toBeNull();
  });

  it("kan ikke få forlænget sin egen frist", () => {
    const nu = Date.UTC(2026, 8, 18, 12, 0, 0);
    const noegle = lavGendanNoegle({ designId: DESIGN, companyId: FIRMA }, nu);
    const sig = noegle.split(".")[1];
    const laengere = Buffer.from(
      JSON.stringify({ d: DESIGN, c: FIRMA, u: 4102444800 }),
      "utf8",
    ).toString("base64url");

    expect(laesGendanNoegle(`${laengere}.${sig}`, nu)).toBeNull();
  });

  it("afvises, når signaturen er en anden", () => {
    const noegle = lavGendanNoegle({ designId: DESIGN, companyId: FIRMA });
    const nyttelast = noegle.split(".")[0];
    expect(laesGendanNoegle(`${nyttelast}.AAAA`)).toBeNull();
    expect(laesGendanNoegle(`${nyttelast}.`)).toBeNull();
    expect(laesGendanNoegle(nyttelast)).toBeNull();
  });

  /*
   * FORMÅLET ER EN DEL AF SIGNATUREN. Kommer den samme hemmelighed en dag til
   * at signere noget andet, må de to slags nøgler ikke kunne byttes om.
   */
  it("afvises, når den er signeret til et andet formål", () => {
    const raa = Buffer.from(
      JSON.stringify({
        d: DESIGN,
        c: FIRMA,
        u: Math.floor((Date.now() + GENDAN_LEVETID_MS) / 1000),
      }),
      "utf8",
    ).toString("base64url");

    const fremmed = createHmac("sha256", "hemmelighed-til-proeven")
      .update(`et-andet-formaal.${raa}`)
      .digest()
      .toString("base64url");

    expect(laesGendanNoegle(`${raa}.${fremmed}`)).toBeNull();
  });

  it("afvises, når hemmeligheden er en anden", () => {
    const noegle = lavGendanNoegle({ designId: DESIGN, companyId: FIRMA });
    process.env.SUPABASE_SERVICE_ROLE_KEY = "en-helt-anden-hemmelighed";
    expect(laesGendanNoegle(noegle)).toBeNull();
  });

  it("siger nej til tomt og til vrøvl", () => {
    expect(laesGendanNoegle(null)).toBeNull();
    expect(laesGendanNoegle(undefined)).toBeNull();
    expect(laesGendanNoegle("")).toBeNull();
    expect(laesGendanNoegle(".")).toBeNull();
    expect(laesGendanNoegle("ikke en nøgle")).toBeNull();
    expect(laesGendanNoegle(`${Buffer.from("ikke json").toString("base64url")}.x`))
      .toBeNull();
  });

  /*
   * UDEN HEMMELIGHED SKAL DET LARME VED UDSTEDELSEN og tie ved læsningen.
   * En adresse, der ser rigtig ud og aldrig virker, er værre end en fejl i
   * bestillingen, hvor der står nogen og kigger.
   */
  it("kaster uden hemmelighed — men læser roligt null", () => {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
    expect(() => lavGendanNoegle({ designId: DESIGN, companyId: FIRMA })).toThrow();
    expect(laesGendanNoegle("hvadsomhelst.her")).toBeNull();
  });
});
