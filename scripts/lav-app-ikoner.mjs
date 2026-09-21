/**
 * APP-IKONERNE — hjemmeskærmen, fanebladet og iOS.
 *
 * HVORFOR DE BLEV LAVET OM.
 *
 * 1. DE VAR GENNEMSIGTIGE, OG DET GAV EN SORT BAGGRUND. Alle fire filer
 *    havde `alpha=0` i hjørnerne og RGB (0,0,0) under. `icon-512.png` var
 *    samtidig erklæret `purpose: "maskable"`, og en maskable-ikon er et
 *    LØFTE til styresystemet om, at hele fladen er dækket: Android beskærer
 *    til sin egen form og fylder selv resten ud — med sort, når der ikke er
 *    noget. Det samme sker på iOS, som ikke understøtter gennemsigtighed i
 *    et hjemmeskærmsikon overhovedet. Meldt af brugeren; set på Android.
 *
 * 2. MÆRKET GIK HELT UD TIL KANTEN. En maskable-ikon har kun de inderste
 *    80 % som sikker zone, så stjernens spidser blev klippet af oven i
 *    den sorte flade.
 *
 * 3. FARVERNE VAR FRA FØR PALETTEOMVENDINGEN (filerne er fra 25. august,
 *    paletten skiftede 20. september). Det er præcis den fejlklasse,
 *    AGENTS.md beskriver: et sted, CSS ikke når hen, som bliver stående i
 *    den gamle palet — og et app-ikon er dét, folk ser FØRST.
 *
 * MÆRKET TEGNES IKKE OM. Stjernen hentes ud af `loyalsum-logo.png` ved at
 * finde bokse om pixels i logoets turkis (#4ea4ad, samme værdi som
 * `STANDARD_ACCENT`). Så kan ikonet ikke komme til at vise en anden stjerne
 * end logoet — og skifter logoet, er det ét kald at lave ikonerne igen.
 *
 * BAGGRUNDEN ER SITETS EGEN: `--dark` (#08303c) med det samme radiale skær
 * som heroerne. Derfor ligner ikonet hjemmesiden og ikke et vilkårligt
 * mærke på en sort flade.
 *
 * Kør: node scripts/lav-app-ikoner.mjs
 */
import sharp from "sharp";
import { writeFileSync } from "node:fs";

/* Husets farver. LITERALER MED VILJE — et script har ingen CSS at slå op i,
   og det er netop dét, der gør stedet farligt ved et paletteskift. Står de
   her, findes de af den `grep` efter gamle hex, som AGENTS.md foreskriver. */
const DARK = "#08303c";
const ACCENT_LYS = "#1a9089";
const GULD = "#d9a441";
/** Logoets turkis. Stjernen findes på denne farve i logofilen. */
const LOGO_TURKIS = { r: 78, g: 164, b: 173 };

const LOGO = "public/loyalsum-logo.png";

/** Stjernens kasse i logofilen — fundet på FARVE og ikke på faste tal. */
async function hentStjerne() {
  const { data, info } = await sharp(LOGO)
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  let x0 = Infinity,
    y0 = Infinity,
    x1 = -1,
    y1 = -1;
  const naer = (r, g, b) =>
    Math.abs(r - LOGO_TURKIS.r) < 40 &&
    Math.abs(g - LOGO_TURKIS.g) < 40 &&
    Math.abs(b - LOGO_TURKIS.b) < 40;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * info.channels;
      if (data[i + 3] > 150 && naer(data[i], data[i + 1], data[i + 2])) {
        if (x < x0) x0 = x;
        if (x > x1) x1 = x;
        if (y < y0) y0 = y;
        if (y > y1) y1 = y;
      }
    }
  }

  if (x1 < 0) {
    throw new Error(
      `Fandt ingen pixels i logoets turkis i ${LOGO}. Er logoet skiftet farve? ` +
        "Ret LOGO_TURKIS — gæt ikke på en kasse.",
    );
  }

  /* En KVADRATISK udklipning om stjernen, så den ikke bliver trykket flad,
     når den skaleres ned i et kvadratisk ikon. */
  const bredde = x1 - x0 + 1;
  const hoejde = y1 - y0 + 1;
  const side = Math.max(bredde, hoejde);
  const left = Math.max(0, Math.round(x0 - (side - bredde) / 2));
  const top = Math.max(0, Math.round(y0 - (side - hoejde) / 2));

  return sharp(LOGO)
    .extract({
      left,
      top,
      width: Math.min(side, info.width - left),
      height: Math.min(side, info.height - top),
    })
    .png()
    .toBuffer();
}

