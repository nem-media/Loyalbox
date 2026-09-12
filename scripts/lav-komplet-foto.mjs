/**
 * Lægger klistermærket "Indeholder stempelkort" på produktfotoet til
 * LoyalSum Komplet.
 *
 *     node scripts/lav-komplet-foto.mjs
 *     public/reviewstander-boutique.jpg → public/reviewstander-boutique-komplet.jpg
 *
 * HVORFOR ET SCRIPT OG IKKE ET LAG I CSS: fotoet bruges både på katalogkortet
 * og på produktsiden, og en overlejring skulle placeres rigtigt begge steder
 * og ved enhver bredde. Her ligger mærket i selve billedet, målt ÉN gang.
 *
 * HVORFOR MÅLENE STÅR I CENTIMETER: skiltet er et fysisk emne på 12 × 19,3 cm,
 * hvor de øverste 15 cm kan ses (resten sidder i foden — se SKILT_CM i
 * src/lib/skilt-format.ts). Klistermærket er bestilt som 3 × 2 cm, og det
 * eneste sted det tal kan holdes fast, er i skiltets egne mål. Matricen
 * herunder oversætter centimeter til pixels i netop dette foto.
 *
 * MATRICEN ER MÅLT I FOTOET, ikke gættet. Standeren står på skrå, så et
 * rektangel tegnet vandret ville ligge SKÆVT på skiltet og straks afsløre sig
 * som påklistret i et billedprogram. Tre punkter er læst af på et gitter over
 * billedet (scratchpad-scriptet crop.mjs, 6× forstørrelse):
 *
 *   øverste venstre hjørne   (300, 347)
 *   øverste højre hjørne     (803, 355)   → 503 px = 12 cm på tværs
 *   højre kant ved fodlinjen (779, 950)   → 595 px = 15 cm ned
 *
 * Punkterne er læst på selve FRONTFLADEN og ikke på den lyse stribe uden om.
 * Striben er akrylkantens tykkelse, der fanger lyset — tages den med, lander
 * mærket 4-5 px for langt til højre og kommer til at hænge ud over skiltet.
 *
 * Vandret og lodret giver IKKE samme skala (42,1 mod 39,7 px/cm), og det er
 * ikke en målefejl: skiltet vender en anelse væk fra kameraet. Derfor to
 * selvstændige vektorer frem for én rotation.
 */

import sharp from "sharp";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rod = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const KILDE = path.join(rod, "public/reviewstander-boutique.jpg");
const MAAL = path.join(rod, "public/reviewstander-boutique-komplet.jpg");

/** Skiltets øverste venstre hjørne i fotoet (px). */
const O = { x: 300, y: 347 };
/** Én centimeter mod HØJRE på skiltet, i fotoets pixels. */
const u = { x: (803 - 300) / 12, y: (355 - 347) / 12 };
/** Én centimeter NED ad skiltet, i fotoets pixels. */
const v = { x: (779 - 803) / 15, y: (950 - 355) / 15 };

/**
 * Klistermærket i skiltets egne centimeter.
 *
 * `x` slutter ved 12 — altså HELT ude ved højre kant, som et mærke der er sat
 * på fra siden. Båndet mellem stjernernes underkant (7,6 cm) og QR-kodens
 * overkant (9,8 cm) er 2,2 cm højt, så de 2 cm er centreret deri med et par
 * millimeter luft til hver side. Vandret begynder det ved 9 cm, og "Scan
 * eller tap" slutter ved 7,4 cm — teksten og mærket rører altså ikke hinanden.
 */
const MAERKE = { x: 9, y: 7.72, bredde: 3, hoejde: 2 };

/** Råhvid som resten af brandet (--background i globals.css). */
const RAAHVID = "#f6f4ee";
const NAVY = "#19375c";

const matrix = [u.x, u.y, v.x, v.y, O.x, O.y].map((n) => n.toFixed(4)).join(",");

/*
  Teksten står med ét ord pr. linje, og det er ikke kun en smagssag:
  "stempelkort" er det længste ord og sætter skriftstørrelsen. Med begge ord
  på én linje skulle skriften ned i en størrelse, der ikke kan læses på et
  katalogkort på en telefon.

  Skyggen er en kopi af mærket, forskudt nogle få hundrededele centimeter.
  Uden den ligger mærket ikke OVENPÅ skiltet — det ser ud som om det er trykt
  med, og så er vi tilbage ved det skilt, Komplet ikke skal have.
*/
const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1000" height="1250">
  <g transform="matrix(${matrix})">
    <rect x="${MAERKE.x + 0.06}" y="${MAERKE.y + 0.06}" width="${MAERKE.bredde}" height="${MAERKE.hoejde}" rx="0.14" fill="#000000" opacity="0.22"/>
    <rect x="${MAERKE.x}" y="${MAERKE.y}" width="${MAERKE.bredde}" height="${MAERKE.hoejde}" rx="0.14" fill="${RAAHVID}"/>
    <text x="${MAERKE.x + MAERKE.bredde / 2}" y="${MAERKE.y + 0.86}"
          text-anchor="middle" fill="${NAVY}"
          font-family="Segoe UI, Helvetica, Arial, sans-serif"
          font-size="0.44" font-weight="600" letter-spacing="-0.01">Indeholder</text>
    <text x="${MAERKE.x + MAERKE.bredde / 2}" y="${MAERKE.y + 1.47}"
          text-anchor="middle" fill="${NAVY}"
          font-family="Segoe UI, Helvetica, Arial, sans-serif"
          font-size="0.44" font-weight="600" letter-spacing="-0.01">stempelkort</text>
  </g>
</svg>`;

await sharp(KILDE)
  .composite([{ input: Buffer.from(svg) }])
  // Samme komprimering som de øvrige produktfotos (mozjpeg q82, ~110 KB).
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(MAAL);

console.log("skrevet:", path.relative(rod, MAAL));
