import { describe, it, expect } from "vitest";
import {
  programVindue,
  programErAktivtNu,
  programEffektivStatus,
  iDagDatoKoebenhavn,
  gyldighed,
  gyldighedTekst,
  dageMellem,
  UDLOEB_VARSEL_DAGE,
} from "./program-status";

const IDAG = "2026-09-11";

describe("programVindue", () => {
  it("er 'aktiv' uden datoer", () => {
    expect(programVindue({ start_date: null, end_date: null }, IDAG)).toBe("aktiv");
  });
  it("er 'foer' før startdatoen", () => {
    expect(programVindue({ start_date: "2026-09-20", end_date: null }, IDAG)).toBe("foer");
  });
  it("er 'efter' dagen EFTER slutdatoen — slutdatoen selv tæller med", () => {
    expect(programVindue({ start_date: null, end_date: "2026-09-11" }, IDAG)).toBe("aktiv");
    expect(programVindue({ start_date: null, end_date: "2026-09-10" }, IDAG)).toBe("efter");
  });
  it("tæller startdatoen selv som inde i vinduet", () => {
    expect(programVindue({ start_date: "2026-09-11", end_date: null }, IDAG)).toBe("aktiv");
  });
});

describe("programErAktivtNu", () => {
  it("kræver BÅDE status aktiv og et åbent vindue", () => {
    const inde = { start_date: "2026-09-01", end_date: "2026-09-30" };
    expect(programErAktivtNu({ status: "active", ...inde }, IDAG)).toBe(true);
    // Rigtigt vindue, men pauset af butikken → ikke aktivt.
    expect(programErAktivtNu({ status: "paused", ...inde }, IDAG)).toBe(false);
    // Aktiv status, men udløbet → ikke aktivt.
    expect(
      programErAktivtNu({ status: "active", start_date: null, end_date: "2026-09-10" }, IDAG),
    ).toBe(false);
    // Aktiv status, men endnu ikke startet → ikke aktivt.
    expect(
      programErAktivtNu({ status: "active", start_date: "2026-10-01", end_date: null }, IDAG),
    ).toBe(false);
  });
});

describe("programEffektivStatus", () => {
  it("lader butikkens eget valg veje tungest", () => {
    const vindue = { start_date: "2026-09-01", end_date: "2026-09-30" };
    expect(programEffektivStatus({ status: "draft", ...vindue }, IDAG)).toBe("kladde");
    expect(programEffektivStatus({ status: "paused", ...vindue }, IDAG)).toBe("pauset");
    expect(programEffektivStatus({ status: "archived", ...vindue }, IDAG)).toBe("arkiveret");
  });
  it("oversætter et aktivt korts datovindue til planlagt/aktiv/udløbet", () => {
    expect(
      programEffektivStatus({ status: "active", start_date: "2026-10-01", end_date: null }, IDAG),
    ).toBe("planlagt");
    expect(
      programEffektivStatus({ status: "active", start_date: null, end_date: null }, IDAG),
    ).toBe("aktiv");
    expect(
      programEffektivStatus({ status: "active", start_date: null, end_date: "2026-09-01" }, IDAG),
    ).toBe("udloebet");
  });
});

