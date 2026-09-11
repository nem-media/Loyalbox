import { describe, it, expect } from "vitest";
import {
  programVindue,
  programErAktivtNu,
  programEffektivStatus,
  iDagDatoKoebenhavn,
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
