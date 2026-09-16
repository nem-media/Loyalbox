import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * EN FORMULAR, DER TØMMER SIG SELV VED EN FEJL.
 *
 * React nulstiller en formular, når en server action svarer — også når svaret
 * er en afvisning. Det var kendt og løst ét sted (`kontakt-form.tsx`, hvor
 * `state.udfyldt` + `defaultValue` blev opfundet til netop dette), og
 * `/bestil/uden-konto` har sin egen udgave for filfeltet. Søskendeformularerne
 * blev stående — femte gang samme lektie.
 *
 * MÅLT I BRUGERFLADEN 2026-09-16: ét forkert ciffer i CVR på `/signup` tømte
 * **alle fire felter** — firmanavn, CVR, e-mail og adgangskode — mens
 * fejlbeskeden bad brugeren "tjekke de otte cifre", altså rette et felt, der
 * ikke længere stod der. Det er den første skærm en ny kunde møder.
 *
 * ADGANGSKODER LÆGGES ALDRIG TILBAGE. De skulle i så fald sendes retur gennem
 * svaret og ligge i browserens hukommelse som almindelig tekst — og en kode er
 * billig at taste igen. Prøven håndhæver BEGGE dele: at felterne huskes, og at
 * koden ikke gør.
 *
 * DE ØVRIGE FORMULARER ER IKKE RETTET MED VILJE: en enkelt `name`-linje i
 * admin eller "opret stander" koster ét ord at taste igen. Listen her er dem,
 * hvor tabet er flere felter eller en kunde, der står og venter.
 */

const udenKommentarer = (s: string) =>
  s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1");

const kilde = (sti: string) =>
  udenKommentarer(readFileSync(join(process.cwd(), sti), "utf8"));

/** Formular → de felter, der SKAL lægges tilbage efter en afvisning. */
const SKAL_HUSKE: Record<string, string[]> = {
  "src/app/(auth)/signup/signup-form.tsx": ["company_name", "cvr", "email"],
  "src/app/(auth)/login/login-form.tsx": ["email"],
  "src/app/dashboard/loyalitet/kunder/ny/enroll-form.tsx": [
    "name",
    "email",
    "phone",
    "program_id",
  ],
  "src/app/dashboard/loyalitet/rabatter/ny/discount-form.tsx": [
    "name",
    "value",
    "description",
    "min_purchase",
    "per_customer_limit",
  ],
  "src/components/kontakt-form.tsx": ["navn", "email", "telefon", "besked"],
};

describe("formularen husker, hvad der blev skrevet", () => {
  for (const [sti, felter] of Object.entries(SKAL_HUSKE)) {
    const KODE = kilde(sti);

    for (const felt of felter) {
      it(`${sti.split("/").pop()} lægger ${felt} tilbage`, () => {
        // Feltet skal findes...
        const m = new RegExp(`name="${felt}"`).exec(KODE);
        expect(m, `feltet ${felt} findes ikke`).not.toBeNull();
        // ...og elementet, det står i, skal have en defaultValue fra svaret.
        const start = KODE.lastIndexOf("<", m!.index);
        const slut = KODE.indexOf(">", m!.index);
        const element = KODE.slice(start, slut);
        expect(
          element,
          `${felt} har ingen defaultValue fra state.udfyldt — ` +
            "React tømmer feltet, når handlingen svarer",
        ).toMatch(/defaultValue=\{[^}]*udfyldt/);
      });
    }
  }
});

describe("en adgangskode sendes aldrig retur", () => {
  it("ingen formular lægger et kodefelt tilbage", () => {
    for (const sti of Object.keys(SKAL_HUSKE)) {
      const KODE = kilde(sti);
      for (const m of KODE.matchAll(/<[^>]*type="password"[^>]*>/g)) {
        expect(
          m[0],
          `${sti}: en adgangskode må ikke gennem svaret`,
        ).not.toMatch(/defaultValue|value=\{/);
      }
    }
  });

  it("handlingerne putter ikke password i udfyldt", () => {
    for (const sti of [
      "src/app/(auth)/actions.ts",
      "src/app/dashboard/loyalitet/actions.ts",
    ]) {
      const KODE = kilde(sti);
      for (const m of KODE.matchAll(/const udfyldt = [\s\S]{0,400}?;\n/g)) {
        expect(m[0], `${sti}: password i udfyldt`).not.toMatch(
          /\bpassword\b/,
        );
      }
    }
  });
});
