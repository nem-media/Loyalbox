import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * PLATFORMSEKTIONEN ER FORSIDENS LØFTE OM, HVAD PRODUKTET ER.
 *
 * Den er derfor også det sted, hvor en funktion, vi ikke har, gør mest skade:
 * en besøgende læser den som en beskrivelse, ikke som en illustration. To ting
 * var faktisk gledet ind:
 *
 *   1. Feedback-mockuppen viste "Bonusstempel sendt" som svar på en
 *      tilbagemelding. Der sendes ingenting automatisk; et stempel gives ved
 *      disken af et menneske.
 *   2. Indsigt-mockuppen tegnede et søjlediagram over "aktivitet de seneste 6
 *      måneder". Der findes ingen tidsserie nogen steder i produktet.
 *
 * Begge så rigtige ud, fordi resten af kortet var rigtigt. Prøverne her leder
 * efter netop den slags — og efter at loyalitetsfanen bliver ved med at nævne
 * BEGGE former, som er dét, der er blevet glemt hver gang før.
 */

const SEKTION = "src/components/home/platform-showcase.tsx";

const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/^\s*\/\/.*$/gm, "");

/** Fanernes egne tekster, læst ud af kilden. */
function faner() {
  const s = kilde(SEKTION);
  const blok = s.slice(s.indexOf("const TABS"), s.indexOf("function Raekke"));
  return [...blok.matchAll(/key:\s*"(\w+)",[\s\S]*?punkter:\s*\[([\s\S]*?)\],/g)].map(
    (m) => ({
      key: m[1],
      /* Hele fanens tekst — overskrift, brødtekst og punkter under ét. */
      tekst: m[0].toLowerCase(),
      punkter: [...m[2].matchAll(/"([^"]+)"/g)].map((p) => p[1]),
    }),
  );
}

describe("platformsektionen", () => {
  it("alle fem områder har punkter", () => {
    const f = faner();
    expect(f).toHaveLength(5);
    for (const fane of f) {
      expect(fane.punkter.length, `${fane.key} har punkter`).toBeGreaterThanOrEqual(3);
      for (const p of fane.punkter) {
        /* Et punkt, der er længere end en linje, bliver ikke skimmet — og
           punkterne findes netop for at kunne skimmes. */
        expect(p.length, `punktet "${p}" er for langt til at skimme`).toBeLessThan(
          70,
        );
      }
    }
  });

  it("loyalitetsområdet nævner begge former", () => {
    /* Den halvdel, der mangler, er hver gang pointprogrammet — og det er
       netop den form, en forretning med sjældne eller ujævne køb skal bruge. */
    const loyalitet = faner().find((f) => f.key === "loyalitet");
    expect(loyalitet, "fanen findes").toBeTruthy();
    expect(loyalitet!.tekst, "nævner stempelkortet").toMatch(/stempel/);
    expect(loyalitet!.tekst, "nævner pointprogrammet").toMatch(/point/);
  });

  it("billedet under loyalitet viser også begge former", () => {
    /* En tekst, der siger begge dele, ved siden af et billede, der viser den
       ene, er stadig et halvt svar — og billedet er dét, der bliver set. */
    const s = kilde(SEKTION);
    const mock = s.slice(s.indexOf("function LoyaltyMock"), s.indexOf("function SocialMock"));
    expect(mock, "pointsaldoen er med").toMatch(/point/i);
    expect(mock, "stempelkortet er med").toMatch(/stempel/i);
  });

  it("der loves ingen automatik som svar på en tilbagemelding", () => {
    /*
     * "Bonusstempel sendt" stod som en chip ved siden af "Besvaret" og lignede
     * noget, systemet gjorde selv. Prøven leder efter ordet frem for efter
     * chippen: skrives den om til "Rabat sendt" eller "Point tildelt", er det
     * den samme påstand.
     */
    const s = kilde(SEKTION).toLowerCase();
    for (const ord of ["bonusstempel", "sendt automatisk", "automatisk svar"]) {
      expect(s, `sektionen lover "${ord}"`).not.toContain(ord);
    }
  });

  it("der tegnes ingen graf, produktet ikke har", () => {
    /*
     * Tidsserien er den farlige: en række søjler over "de seneste 6 måneder"
     * er umulig at skelne fra en funktion. Det eneste diagram, vi HAR, er
     * stjernefordelingen — og mockuppen bruger den samme komponent, kunden
     * møder i panelet, så de to ikke kan komme til at vise hver sit.
     */
    const s = kilde(SEKTION);
    expect(s.toLowerCase(), "tidsserie over måneder").not.toMatch(
      /seneste \d+ m[åa]neder/,
    );
    expect(s, "fordelingen tegnes med panelets egen komponent").toContain(
      "FordelingSoejler",
    );
  });

  it("mockuppen er mærket som en illustration", () => {
    /* Tallene er eksempler, og det skal stå. Uden linjen er kortet en
       påstand om en bestemt butiks resultater. */
    const s = kilde(SEKTION);
    expect(s).toMatch(/Tal og indhold er eksempler/);
  });
});