describe("iDagDatoKoebenhavn", () => {
  it("giver en YYYY-MM-DD-streng", () => {
    expect(iDagDatoKoebenhavn()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
  it("bruger dansk tid, ikke UTC — et tidspunkt lige efter midnat i DK er allerede næste dag", () => {
    // 2026-06-30 22:30 UTC = 2026-07-01 00:30 i dansk sommertid (UTC+2).
    expect(iDagDatoKoebenhavn(new Date("2026-06-30T22:30:00Z"))).toBe("2026-07-01");
  });
});

/**
 * KORTETS EJER SKAL KUNNE SE SIN EGEN UDLØBSDATO.
 *
 * DET HER FANDTES IKKE, OG DET VAR EN RIGTIG FEJL. Datovinduet håndhæves i
 * `giveStamp()` — et udløbet kort afvises med "Stempelkortet er udløbet" — men
 * beskeden går til PERSONALET ved disken. På kundens kort stod der intet:
 * hverken hvornår det udløb, eller at det var sket. En kunde med otte ud af
 * ti stempler kunne altså samle mod en belønning, der stille løb ud.
 *
 * Reglen ligger her som en ren funktion, fordi kortsiden, "Mine stempelkort"
 * og butikkens egen forhåndsvisning alle skal sige NØJAGTIG det samme. Tre
 * håndskrevne udgaver ville blive til tre forskellige løfter.
 */
describe("gyldighed — hvad kortets ejer får at vide", () => {
  const iDag = "2026-09-15";

  it("siger ingenting, når der ikke er nogen grænse", () => {
    expect(gyldighed({ start_date: null, end_date: null }, iDag)).toBeNull();
  });

  /**
   * EN STARTDATO, DER ER PASSERET, ER IKKE EN OPLYSNING. Kunden er ligeglad
   * med, hvornår butikken satte kortet op — og en linje om noget, der
   * allerede er sket, tager pladsen fra den, der betyder noget.
   */
  it("nævner kun startdatoen, når den ligger forude", () => {
    expect(
      gyldighed({ start_date: "2026-09-01", end_date: null }, iDag),
    ).toBeNull();

    const kommende = gyldighed(
      { start_date: "2026-10-01", end_date: null },
      iDag,
    );
    expect(kommende?.slags).toBe("planlagt");
  });

  it("skelner mellem god tid og noget, der haster", () => {
    // Langt ude: en dato, ikke et varsel.
    expect(
      gyldighed({ start_date: null, end_date: "2026-12-24" }, iDag)?.slags,
    ).toBe("gaelder");

    // Præcis på grænsen skal varsles — det er dét, varslet er til for.
    const graense = new Date(Date.parse(`${iDag}T00:00:00Z`));
    graense.setUTCDate(graense.getUTCDate() + UDLOEB_VARSEL_DAGE);
    expect(
      gyldighed(
        { start_date: null, end_date: graense.toISOString().slice(0, 10) },
        iDag,
      )?.slags,
    ).toBe("snart");
  });

  /**
   * SIDSTE GYLDIGE DAG ER IKKE EN UDLØBET DAG. `programVindue()` bruger
   * `iDag > end_date`, altså er slutdatoen inklusiv — kortet virker HELE den
   * dag. Sagde kortet "udløbet" om morgenen, ville vi tage en dag fra kunden,
   * som disken stadig ville acceptere.
   */
  it("regner slutdatoen som en dag, kortet stadig virker", () => {
    const g = gyldighed({ start_date: null, end_date: iDag }, iDag);
    expect(g?.slags).toBe("snart");
    expect(g?.dage).toBe(0);
    expect(gyldighedTekst(g!, "15. sep. 2026")).toMatch(/sidste dag i dag/i);
  });

  it("siger det højt, når datoen er passeret", () => {
    const g = gyldighed({ start_date: null, end_date: "2026-09-14" }, iDag);
    expect(g?.slags).toBe("udloebet");
    // Beskeden skal sige KONSEKVENSEN og ikke bare datoen: kunden skal forstå,
    // at der ikke kommer flere stempler.
    expect(gyldighedTekst(g!, "14. sep. 2026")).toMatch(/ikke samles flere/i);
  });

  /**
   * DAGE OG IKKE KUN EN DATO, NÅR DET HASTER. "Gælder til 30. november" og
   * "udløber om 3 dage" er to forskellige beskeder, og kun den sidste får
   * nogen til at gå forbi butikken.
   */
  it("tæller dage ned i ental og flertal", () => {
    const iMorgen = gyldighed({ start_date: null, end_date: "2026-09-16" }, iDag)!;
    expect(gyldighedTekst(iMorgen, "16. sep. 2026")).toMatch(/i morgen/i);

    const omTre = gyldighed({ start_date: null, end_date: "2026-09-18" }, iDag)!;
    expect(gyldighedTekst(omTre, "18. sep. 2026")).toMatch(/om 3 dage/i);
  });

  it("tæller dage hen over et månedsskifte", () => {
    expect(dageMellem("2026-09-15", "2026-10-01")).toBe(16);
    expect(dageMellem("2026-09-15", "2026-09-14")).toBe(-1);
  });
});
