// Genererer produkt-mockups (SVG) til standerne ud fra det godkendte design.
// Placeholder-billeder — udskiftes med rigtige fotos inden lancering.
// Kør: node scripts/generate-mockups.mjs
import { mkdirSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const outDir = join(dirname(fileURLToPath(import.meta.url)), "..", "public", "mockups");
mkdirSync(outDir, { recursive: true });

const STAR =
  "M0,-11 L3.2,-3.4 11,-3.4 4.9,1.3 7.1,9 0,4.5 -7.1,9 -4.9,1.3 -11,-3.4 -3.2,-3.4 Z";
const GOLD = "#c9a24b";

const star = (x, y, s, color) =>
  `<path transform="translate(${x},${y}) scale(${s})" d="${STAR}" fill="${color}"/>`;

/** Platform-blok for en enkelt platform (label + 5 stjerner). */
function singleBlock(label, labelColor, starColor) {
  const stars = [332, 366, 400, 434, 468]
    .map((x) => star(x, 404, 1, starColor))
    .join("");
  return `<text x="400" y="378" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="${labelColor}" letter-spacing="3">${label}</text>${stars}`;
}

/** Platform-blok for alt-i-én (tre kolonner som det fysiske produkt). */
function multiBlock() {
  const cols = [
    { label: "GOOGLE", color: GOLD, star: "#e8b53e", cx: 318 },
    { label: "TRUSTPILOT", color: "#00b67a", star: "#00b67a", cx: 400 },
    { label: "FACEBOOK", color: "#1877f2", star: "#1877f2", cx: 482 },
  ];
  const parts = cols
    .map((c) => {
      const label = `<text x="${c.cx}" y="372" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" font-weight="700" fill="${c.color}">${c.label}</text>`;
      const stars = [-22, -11, 0, 11, 22]
        .map((o) => star(c.cx + o, 392, 0.46, c.star))
        .join("");
      return label + stars;
    })
    .join("");
  const dividers =
    `<line x1="359" y1="358" x2="359" y2="400" stroke="${GOLD}" stroke-width="1" opacity="0.5"/>` +
    `<line x1="441" y1="358" x2="441" y2="400" stroke="${GOLD}" stroke-width="1" opacity="0.5"/>`;
  return parts + dividers;
}

/** Tydeligt "INKL. LOYALBOX"-badge til komplet-varianterne. */
const KOMPLET_BADGE = `<g>
<rect x="34" y="36" width="256" height="56" rx="28" fill="#1b916a"/>
<path d="M58,64 l8,8 l16,-18" fill="none" stroke="#ffffff" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round"/>
<text x="178" y="72" text-anchor="middle" font-family="Arial, sans-serif" font-size="21" font-weight="700" fill="#ffffff" letter-spacing="1">INKL. LOYALBOX</text>
</g>`;

function svg(platformBlock, komplet = false) {
  return `<svg viewBox="0 0 800 1000" xmlns="http://www.w3.org/2000/svg" role="img">
<rect x="0" y="0" width="800" height="1000" rx="28" fill="#e9ebee"/>
<ellipse cx="412" cy="744" rx="210" ry="22" fill="#000000" opacity="0.13"/>
<polygon points="236,646 268,628 600,628 568,646" fill="#17171c"/>
<polygon points="568,646 600,628 600,710 568,728" fill="#050506"/>
<rect x="232" y="646" width="336" height="82" rx="6" fill="#0a0a0c"/>
<rect x="244" y="650" width="300" height="3" rx="1.5" fill="#33333a"/>
<polygon points="260,140 294,120 574,120 540,140" fill="#1c1c22"/>
<polygon points="550,150 584,130 584,652 550,660" fill="#16161b"/>
<rect x="250" y="140" width="300" height="520" rx="12" fill="#121215"/>
<line x1="550" y1="150" x2="550" y2="656" stroke="#7c7c8a" stroke-width="2" opacity="0.8"/>
<line x1="252" y1="150" x2="252" y2="654" stroke="#ffffff" stroke-width="1.5" opacity="0.10"/>
<polygon points="400,156 377.5,169 377.5,195 400,208 422.5,195 422.5,169" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
<path d="M388,197 L388,171 L400,184 L412,171 L412,197" fill="none" stroke="${GOLD}" stroke-width="2.8" stroke-linejoin="round"/>
<text x="400" y="232" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#b6b6bc" letter-spacing="1.5">DIT LOGO &amp; FIRMANAVN</text>
<line x1="300" y1="250" x2="392" y2="250" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
<line x1="408" y1="250" x2="500" y2="250" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
<circle cx="400" cy="250" r="2.6" fill="${GOLD}"/>
<text x="400" y="288" text-anchor="middle" font-family="Arial, sans-serif" font-size="27" font-weight="700" fill="#f3f3f1" letter-spacing="1.5">TAK FOR DIT BESØG</text>
<text x="400" y="314" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#c2c2c8">Din anmeldelse betyder</text>
<text x="400" y="334" text-anchor="middle" font-family="Arial, sans-serif" font-size="15" fill="#c2c2c8">meget for os</text>
${platformBlock}
<line x1="300" y1="440" x2="384" y2="440" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
<line x1="416" y1="440" x2="500" y2="440" stroke="${GOLD}" stroke-width="1" opacity="0.7"/>
<path transform="translate(400,440)" d="M0,3 C-4,-3 -10,1 0,8 C10,1 4,-3 0,3 Z" fill="${GOLD}"/>
<line x1="400" y1="470" x2="400" y2="566" stroke="${GOLD}" stroke-width="1" opacity="0.4"/>
<circle cx="340" cy="500" r="33" fill="none" stroke="${GOLD}" stroke-width="2.5"/>
<rect x="332" y="492" width="16" height="24" rx="3" fill="none" stroke="${GOLD}" stroke-width="2.2"/>
<g fill="none" stroke="${GOLD}" stroke-width="2.2" stroke-linecap="round">
<path d="M350,488 a7,7 0 0 1 7,7"/>
<path d="M350,481 a14,14 0 0 1 14,14"/>
</g>
<text x="340" y="556" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#dcdce0">HOLD DIN TELEFON</text>
<text x="340" y="571" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#dcdce0">HER <tspan fill="${GOLD}" font-weight="700">(NFC)</tspan></text>
<rect x="414" y="454" width="92" height="92" rx="6" fill="#ffffff"/>
<g fill="#121215">
<rect x="419" y="459" width="27" height="27"/><rect x="425" y="465" width="15" height="15" fill="#ffffff"/><rect x="431" y="471" width="9" height="9" fill="#121215"/>
<rect x="474" y="459" width="27" height="27"/><rect x="480" y="465" width="15" height="15" fill="#ffffff"/><rect x="486" y="471" width="9" height="9" fill="#121215"/>
<rect x="419" y="514" width="27" height="27"/><rect x="425" y="520" width="15" height="15" fill="#ffffff"/><rect x="431" y="526" width="9" height="9" fill="#121215"/>
<rect x="455" y="459" width="9" height="9"/><rect x="464" y="468" width="9" height="9"/><rect x="455" y="477" width="9" height="9"/>
<rect x="491" y="495" width="9" height="9"/><rect x="482" y="504" width="9" height="9"/><rect x="464" y="513" width="9" height="9"/>
<rect x="455" y="522" width="9" height="9"/><rect x="491" y="531" width="9" height="9"/><rect x="473" y="495" width="9" height="9"/>
</g>
<rect x="450" y="490" width="30" height="30" rx="3" fill="#ffffff"/>
<polygon points="465,496 454,502.5 454,513.5 465,520 476,513.5 476,502.5" fill="none" stroke="${GOLD}" stroke-width="2"/>
<text x="460" y="562" text-anchor="middle" font-family="Arial, sans-serif" font-size="11" fill="#dcdce0">SCAN MED KAMERA</text>
<line x1="290" y1="596" x2="510" y2="596" stroke="${GOLD}" stroke-width="1" opacity="0.5"/>
<text x="400" y="628" text-anchor="middle" font-family="'Segoe Script','Brush Script MT',cursive" font-style="italic" font-size="19" fill="#d8b866">Vi glæder os til at se dig igen!</text>
${komplet ? KOMPLET_BADGE : ""}
</svg>`;
}

const variants = [
  { key: "google", block: singleBlock("GOOGLE", GOLD, "#e8b53e") },
  { key: "trustpilot", block: singleBlock("TRUSTPILOT", "#00b67a", "#00b67a") },
  { key: "tripadvisor", block: singleBlock("TRIPADVISOR", "#00aa6c", "#00aa6c") },
  { key: "facebook", block: singleBlock("FACEBOOK", "#1877f2", "#1877f2") },
  { key: "alt-i-en", block: multiBlock() },
];

let count = 0;
for (const v of variants) {
  // Standalone + komplet (med "INKL. LOYALBOX"-badge)
  writeFileSync(join(outDir, `stander-${v.key}.svg`), svg(v.block, false), "utf8");
  writeFileSync(join(outDir, `stander-${v.key}-komplet.svg`), svg(v.block, true), "utf8");
  console.log("skrev", `stander-${v.key}.svg`, "+", `stander-${v.key}-komplet.svg`);
  count += 2;
}
console.log(`Færdig — ${count} mockups i public/mockups/`);
