/**
 * PRODUKTFOTOET TIL LOYALSUM KOMPLET ONLINE — MED DEN RIGTIGE MENU.
 *
 * Billedet er en generatormockup af en café med en bærbar og en telefon, og
 * skærmen på den bærbare var TEGNET: menuen sagde Kunder, Stempelkort,
 * Anmeldelser, Kampagner, SoMe opslag og Statistik på en lys bundplade, mens
 * panelet i virkeligheden har en MØRK menu med Oversigt, Standere, Loyalitet,
 * Opslag, Feedback og Omdømme. Huset viser ikke funktioner, der ikke findes,
 * og et marketingbillede er ikke en undtagelse — på den digitale vare er
 * panelet oven i købet HELE varen, så det er dét, kunden køber, der skal stå
 * på fotoet.
 *
 * DERFOR ER SKÆRMEN VORES EGEN. Kilden er et skærmbillede af /dashboard i en
 * rigtig browser (.qa/dash-mockup.mjs): menu, farver, kort og typografi er
 * produktets egne og kan ikke komme til at love noget. Kun tallene og navnene
 * i testdataene er skiftet ud i DOM-træet, før billedet blev taget — en
 * testcafé med rating 1,0 og en stander ved navn "tester 3" er sand, men den
 * er ikke et produktfoto værd. Der skrives ikke i basen for et billedes
 * skyld: udvikling og produktion deler database (se AGENTS.md).
 *
 * TO INPUT, OG KUN DET ENE KAN GENSKABES. Skærmbilledet kan altid tages
 * forfra — det er vores eget panel. Generatorfilen kan ikke og ligger i
 * Overførsler ved siden af de fire andre materialefotos, præcis som
 * Canva-eksporterne til skiltet. Mangler en af dem, stopper scriptet frem for
 * at skrive et halvt billede.
 *
 * SKÆRMEN ER EN FIRKANT I PERSPEKTIV, så billedet lægges ind med en HOMOGRAFI
 * (enhedskvadratet → de fire målte hjørner) og ikke med en skalering: en
 * skalering ville stå vinkelret på en skærm, der hælder. Hjørnerne er MÅLT på
 * firdobbelt forstørrelse i kildens egne koordinater; skiftes generatorfilen,
 * skal de måles om.
 *
 * LYSET TAGES FRA FOTOET SELV: den gamle skærm sløres, til kun lysfordelingen
 * står tilbage, og det felt ganges ned over det nye billede. Uden det ligger
 * en fladt oplyst skærm i et billede, hvor alt andet har lys og skygge — det
 * ses med det samme, også af en, der ikke kan sige hvorfor.
 */
import sharp from "sharp";
import { existsSync } from "node:fs";

const KILDE =
  process.env.KILDE ??
  "C:/Users/Admin/Downloads/ChatGPT Image 19. sep. 2026, 18.12.52 (5).png";
const SKAERM = process.env.SKAERM ?? ".qa/skud-dash-demo.png";
const UD = "public/loyalsum-komplet-online-dashboard-og-mobil.jpg";

for (const [navn, sti, raad] of [
  ["generatorfilen", KILDE, "Filen ligger i Overførsler sammen med de øvrige materialefotos."],
  ["skærmbilledet", SKAERM, "Tag det med `node .qa/dash-mockup.mjs` (kræver dev-server på 3100)."],
]) {
  if (!existsSync(sti)) {
    console.error(`Mangler ${navn}: ${sti}`);
    console.error(raad);
    process.exit(1);
  }
}

/* Målt i kildens egne koordinater (1254×1254), hjørne for hjørne. */
const HJOERNER = { tv: [209, 334], th: [910, 357], bh: [915, 894], bv: [230, 917] };

/* Udsnittet er det samme som de øvrige produktfotos: 4:5, og fast fra venstre
   frem for en position — "east" gav telefonen luft, men klippede den bærbares
   LoyalSum-logo, og et afskåret bomærke læses som en fejl. */
