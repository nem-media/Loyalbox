/**
 * Laver trykskabelonerne om til farvebare skabeloner.
 *
 * KILDEN ER TO CANVA-EKSPORTER, hvor al tekst er lavet om til kurver — over
 * 400 paths og 155 KB pr. fil. Der er hverken <text> eller <circle> at rette
 * i, så det eneste, der kan parameteriseres pålideligt, er de farver, der
 * står som literaler.
 *
 * FIRE PLADSHOLDERE bliver til:
 *   {{BG}}      standerens flade — den afrundede firkant, der ER skiltet
 *   {{ACCENT}}  #4ea4ad: rammen om logofeltet, stjernerne og "Scan eller tap"
 *   {{SKIVE}}   logofeltets bund OG NFC-cirklen: en anelse fra baggrunden
 *   {{RING}}    stregen om NFC-cirklen: et skridt længere fra baggrunden
 *
 * DEN GRÅ BAGGRUND ER IKKE EN DEL AF SKILTET. Den er en bagplade, Canva
 * eksporterer med, så en hvid stander kan ses på en hvid skærm. Den slås fra
 * her sammen med lærredet under den: skiltet er den afrundede firkant, og
 * alt uden for den skal være gennemsigtigt — det er dér, trykkeriet skærer.
 *
 * VIEWBOX'EN SKÆRES IND TIL STANDEREN. Canva lægger et par enheders tomt
 * lærred under skiltet, og de ville blive til en gennemsigtig stribe under
 * previewets nederste kant, hvor silhuetten så ikke ville følge skiltet.
 * Ingen paths flyttes — kun udsnittet.
 *
 * STREGFARVEN parameteriseres BEVIDST IKKE. I den hvide fil kan hvid
 * baggrund ikke skelnes fra hvide detaljer i QR-feltet, og en forkert
 * erstatning ville gøre QR-koden ulæselig. I stedet vælges skabelonen efter
 * baggrundens lyshed — mørk baggrund giver den sorte fil, lys den hvide — og
 * så er både stregfarve og QR rigtige af sig selv.
 *
 * TO SLAGS KONTROL, og de fanger hver sin fejl:
 *
 *   FARVERNE tælles op mod et forventet antal. Er der pludselig 46 accenter,
 *   er der et element, der har skiftet farve i Canva.
 *
 *   GEOMETRIEN kontrolleres mod de præcise `d`-strenge, `MAAL` i
 *   `skilt-format.ts` er målt på. Dét er den farlige fejl: flytter logofeltet
 *   eller QR-pladsholderen sig, passer FARVERNE stadig, og skabelonen bliver
 *   opdateret uden at et eneste tal i koden følger med — så tegnes den rigtige
 *   QR-kode et andet sted, end pladsholderen står. Det skete ved eksporten
 *   den 27. august, hvor hele den nederste blok blev rykket op.
 *
 * FILERNE FINDES PÅ INDHOLD, IKKE PÅ NAVN. Canva har leveret dem som
 * "Standard Reviewstander sort.svg", som "…_design-selv.svg" og senest som en
 * zip med "1.svg" og "2.svg". Hvilken af de to der er hvilken, kan ikke ses på
 * navnet — men skivefarven er entydig: #171717 i den sorte fil, #f6f6f6 i den
 * hvide. Så kan mappen bare pege på Overførsler, uanset hvad Canva kaldte dem.
 *
 * Kør: node scripts/lav-print-skabelon.mjs "<mappe med kildefilerne>"
 */
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

const kilde = process.argv[2];
if (!kilde) {
  console.error('Brug: node scripts/lav-print-skabelon.mjs "C:/sti/til/mappe"');
  process.exit(1);
}

/**
 * Bagpladen og lærredet deler `d` og skelnes kun på farven; standeren har sin
 * egen bredde. Aldrig omvendt: i den hvide fil er BÅDE lærredet og standeren
 * `#ffffff`, så en erstatning på farve alene ville ramme forkert.
 */
const BAGPLADE_D = "M 0 0.300781 L 339.582031";

const FILER = [
  {
    navnetPaaVarianten: "sort",
    til: "skabelon-sort.ts",
    navn: "SKABELON_SORT",
    bg: "#000000",
    standerD: "M 0 0.277344 L 339.238281",
    skive: "#171717",
    ring: "#545454",
    /** Udsnittet: standerens egen firkant. Se `MAAL.sort` i skilt-format.ts. */
    udsnit: "0 1.277344 339.238281 538.011718",
    ankre: [
      // Logofeltet — gruppen og fladen inden i.
      ['transform="matrix(1, 0, 0, 1, 28, 16)"', "logofeltets gruppe"],
      ['d="M 0.703125 0.433594 L 282.546875 0.433594 L 282.546875 102.632812', "logofeltets flade"],
      // NFC-cirklen.
      ['d="M 95.492188 247.21875 C', "NFC-cirklen"],
      // QR-pladsholderens gruppe.
      ['transform="matrix(1, 0, 0, 1, 190, 250)"', "QR-pladsholderen"],
    ],
  },
  {
    navnetPaaVarianten: "hvid",
    til: "skabelon-hvid.ts",
    navn: "SKABELON_HVID",
    bg: "#ffffff",
    standerD: "M 0 0.300781 L 339.238281",
    skive: "#f6f6f6",
    ring: "#d9d9d9",
    udsnit: "0 0.300781 339.238281 538.015625",
    ankre: [
      ['transform="matrix(1, 0, 0, 1, 27, 16)"', "logofeltets gruppe"],
      ['d="M 0.847656 0.433594 L 284.363281 0.433594 L 284.363281 107.644531', "logofeltets flade"],
      ['d="M 95.039062 251.183594 C', "NFC-cirklen"],
      ['transform="matrix(1, 0, 0, 1, 190, 254)"', "QR-pladsholderen"],
    ],
  },
];

