/**
 * Laver trykskabelonerne om til farvebare skabeloner.
 *
 * KILDEN ER TO CANVA-EKSPORTER, hvor al tekst er lavet om til kurver — 440
 * paths og 167 KB pr. fil. Der er hverken <text> eller <circle> at rette i,
 * så det eneste, der kan parameteriseres pålideligt, er de farver, der står
 * som literaler.
 *
 * TO PLADSHOLDERE bliver til:
 *   {{BG}}      baggrunden — de to elementer, der dækker hele fladen
 *   {{ACCENT}}  #4ea4ad: ringen, stjernerne og "Scan eller tap"
 *
 * STREGFARVEN parameteriseres BEVIDST IKKE. I den hvide fil kan hvid
 * baggrund ikke skelnes fra hvide detaljer i QR-feltet, og en forkert
 * erstatning ville gøre QR-koden ulæselig. I stedet vælges skabelonen efter
 * baggrundens lyshed — mørk baggrund giver den sorte fil, lys den hvide — og
 * så er både stregfarve og QR rigtige af sig selv.
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

const FILER = [
  { fra: "Standard Reviewstander sort.svg", til: "skabelon-sort.ts", navn: "SKABELON_SORT" },
  { fra: "Standard Reviewstander hvid.svg", til: "skabelon-hvid.ts", navn: "SKABELON_HVID" },
];

for (const f of FILER) {
  let s = readFileSync(join(kilde, f.fra), "utf8");

  // 1) Baggrunden: de to første elementer dækker hele fladen (0,0 → 340,541).
  //    Begge sættes, så der ikke kan lyse en hvid kant igennem i kanterne.
  let fundet = 0;
  s = s.replace(/<path fill="#[0-9a-fA-F]{6}" d="M 0 0\.148438 L 340/g, (m) => {
    fundet++;
    return m.replace(/#[0-9a-fA-F]{6}/, "{{BG}}");
  });
  if (fundet !== 2) throw new Error(`${f.fra}: fandt ${fundet} baggrundselementer, forventede 2`);

  // 2) Accenten. Samme literal i begge filer.
  const antalAccent = (s.match(/#4ea4ad/gi) ?? []).length;
  if (antalAccent < 30) throw new Error(`${f.fra}: kun ${antalAccent} accentfarver`);
  s = s.replace(/#4ea4ad/gi, "{{ACCENT}}");

  const ud = `/* GENERERET af scripts/lav-print-skabelon.mjs — ret ikke i hånden.
 * Kilde: "${f.fra}". {{BG}} og {{ACCENT}} udfyldes af src/lib/skilt.ts.
 * ${antalAccent} accentfarver og ${fundet} baggrundselementer blev fundet. */
export const ${f.navn} = ${JSON.stringify(s)};
`;
  writeFileSync(join("src/lib/print", f.til), ud);
  console.log(f.til, "-", antalAccent, "accent,", fundet, "baggrund");
}