const UDSNIT_FRA_VENSTRE = 170;
const BREDDE = 1000;
const HOEJDE = 1250;

const [x0, y0] = HJOERNER.tv;
const [x1, y1] = HJOERNER.th;
const [x2, y2] = HJOERNER.bh;
const [x3, y3] = HJOERNER.bv;

const dx1 = x1 - x2, dx2 = x3 - x2, dx3 = x0 - x1 + x2 - x3;
const dy1 = y1 - y2, dy2 = y3 - y2, dy3 = y0 - y1 + y2 - y3;
const naevner = dx1 * dy2 - dy1 * dx2;
const g = (dx3 * dy2 - dy3 * dx2) / naevner;
const h = (dx1 * dy3 - dy1 * dx3) / naevner;
const M = [
  [x1 - x0 + g * x1, x3 - x0 + h * x3, x0],
  [y1 - y0 + g * y1, y3 - y0 + h * y3, y0],
  [g, h, 1],
];

function invers(m) {
  const [[a, b, c], [d, e, f], [gg, hh, i]] = m;
  const A = e * i - f * hh;
  const B = -(d * i - f * gg);
  const C = d * hh - e * gg;
  const det = a * A + b * B + c * C;
  return [
    [A / det, -(b * i - c * hh) / det, (b * f - c * e) / det],
    [B / det, (a * i - c * gg) / det, -(a * f - c * d) / det],
    [C / det, -(a * hh - b * gg) / det, (a * e - b * d) / det],
  ];
}
const Mi = invers(M);

const foto = sharp(KILDE);
const { width: FB, height: FH } = await foto.metadata();
const fotoRaa = await foto.clone().ensureAlpha().raw().toBuffer();

/* Skærmbilledet ned i nærheden af sin endelige størrelse FØRST: en bilineær
   aflæsning direkte fra 2560 px ned til ~700 ville få teksten til at flimre. */
const SB = 1400;
const SH = 875;
const skaerm = await sharp(SKAERM)
  .resize(SB, SH, { kernel: "lanczos3" })
  .removeAlpha()
  .raw()
  .toBuffer();

const bbX = Math.floor(Math.min(x0, x3)) - 2;
const bbY = Math.floor(Math.min(y0, y1)) - 2;
const bbB = Math.ceil(Math.max(x1, x2)) - bbX + 4;
const bbH = Math.ceil(Math.max(y2, y3)) - bbY + 4;
const lysRaa = await sharp(KILDE)
  .extract({ left: bbX, top: bbY, width: bbB, height: bbH })
  .blur(28)
  .greyscale()
  .raw()
  .toBuffer();
const lysSnit = lysRaa.reduce((a, b) => a + b, 0) / lysRaa.length;

function pr(u, v) {
  const x = u * SB;
  const y = v * SH;
  const xi = Math.min(SB - 2, Math.max(0, Math.floor(x)));
  const yi = Math.min(SH - 2, Math.max(0, Math.floor(y)));
  const fx = x - xi;
  const fy = y - yi;
  const ud = [0, 0, 0];
  for (let k = 0; k < 3; k++) {
    const p00 = skaerm[(yi * SB + xi) * 3 + k];
    const p10 = skaerm[(yi * SB + xi + 1) * 3 + k];
    const p01 = skaerm[((yi + 1) * SB + xi) * 3 + k];
    const p11 = skaerm[((yi + 1) * SB + xi + 1) * 3 + k];
    ud[k] =
      p00 * (1 - fx) * (1 - fy) + p10 * fx * (1 - fy) + p01 * (1 - fx) * fy + p11 * fx * fy;
  }
  return ud;
}

/* Skærmfladens hjørner er rundede. Firkantede ville stikke ud over
   bundpladen og ligne en fejl i billedet frem for en skærm. */