/**
 * Finder kildefilen på dens indhold.
 *
 * KRÆVER PRÆCIS ÉT SVAR. Ligger der to eksporter af samme variant i mappen —
 * og det gør der næsten altid, for Canva rydder ikke op — skal det siges, ikke
 * gættes. Den nyeste er ikke nødvendigvis den, der skal bruges.
 */
function findKilde(mappe, f) {
  const kandidater = readdirSync(mappe)
    .filter((n) => n.toLowerCase().endsWith(".svg"))
    .filter((n) => {
      const s = readFileSync(join(mappe, n), "utf8");
      return s.includes(f.skive) && s.includes(`<path fill="${f.bg}" d="${f.standerD}`);
    });

  if (kandidater.length !== 1) {
    throw new Error(
      `Fandt ${kandidater.length} filer til den ${f.navnetPaaVarianten}e variant i ${mappe}` +
        (kandidater.length ? `:\n  ${kandidater.join("\n  ")}` : "") +
        `\n  Der skal ligge præcis én. Kendetegnet er skivefarven ${f.skive}` +
        ` og standerens flade i ${f.bg}.`,
    );
  }
  return kandidater[0];
}

/** Erstat præcis `antal` gange, ellers stop. En stille afvigelse bliver til et forkert skilt. */
function erstat(s, moenster, med, antal, hvad, fil) {
  const fundet = s.match(moenster)?.length ?? 0;
  if (fundet !== antal) {
    throw new Error(
      `${fil}: fandt ${fundet} × ${hvad}, forventede ${antal}. ` +
        `Er filen eksporteret på ny, skal tallene her tjekkes efter — ikke rettes blindt.`,
    );
  }
  return s.replace(moenster, med);
}

for (const f of FILER) {
  const fra = findKilde(kilde, f);
  let s = readFileSync(join(kilde, fra), "utf8");

  /*
   * GEOMETRIEN FØRST. Passer den ikke, er der ingen grund til at skrive en
   * skabelon ud: den ville se rigtig ud og tegne QR-koden det forkerte sted.
   */
  for (const [anker, hvad] of f.ankre) {
    if (!s.includes(anker)) {
      throw new Error(
        `${fra}: ${hvad} står ikke, hvor MAAL i src/lib/skilt-format.ts er målt op.\n` +
          `  Ledte efter: ${anker}\n` +
          `  Designet er flyttet i Canva. Mål feltet op på ny og ret MAAL — ` +
          `ellers tegnes QR-koden og logoet ved siden af, hvor de hører hjemme.`,
      );
    }
  }

  // 1) Selve skiltet. Ankret på bredden, ikke på farven: i den hvide fil har
  //    lærredet og standeren samme #ffffff.
  s = erstat(
    s,
    new RegExp(`<path fill="${f.bg}" d="${f.standerD}`, "g"),
    `<path fill="{{BG}}" d="${f.standerD}`,
    1,
    "standerens flade",
    fra,
  );

  // 2) Bagpladen og lærredet slås fra. `fill="none"` frem for at slette
  //    stien: mindre indgreb i et dokument, vi ikke selv har tegnet.
  for (const farve of ["#b4b4b4", "#ffffff"]) {
    s = erstat(
      s,
      new RegExp(`<path fill="${farve}" d="${BAGPLADE_D}`, "g"),
      `<path fill="none" d="${BAGPLADE_D}`,
      1,
      farve === "#b4b4b4" ? "Canvas grå bagplade" : "lærredet",
      fra,
    );
  }

  // 3) Logofeltets bund og NFC-cirklen deler literal — og skal netop følges
  //    ad: begge er "baggrunden, en anelse forskudt".
  s = erstat(s, new RegExp(f.skive, "gi"), "{{SKIVE}}", 2, "skivefarven", fra);

  // 4) Stregen om NFC-cirklen.
  s = erstat(s, new RegExp(f.ring, "gi"), "{{RING}}", 1, "ringfarven", fra);

  // 5) Accenten. Samme literal i begge filer.
  const antalAccent = (s.match(/#4ea4ad/gi) ?? []).length;
  if (antalAccent < 30) throw new Error(`${fra}: kun ${antalAccent} accentfarver`);
  s = s.replace(/#4ea4ad/gi, "{{ACCENT}}");

  // 6) Udsnittet skæres ind til standeren, og de opgivne pixelmål rettes med,
  //    så billedets iboende sideforhold passer til det nye udsnit.
  s = erstat(
    s,
    /viewBox="0 0 340\.08 549\.12"/g,
    `viewBox="${f.udsnit}"`,
    1,
    "viewBox",
    fra,
  );
  s = erstat(s, /height="722"/g, 'height="720"', 1, "højden", fra);

  const ud = `/* GENERERET af scripts/lav-print-skabelon.mjs — ret ikke i hånden.
 * Kilde: "${fra}". {{BG}}, {{ACCENT}}, {{SKIVE}} og {{RING}} udfyldes af
 * src/lib/skilt.ts. ${antalAccent} accentfarver blev fundet.
 * Geometrien er kontrolleret mod MAAL i src/lib/skilt-format.ts. */
export const ${f.navn} = ${JSON.stringify(s)};
`;
  writeFileSync(join("src/lib/print", f.til), ud);
  console.log(f.til, "←", fra, "·", antalAccent, "accent, geometri OK");
}
