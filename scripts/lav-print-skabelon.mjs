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
 * her: skiltet er den afrundede firkant, og alt uden for den skal være
 * gennemsigtigt — det er dér, trykkeriet skærer.
 *
 * STREGFARVEN parameteriseres BEVIDST IKKE. I den hvide fil kan hvid
 * baggrund ikke skelnes fra hvide detaljer i QR-feltet, og en forkert
 * erstatning ville gøre QR-koden ulæselig. I stedet vælges skabelonen efter
 * baggrundens lyshed — mørk baggrund giver den sorte fil, lys den hvide — og
 * så er både stregfarve og QR rigtige af sig selv.
 *
 * HVER ERSTATNING TÆLLES OP OG SAMMENLIGNES med et forventet antal. En ny
 * eksport fra Canva, der har flyttet rundt på noget, skal fejle HER og ikke
 * ende som et skilt, en kunde står med i hånden.
 *
 * Kør: node scripts/lav-print-skabelon.mjs "<mappe med kildefilerne>"
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const kilde = process.argv[2];
if (!kilde) {
  console.error('Brug: node scripts/lav-print-skabelon.mjs "C:/sti/til/mappe"');
  process.exit(1);
}

/**
 * Standerens flade og Canvas bagplade ligner hinanden til forveksling — begge
 * er en firkant fra (0, 0.148). Forskellen står i BREDDEN, og kun i den:
 * skiltet er 339.710938 bredt, bagpladen 340.050781, og lærredet under dem
 * begge 340. Derfor ankres hver enkelt på sit eget `d`, aldrig på farven.
 */
const SKILT_D = "M 0 0.148438 L 339.710938";
const BAGPLADE_D = "M 0 0.148438 L 340.050781";
const LAERRED_D = "M 0 0.148438 L 340 0.148438";

const FILER = [
  {
    fra: "Reviewstander sort_design-selv.svg",
    til: "skabelon-sort.ts",
    navn: "SKABELON_SORT",
    bg: "#000000",
    skive: "#171717",
    ring: "#545454",
  },
  {
    fra: "Reviewstander hvid_design-selv.svg",
    til: "skabelon-hvid.ts",
    navn: "SKABELON_HVID",
    bg: "#ffffff",
    skive: "#f6f6f6",
    ring: "#d9d9d9",
  },
];

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
  let s = readFileSync(join(kilde, f.fra), "utf8");

  // 1) Selve skiltet. Ankret på bredden, ikke på farven: i den hvide fil har
  //    fladen samme #ffffff som lærredet under den.
  s = erstat(
    s,
    new RegExp(`<path fill="${f.bg}" d="${SKILT_D}`, "g"),
    `<path fill="{{BG}}" d="${SKILT_D}`,
    1,
    "standerens flade",
    f.fra,
  );

  // 2) Bagpladen og lærredet slås fra. `fill="none"` frem for at slette
  //    stien: mindre indgreb i et dokument, vi ikke selv har tegnet.
  s = erstat(
    s,
    new RegExp(`<path fill="#b4b4b4" d="${BAGPLADE_D}`, "g"),
    `<path fill="none" d="${BAGPLADE_D}`,
    1,
    "Canvas grå bagplade",
    f.fra,
  );
  s = erstat(
    s,
    new RegExp(`<path fill="#ffffff" d="${LAERRED_D}`, "g"),
    `<path fill="none" d="${LAERRED_D}`,
    1,
    "lærredet",
    f.fra,
  );

  // 3) Logofeltets bund og NFC-cirklen deler literal — og skal netop følges
  //    ad: begge er "baggrunden, en anelse forskudt".
  s = erstat(s, new RegExp(f.skive, "gi"), "{{SKIVE}}", 2, "skivefarven", f.fra);

  // 4) Stregen om NFC-cirklen.
  s = erstat(s, new RegExp(f.ring, "gi"), "{{RING}}", 1, "ringfarven", f.fra);

  // 5) Accenten. Samme literal i begge filer.
  const antalAccent = (s.match(/#4ea4ad/gi) ?? []).length;
  if (antalAccent < 30) throw new Error(`${f.fra}: kun ${antalAccent} accentfarver`);
  s = s.replace(/#4ea4ad/gi, "{{ACCENT}}");

  const ud = `/* GENERERET af scripts/lav-print-skabelon.mjs — ret ikke i hånden.
 * Kilde: "${f.fra}". {{BG}}, {{ACCENT}}, {{SKIVE}} og {{RING}} udfyldes af
 * src/lib/skilt.ts. ${antalAccent} accentfarver blev fundet. */
export const ${f.navn} = ${JSON.stringify(s)};
`;
  writeFileSync(join("src/lib/print", f.til), ud);
  console.log(f.til, "-", antalAccent, "accent");
}