const RADIUS_U = 0.014;
const RADIUS_V = 0.021;
function indeni(u, v) {
  if (u < 0 || u > 1 || v < 0 || v > 1) return false;
  const du = u < RADIUS_U ? RADIUS_U - u : u > 1 - RADIUS_U ? u - (1 - RADIUS_U) : 0;
  const dv = v < RADIUS_V ? RADIUS_V - v : v > 1 - RADIUS_V ? v - (1 - RADIUS_V) : 0;
  if (du === 0 || dv === 0) return true;
  return Math.hypot(du / RADIUS_U, dv / RADIUS_V) <= 1;
}

const ud = Buffer.from(fotoRaa);
const PROEVER = [0.25, 0.75];
let malet = 0;
for (let y = bbY; y < bbY + bbH; y++) {
  for (let x = bbX; x < bbX + bbB; x++) {
    let r = 0;
    let gr = 0;
    let b = 0;
    let daekning = 0;
    for (const sy of PROEVER) {
      for (const sx of PROEVER) {
        const px = x + sx;
        const py = y + sy;
        const w = Mi[2][0] * px + Mi[2][1] * py + Mi[2][2];
        const u = (Mi[0][0] * px + Mi[0][1] * py + Mi[0][2]) / w;
        const v = (Mi[1][0] * px + Mi[1][1] * py + Mi[1][2]) / w;
        if (!indeni(u, v)) continue;
        const [pr_, pg, pb] = pr(u, v);
        r += pr_;
        gr += pg;
        b += pb;
        daekning++;
      }
    }
    if (!daekning) continue;
    const a = daekning / 4;
    const nye = [r / daekning, gr / daekning, b / daekning];
    const lys = lysRaa[(y - bbY) * bbB + (x - bbX)];
    const faktor = Math.min(1.18, Math.max(0.82, 1 + ((lys - lysSnit) / lysSnit) * 0.55));
    const i = (y * FB + x) * 4;
    for (let k = 0; k < 3; k++) {
      const ny = Math.min(255, Math.max(0, nye[k] * faktor));
      ud[i + k] = Math.round(ud[i + k] * (1 - a) + ny * a);
    }
    malet++;
  }
}

/* Et strejf af uskarphed: fotoets egen skærm er ikke knivskarp, og en
   knivskarp indsættelse i et blødt billede læses som en collage. */
const lag = await sharp(ud, { raw: { width: FB, height: FH, channels: 4 } })
  .extract({ left: bbX, top: bbY, width: bbB, height: bbH })
  .blur(0.6)
  .png()
  .toBuffer();

/*
 * TO PIPELINES OG IKKE ÉN, OG DET ER IKKE PÆNHED.
 *
 * `sharp` kører sine trin i en FAST rækkefølge og ikke i den, de kaldes i:
 * `composite` lægges på EFTER `resize`. Sat sammen i én kæde blev det slørede
 * lag — hvis `left`/`top` er målt i kildens 1254 px — lagt oven på et billede,
 * der allerede var skaleret ned og beskåret, altså et helt andet sted. Fejlen
 * ser ikke ud som en forskydning: den tegner skærmen ÉN GANG TIL ved siden af
 * sig selv, så produktfotoet fik to menuer. Den blev fanget på siden og ikke i
 * filen, fordi et miniaturebillede af en bærbar med to paneler stadig ligner
 * et skærmbillede.
 */
const helt = await sharp(ud, { raw: { width: FB, height: FH, channels: 4 } })
  .composite([{ input: lag, left: bbX, top: bbY }])
  .png()
  .toBuffer();

const info = await sharp(helt)
  .resize({ height: HOEJDE })
  .extract({ left: UDSNIT_FRA_VENSTRE, top: 0, width: BREDDE, height: HOEJDE })
  .jpeg({ quality: 82, mozjpeg: true })
  .toFile(UD);

console.log(
  `  ${UD.replace("public/", "")}  ${info.width}x${info.height}  ${Math.round(info.size / 1024)} KB  (${malet} pixels skærm)`,
);
