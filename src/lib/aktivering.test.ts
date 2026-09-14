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
  AKTIVERING_TEKSTER,
} from "./aktivering";
import { EMAIL_HAR_KONTO } from "./bestilling-uden-konto";

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

/**
 * DEN KODE, DER BLEV SMIDT VÆK.
 *
 * 14. september 2026 købte en kunde med en e-mail, der allerede havde en
 * konto. Aktiveringen viste kodefeltet alligevel, tog imod koden,
 * knyttede virksomheden til den BESTÅENDE bruger — og smed koden væk uden
 * et ord. Kunden blev sendt til en bar loginskærm og kunne hverken komme
 * ind med den nye kode eller via linket i ordrebekræftelsen.
 *
 * Fejlen kunne ikke ses i en build, og intet i systemet sagde fra. Derfor
 * holdes de tre led fast her: opslaget sker FØR oprettelsen, kodefeltet
 * vises kun i den ene gren, og koden bliver aldrig sat på en konto, der
 * findes i forvejen.
 */
describe("en e-mail, der allerede har en konto", () => {
  const HANDLING = readFileSync(
    join(process.cwd(), "src/app/aktiver/actions.ts"),
    "utf8",
  );
  const FORMULAR = readFileSync(
    join(process.cwd(), "src/components/aktiver-form.tsx"),
    "utf8",
  );

  it("slås op FØR brugeren forsøges oprettet", () => {
    /*
      Rækkefølgen ER rettelsen. Spørges der først bagefter — når
      `createUser` er fejlet — er koden allerede taget imod, og så er der
      ingen skærm tilbage at sige det på.
    */
    const opslag = HANDLING.indexOf("await findKonto(");
    const opret = HANDLING.indexOf("createUser({");
    expect(opslag, "findKonto kaldes slet ikke").toBeGreaterThan(-1);
    expect(opret).toBeGreaterThan(-1);
    expect(opslag).toBeLessThan(opret);
  });

  it("får ALDRIG sin adgangskode overskrevet", () => {
    /*
      Den nærliggende 'rettelse' er at sætte den nye kode på den fundne
      bruger. Det ville gøre tokenet til en måde at overtage en bestående
      konto på — præcis dét, `aktiveringSpaerre` er bygget for at forhindre.
      Der må derfor ikke stå en opdatering af en bruger i filen.
    */
    expect(HANDLING).not.toMatch(/updateUserById/);
  });

  it("bliver ikke bedt om en kode, der ikke kan bruges", () => {
    // Feltet er ikke skjult eller deaktiveret: det tegnes slet ikke.
    expect(FORMULAR).toMatch(/eksisterende \? null : \(/);
    const felt = FORMULAR.indexOf('name="kode"');
    expect(felt).toBeGreaterThan(-1);
    expect(FORMULAR.indexOf("eksisterende ? null : (")).toBeLessThan(felt);
  });

  it("får at vide, at det er den GAMLE kode, der skal bruges", () => {
    /*
      Ordlyden er halvdelen af rettelsen. Siger beskeden ikke HVILKEN kode,
      leder kunden efter en, de aldrig har fået — og så er vi tilbage ved
      den oprindelige fejl med pænere ord.
    */
    for (const tekst of [
      AKTIVERING_TEKSTER.eksisterendeHjaelp,
      AKTIVERING_TEKSTER.knyttet,
    ]) {
      expect(tekst).toMatch(/i forvejen|som du plejer|du bruger/i);
    }

    // Og de må ikke bede om en NY kode — det er hele misforståelsen.
    expect(AKTIVERING_TEKSTER.eksisterendeHjaelp).toMatch(
      /ikke vælge en ny adgangskode/i,
    );
    expect(AKTIVERING_TEKSTER.eksisterendeKnap).not.toMatch(/adgangskode/i);
  });

  it("lander på login MED en besked og ikke på en bar skærm", () => {
    // `redirect("/login")` uden noget efter var dét, kunden mødte.
    expect(HANDLING).toMatch(/"\/login\?besked=knyttet"/);
    expect(HANDLING).not.toMatch(/redirect\("\/login"\)/);

    const SIDE = readFileSync(
      join(process.cwd(), "src/app/(auth)/login/page.tsx"),
      "utf8",
    );
    expect(SIDE).toMatch(/besked === "knyttet"/);
    expect(SIDE).toMatch(/AKTIVERING_TEKSTER\.knyttet/);
  });
});

/**
 * HULLET, DER LOD DET SKE.
 *
 * CVR-spærren i bestillingen uden konto springes over, når feltet er tomt —
 * og feltet er frivilligt. En butiksejer, der bestilte igen uden at udfylde
 * nummeret, fik derfor en HELT NY virksomhed i stedet for at lande på sin
 * egen, og dashboardet viser kun én pr. bruger. Købet blev usynligt.
 */
describe("bestilling med en e-mail, der har en konto", () => {
  const KILDE = readFileSync(
    join(process.cwd(), "src/app/bestil/uden-konto/actions.ts"),
    "utf8",
  );

  it("afvises — og knyttes ikke", () => {
    /*
      AFVIST og ikke tilknyttet: en offentlig formular må aldrig kunne
      hænge en ordre på en eksisterende kundes virksomhed, fordi nogen
      kender deres e-mail. Adresser er ikke verificerede.
    */
    expect(KILDE).toMatch(/EMAIL_HAR_KONTO/);
    expect(KILDE).toMatch(/eksisterende\?\.harVirksomhed/);
  });

  it("afviser KUN, når kontoen også ejer en virksomhed", () => {
    /*
      En slutkunde med et stempelkort har også en konto, men intet
      kundeforhold at lande på. Spærredes de her, kunne de hverken bestille
      her eller inde i systemet — der er ingen tredje vej.
    */
    expect(KILDE).not.toMatch(/if \(eksisterende\) return/);
  });

  it("siger, hvad kunden så skal gøre", () => {
    expect(EMAIL_HAR_KONTO).toMatch(/log ind/i);
    expect(EMAIL_HAR_KONTO).toMatch(/bestil/i);
  });
});
