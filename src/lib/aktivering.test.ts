import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import {
  aktiveringSpaerre,
  kanAktiveres,
  aktiveringUdloeber,
  erGyldigKode,
  AKTIVERING_DAGE,
  KODE_MINIMUM,
} from "./aktivering";

/**
 * Aktiveringen er dét, der gør en betalt virksomhed til en bestemt persons.
 *
 * Prøverne her er ikke en formalitet: svarer `aktiveringSpaerre` forkert, kan
 * enten en fremmed overtage en betalende kundes virksomhed, eller en kunde,
 * der lige har betalt, kan ikke komme ind i det, de har købt. Begge dele er
 * usynlige i en build.
 */

const HEL = {
  user_id: null,
  aktivering_token: "a".repeat(64),
  aktivering_udloeber: new Date("2026-10-09T12:00:00Z").toISOString(),
};
const NU = new Date("2026-09-09T12:00:00Z");

describe("aktiveringSpaerre", () => {
  it("lukker igennem, når tokenet er gyldigt og der ingen ejer er", () => {
    expect(aktiveringSpaerre(HEL, NU)).toBeNull();
    expect(kanAktiveres(HEL, NU)).toBe(true);
  });

  /**
   * EN EJER SLÅR ALT. Også et token, der stadig gælder — ellers ville et
   * gammelt link fra en indbakke kunne overtage en konto, der er i brug.
   * Rækkefølgen i funktionen er derfor ikke tilfældig.
   */
  it("afviser, når virksomheden allerede har en ejer", () => {
    expect(aktiveringSpaerre({ ...HEL, user_id: "bruger-1" }, NU)).toBe(
      "allerede-aktiveret",
    );
  });

  it("afviser uden token", () => {
    expect(aktiveringSpaerre({ ...HEL, aktivering_token: null }, NU)).toBe(
      "intet-token",
    );
    expect(aktiveringSpaerre(null, NU)).toBe("intet-token");
  });

  /** Et token uden udløb er et token, der aldrig holder op med at virke. */
  it("afviser, når udløbet mangler eller ikke kan læses", () => {
    expect(aktiveringSpaerre({ ...HEL, aktivering_udloeber: null }, NU)).toBe(
      "udloebet",
    );
    expect(
      aktiveringSpaerre({ ...HEL, aktivering_udloeber: "i går" }, NU),
    ).toBe("udloebet");
  });

  it("afviser et udløbet token", () => {
    const forGammelt = {
      ...HEL,
      aktivering_udloeber: new Date("2026-09-09T11:59:59Z").toISOString(),
    };
    expect(aktiveringSpaerre(forGammelt, NU)).toBe("udloebet");
  });

  /** Præcis på sekundet er det udløbet — grænsen skal ligge ét sted. */
  it("regner selve udløbsøjeblikket som for sent", () => {
    expect(
      aktiveringSpaerre({ ...HEL, aktivering_udloeber: NU.toISOString() }, NU),
    ).toBe("udloebet");
  });
});

describe("aktiveringUdloeber", () => {
  it("giver de dage, der er lovet", () => {
    const udloeb = aktiveringUdloeber(NU);
    const dage = Math.round(
      (udloeb.getTime() - NU.getTime()) / (1000 * 60 * 60 * 24),
    );
    expect(dage).toBe(AKTIVERING_DAGE);
  });

  /**
   * VINDUET SKAL DÆKKE LEVERINGEN. Skiltet er 3-5 hverdage om at komme frem,
   * og en del kunder sætter sig først med opsætningen, når det står på
   * disken. Et vindue på under to uger ville ramme netop dem.
   */
  it("er langt nok til at skiltet kan nå frem først", () => {
    expect(AKTIVERING_DAGE).toBeGreaterThanOrEqual(14);
  });
});

describe("adgangskoden", () => {
  it("kræver samme længde som /signup", () => {
    expect(erGyldigKode("a".repeat(KODE_MINIMUM))).toBe(true);
    expect(erGyldigKode("a".repeat(KODE_MINIMUM - 1))).toBe(false);
    expect(erGyldigKode("")).toBe(false);
    expect(erGyldigKode(null)).toBe(false);
  });

  /**
   * TO KRAV TO STEDER ER VÆRRE END ÉT. Afviste vi her en kode, `/signup`
   * ville tage imod, kunne kunden ikke se hvorfor. Grænsen læses derfor ud af
   * signup-handlingen og sammenlignes.
   */
  it("er den samme grænse, som signup håndhæver", () => {
    const kilde = readFileSync(
      join(process.cwd(), "src/app/(auth)/actions.ts"),
      "utf8",
    );
    const m = kilde.match(/password\.length\s*<\s*(\d+)/);
    expect(m, "signup validerer ikke længere kodens længde").not.toBeNull();
    expect(Number(m![1])).toBe(KODE_MINIMUM);
  });
});

/**
 * TOKENET SKAL VÆK, NÅR VIRKSOMHEDEN SLETTES.
 *
 * Et gyldigt aktiveringstoken på en slettet virksomhed er en åben dør til en
 * tom skal — `sletning_token` nulstilles allerede af præcis samme grund.
 * Prøves i migrationerne, fordi sletningen sker i databasen.
 */
describe("sletterutinen rydder aktiveringen", () => {
  it("nulstiller token og udløb", () => {
    const dir = join(process.cwd(), "supabase/migrations");
    let nyeste: string | null = null;
    for (const f of readdirSync(dir).filter((f) => f.endsWith(".sql")).sort()) {
      const sql = readFileSync(join(dir, f), "utf8");
      const i = sql.indexOf(
        "create or replace function public.slet_virksomhedens_data",
      );
      if (i !== -1) nyeste = sql.slice(i);
    }
    expect(nyeste).not.toBeNull();
    for (const kolonne of ["aktivering_token", "aktivering_udloeber"]) {
      expect(nyeste!, `${kolonne} nulstilles ikke`).toMatch(
        new RegExp(`\\b${kolonne}\\s+=\\s*null`),
      );
    }
  });
});

/**
 * EFTER AKTIVERINGEN SKAL DE STÅ VED STANDEREN — ikke ved en liste.
 *
 * Standeren er oprettet af købet og mangler kun ét: hvor QR-koden skal føre
 * hen. Det er hele grunden til, at kunden er der, og en liste med præcis ét
 * element er et ekstra klik, der kun kan gøre skade.
 */
describe("hvor aktiveringen lander", () => {
  const KILDE = readFileSync(
    join(process.cwd(), "src/app/aktiver/actions.ts"),
    "utf8",
  );

  it("sender kunden til standerens egen side", () => {
    expect(KILDE).toMatch(/\/dashboard\/standere\/\$\{/);
  });

  /** Med nul eller flere standere skal der falles tilbage på listen. */
  it("falder tilbage på listen, når der ikke er præcis én", () => {
    expect(KILDE).toMatch(/standere\?\.length === 1/);
    expect(KILDE).toMatch(/"\/dashboard\/standere"/);
  });
});