/**
 * Baggrunden.
 *
 * Skæret er det samme greb som heroerne: teal oppe i midten, en anelse guld
 * i hjørnet. Det er SVAGT med vilje — et ikon læses ved 48 px, og en kraftig
 * gradient dér gør bare mærket svært at se.
 */
function baggrund(px) {
  return Buffer.from(
    `<svg xmlns="http://www.w3.org/2000/svg" width="${px}" height="${px}">
       <defs>
         <radialGradient id="teal" cx="50%" cy="6%" r="78%">
           <stop offset="0%" stop-color="${ACCENT_LYS}" stop-opacity="0.32"/>
           <stop offset="70%" stop-color="${ACCENT_LYS}" stop-opacity="0"/>
         </radialGradient>
         <radialGradient id="guld" cx="88%" cy="94%" r="46%">
           <stop offset="0%" stop-color="${GULD}" stop-opacity="0.16"/>
           <stop offset="100%" stop-color="${GULD}" stop-opacity="0"/>
         </radialGradient>
       </defs>
       <rect width="${px}" height="${px}" fill="${DARK}"/>
       <rect width="${px}" height="${px}" fill="url(#teal)"/>
       <rect width="${px}" height="${px}" fill="url(#guld)"/>
     </svg>`,
  );
}

/**
 * Ét ikon.
 *
 * `andel` er stjernens bredde som del af fladen, og forskellen mellem de to
 * udgaver er hele pointen:
 *
 *   any      0,64 — styresystemet runder selv hjørnerne af, og mærket skal
 *                   fylde uden at røre dem.
 *   maskable 0,52 — KUN de inderste 80 % er sikre, og nogle launchere tager
 *                   mere. En stjernes spidser når helt ud til sin egen
 *                   kasse, så der skal være luft, den kan miste.
 */
async function lav(px, andel) {
  const stjerne = await hentStjerne();
  const maal = Math.round(px * andel);
  const lag = await sharp(stjerne)
    .resize(maal, maal, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  /* TO PIPELINES OG IKKE ÉN. `sharp` kører sine trin i en fast orden og ikke
     i kaldenes — `composite` lægges på EFTER `resize`. Bygges baggrund,
     skalering og pålægning i én kæde, lander laget på noget, der allerede er
     skaleret. Det var præcis dén fejl, der gav produktfotoet to menuer. */
  return sharp(baggrund(px))
    .composite([
      {
        input: lag,
        left: Math.round((px - maal) / 2),
        top: Math.round((px - maal) / 2),
      },
    ])
    .png()
    .toBuffer();
}

const FILER = [
  /* Manifestets "any" — Android og desktop. */
  { sti: "public/icon-192.png", px: 192, andel: 0.64 },
  { sti: "public/icon-512.png", px: 512, andel: 0.64 },
  /* Manifestets "maskable" — EGEN FIL. Den må ikke dele fil med "any":
     den ene skal fylde, den anden skal holde sig inden for 80 %. */
  { sti: "public/icon-maskable-512.png", px: 512, andel: 0.52 },
  /* Fanebladet. Opak og ikke gennemsigtig: en mørk fanelinje ville ellers
     sluge mærket. */
  { sti: "src/app/icon.png", px: 512, andel: 0.64 },
  /* iOS' hjemmeskærm. Understøtter slet ikke gennemsigtighed - et ikon med
     alfa bliver lagt på sort. */
  { sti: "src/app/apple-icon.png", px: 180, andel: 0.64 },
];

for (const f of FILER) {
  const ud = await lav(f.px, f.andel);
  writeFileSync(f.sti, ud);
  console.log(`${f.sti.padEnd(34)} ${f.px}px  stjerne ${Math.round(f.andel * 100)} %`);
}

console.log("\nFærdig. Husk at manifesterne peger på icon-maskable-512.png.");
