import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";

/**
 * DE OFFENTLIGE SIDER SKAL VÆRE ÉN SIDE, IKKE SYV.
 *
 * Dashboardet fik hele den visuelle modernisering; salgssiderne fik den i to
 * omgange og ikke alle sammen. Det kunne ses ved at klikke fra /stempelkort
 * til /loyalitetsprogram: samme hus, men den ene havde hårlinjer mellem
 * sektionerne, voksende overskrifter og kort, der lå på noget, og den anden
 * havde ingen af delene.
 *
 * Prøverne her er RYTMEN og ikke udseendet. De siger ikke, hvordan en side
 * skal se ud — de siger, at siderne skal svare hinanden, for det er dét, en
 * ny side glemmer.
 */

const SIDER = [
  "src/app/page.tsx",
  "src/app/stempelkort/page.tsx",
  "src/app/reviewstander/page.tsx",
  "src/app/loyalitetsprogram/page.tsx",
  "src/app/loyalsum-komplet-online/page.tsx",
  /* /kontakt stod UDEN FOR rytmen i et år: ingen hero, ingen
     sektionsgrunde, ingen hårlinjer og ikke ét ikon — én hvid flade fra
     header til footer. Den står her nu, fordi de tre regler er lige så
     rigtige for en kontaktside som for en salgsside, og fordi netop den
     slags side er dén, en ombygning glemmer. */
  "src/app/kontakt/page.tsx",
];

/* Kilden uden kommentarer. Filerne her citerer med vilje den kode, de
   forklarer, så en prøve mod den rå tekst også består, når kaldet er slettet
   og forklaringen står tilbage. Samme regel som resten af huset. */
const kilde = (sti: string) =>
  readFileSync(sti, "utf8")
    .replace(/\{\/\*[\s\S]*?\*\/\}/g, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/^\s*\/\/.*$/gm, "");

const sektioner = (s: string) =>
  [...s.matchAll(/<section\s+[^>]*className="([^"]+)"/g)].map((m) => m[1]);

describe("de offentlige siders rytme", () => {
  for (const sti of SIDER) {
    const navn = sti.replace("src/app/", "/").replace("/page.tsx", "") || "/";

    it(`${navn}: en lys sektion har både hårlinje og varmt skær`, () => {
      /*
       * `bg-muted-bg` er den råhvide sektionsgrund. To ting følger ALTID med:
       * `border-t border-border`, så sektionen har en kant mod den hvide over
       * den, og `sektion-skaer`, som er beigen i 9 % øverst. Uden skæret er feltet
       * en flad grå — og forskellen på en flade og et fotografi er netop, at
       * lyset kommer et sted fra.
       */
      const lyse = sektioner(kilde(sti)).filter((k) =>
        k.includes("bg-muted-bg"),
      );
      expect(lyse.length, `${navn} har lyse sektioner`).toBeGreaterThan(0);
      for (const k of lyse) {
        expect(k, `lys sektion uden sektion-skaer: ${k}`).toContain("sektion-skaer");
        expect(k, `lys sektion uden hårlinje: ${k}`).toContain("border-t");
      }
    });

    it(`${navn}: sektionsoverskrifterne vokser med skærmen`, () => {
      /*
       * `text-2xl` alene er den gamle skala. Fanger BÅDE den og en `<h2>` helt
       * uden skala — en sektionsoverskrift, der arver brødtekstens størrelse,
       * er lige så meget en fejl.
       */
      const h2 = [...kilde(sti).matchAll(/<h2\s+className="([^"]+)"/g)].map(
        (m) => m[1],
      );
      expect(h2.length, `${navn} har sektionsoverskrifter`).toBeGreaterThan(0);
      for (const k of h2) {
        expect(
          /text-(2xl|3xl)/.test(k) && /sm:text-(3xl|4xl)/.test(k),
          `overskrift uden voksende skala: ${k}`,
        ).toBe(true);
      }
    });
  }

  it("et ikon i et felt er duotone, aldrig en streg", () => {
    /*
     * DEN DYRE FEJL, OG DEN ENESTE DER IKKE KAN SES I KODEN. `IkonChip` tager
     * hvilken som helst komponent med en `className`, så et stregikon passer
     * perfekt — det typechecker, det bygger, og det ser først forkert ud i
     * browseren, hvor en streg på 1,7 px i et 44 px felt er en skygge af et
     * ikon. Reglen står i AGENTS.md; her er den håndhævet.
     *
     * PRØVEN FØLGER FELTET OG IKKE FILEN. Første udgave krævede, at HVER
     * `Icon:` i en fil var duotone, og den fejlede med det samme på
     * /loyalitetsprogram — hvor funktionslisten med vilje står som frie
     * streger UDEN felt, præcis som reglen tillader. Den prøvede altså sin
     * egen antagelse og ville have tvunget en rigtig side til at blive
     * forkert for at bestå. Egenskaben er "et ikon I ET FELT": fra
     * `<IkonChip icon={x.Icon}>` findes `x`, listen bag den slås op, og kun
     * DEN listes poster læses.
     */
    let feltbrug = 0;

    for (const sti of [...SIDER, "src/app/dashboard/page.tsx"]) {
      const s = kilde(sti);

      /* Direkte: <IkonChip icon={ScanDuo} /> */
      for (const m of s.matchAll(/<IkonChip[^>]*\sicon=\{(\w+)\}/g)) {
        feltbrug++;
        expect(m[1], `${sti}: ${m[1]} står i et ikonfelt`).toMatch(/Duo$/);
      }

      /* Gennem en liste: {LISTE.map((x) => … <IkonChip icon={x.Icon} …)} */
      for (const m of s.matchAll(/<IkonChip[^>]*\sicon=\{(\w+)\.(\w+)\}/g)) {
        const variabel = m[1];
        const felt = m[2];

        /*
          OPSLAGET ER TEKST OG IKKE ET REGULÆRT UDTRYK. Et dynamisk
          `new RegExp` skal bære sine egne bagstreger gennem en
          strengliteral, og de to lag er blevet uenige én gang for meget.
          `indexOf` kan det samme her og kan ikke misforstås.
        */
        /*
          OPSLAGET ER TEKST OG IKKE ET REGULÆRT UDTRYK. Et dynamisk
          `new RegExp` skal bære sine egne bagstreger gennem en strengliteral,
          og de to lag blev uenige én gang for meget. `indexOf` kan det samme
          her og kan ikke misforstås.
        */
        const naal = ".map((" + variabel;
        let kaldet = -1;
        for (let k = s.indexOf(naal); k !== -1; k = s.indexOf(naal, k + 1)) {
          /* `.map((s` må ikke ramme `.map((section`: tegnet efter navnet skal
             være enden på det — et komma eller parentesen. */
          if (!/[A-Za-z0-9_$]/.test(s[k + naal.length] ?? "")) {
            kaldet = k;
            break;
          }
        }
        expect(
          kaldet,
          `${sti}: fandt ikke listen bag ${variabel}.${felt}`,
        ).toBeGreaterThan(-1);

        /* Listens navn står lige før punktummet — læs baglæns, til tegnet
           ikke længere kan indgå i et navn. */
        let start = kaldet;
        while (start > 0 && /[A-Za-z0-9_$]/.test(s[start - 1])) start--;
        const liste = s.slice(start, kaldet);
        expect(liste.length, "listen har et navn").toBeGreaterThan(0);

        const erklaering = s.indexOf("const " + liste);
        expect(
          erklaering,
          `${sti}: fandt ikke listen ${liste}`,
        ).toBeGreaterThan(-1);
        const ende = s.indexOf("];", erklaering);
        const blok = s.slice(erklaering, ende === -1 ? undefined : ende);

        const navne = [...blok.matchAll(/Icon:\s*(\w+),/g)].map(
          (t) => t[1],
        );
        expect(navne.length, `${liste} har ikoner`).toBeGreaterThan(0);
        feltbrug += navne.length;

        for (const n of navne) {
          expect(
            n,
            `${sti}: ${liste} fylder et ikonfelt, men ${n} er en streg`,
          ).toMatch(/Duo$/);
        }

        /* SAMME IKON TO GANGE I ÉN LISTE er den anden vej ind — så kan
           nabokortene ikke skelnes. Det var netop fejlen på
           /loyalsum-komplet-online, hvor Pointprogram bar gaveikonet og
           "Kunder og medarbejdere" bar en statuslinje. */
        const dubletter = navne.filter((n, i) => navne.indexOf(n) !== i);
        expect(
          [...new Set(dubletter)],
          `${sti}: ${liste} bruger samme ikon to gange`,
        ).toEqual([]);
      }
    }

    expect(feltbrug, "nogen fylder overhovedet et ikonfelt").toBeGreaterThan(0);
  });

  it("duotone-sættet holder sin ene regel om kroppen", () => {
    /*
     * Kroppen er 18 % ÉT sted (`KROP`). Skrives tallet af direkte i et nyt
     * ikon, driver sættet fra hinanden ikon for ikon, og det ses først, når to
     * af dem står ved siden af hinanden. Og bærer et ikon sin EGEN farve, kan
     * det kun bruges ét sted — så falder hele `--chip`-mekanikken.
     */
    const s = readFileSync("src/components/duotone-ikoner.tsx", "utf8");
    expect(s).toMatch(/const KROP = 0\.18;/);

    const skrevetAf = [...s.matchAll(/opacity=\{(0\.\d+)\}/g)].map((m) => m[1]);
    expect(
      skrevetAf,
      "kroppens opacitet er skrevet af i stedet for at bruge KROP",
    ).toEqual([]);

    expect(
      /fill="#/.test(s) || /fill=\{(GOLD|ACCENT)\}/.test(s),
      "et duotone-ikon bærer sin egen farve og kan så kun bruges ét sted",
    ).toBe(false);
  });
});
