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
const BAGPLADE_D = "M 0 0.148438 L 340.15625";
const LAERRED_D = "M 0 0.148438 L 340 0.148438";
const STANDER_D = "M 0 0.148438 L 339.8125";

/**
 * Udsnittet: standerens egen firkant, målt i eksporten fra 27. august (2).
 * Samme tal i begge filer — de er nu ens ud over farverne.
 */
const UDSNIT = "0 0.148438 339.8125 544.234374";
const LAERRED_VIEWBOX = /viewBox="0 0 340\.5 544\.499983"/g;

/** Højden rettes med, så billedets iboende sideforhold passer til udsnittet. */
const HOEJDE_FRA = /height="726"/g;
const HOEJDE_TIL = 'height="727"';

/**
 * Geometriankrene — de præcise strenge, `MAAL` i skilt-format.ts er målt på.
 * Kun skivefarven skiller de to filer ad; alt andet står ens i dem begge.
 */
function ankre(skive) {
  return [
    ['transform="matrix(1, 0, 0, 1, 28, 17)"', "logofeltets gruppe"],
    [
      `<path fill="${skive}" d="M 0.753906 0.726562 L 283.265625 0.726562 L 283.265625 114.261719`,
      "logofeltets flade",
    ],
    ['transform="matrix(1, 0, 0, 1, 29, 253)"', "NFC-feltets gruppe"],
    [
      `<path fill="${skive}" d="M 0.03125 0.722656 L 119.113281 0.722656 L 119.113281 115.761719`,
      "NFC-feltets flade",
    ],
    ['transform="matrix(1, 0, 0, 1, 195, 253)"', "QR-pladsholderen"],
  ];
}

/**
 * PLADSHOLDERNE MÆRKES OP, SÅ DE KAN FJERNES — ikke males over.
 *
 * Logofeltet og QR-feltet er attrapper: de skal væk i det øjeblik, kunden har
 * et logo og en adresse. Før blev der lagt en flade i baggrundsfarven hen
 * over dem. På skærmen forsvandt de, for fladen havde nøjagtig samme farve
 * som arket — men et dækrektangel er stadig et OBJEKT, og et RIP kan lægge
 * blæk på det, hvor baggrunden ikke får blæk. Trykket viste derfor en sort
 * firkant bag logoet, i præcis den farve baggrunden skulle have.
 *
 * Nu skæres attrapperne ud i stedet. Der er intet at trykke, hvor der ikke
 * skal være noget.
 *
 * DE TRE DELE AF LOGOFELTET LIGGER IKKE SAMLET: bunden og den turkise ramme
 * står midt i dokumentet, mens ordene "Dit logo" ligger allersidst — Canva
 * grupperer efter lag, ikke efter hvad der hører sammen. Derfor mærkes hver
 * del for sig, og de findes på deres `transform`, som er entydig og ikke
 * ændrer sig med farverne.
 */
const PLADSHOLDERE = [
  { navn: "LOGOFELT", anker: 'transform="matrix(1, 0, 0, 1, 28, 17)"', slags: "g", hvad: "logofeltets bund" },
  {
    navn: "LOGOFELT",
    anker: 'transform="matrix(0.749242, 0, 0, 0.749242, 28.753556, 17.726135)"',
    slags: "path",
    hvad: "rammen om logofeltet",
  },
  { navn: "LOGOFELT", anker: 'transform="matrix(1, 0, 0, 1, 96, 38)"', slags: "g", hvad: 'ordene "Dit logo"' },
  { navn: "QRFELT", anker: 'transform="matrix(1, 0, 0, 1, 195, 253)"', slags: "g", hvad: "QR-attrappen" },
];

/**
 * Sætter kommentarmærker om det element, `anker` står i.
 *
 * En `<g>` findes ved at tælle åbne og lukkede tags, så gruppens egne
 * undergrupper tages med. En `<path …/>` slutter ved sit eget `/>`.
 *
 * TOMME GRUPPER SKRIVES `<g/>` og har ingen afslutning. Talte de med som
 * åbnede, løb tælleren et niveau for langt og tog et `</g>` for meget med —
 * dokumentet mistede en lukning, uden at noget så forkert ud i browseren.
 * Canva laver dem for hvert mellemrum i en tekst, så "Dit logo" har én.
 */
function omslut(svg, { navn, anker, slags, hvad }, fil) {
  const traef = svg.indexOf(anker);
  if (traef < 0) throw new Error(`${fil}: fandt ikke ${hvad} (${anker}).`);
  if (svg.indexOf(anker, traef + 1) >= 0)
    throw new Error(`${fil}: ${hvad} står mere end ét sted. Ankret duer ikke længere.`);

  const start = svg.lastIndexOf(`<${slags}`, traef);
  if (start < 0) throw new Error(`${fil}: fandt ikke starten på ${hvad}.`);

  let slut;
  if (slags === "path") {
    slut = svg.indexOf("/>", traef);
    if (slut < 0) throw new Error(`${fil}: ${hvad} lukker ikke.`);
    slut += 2;
  } else {
    let i = svg.indexOf(">", traef);
    let dybde = 1;
    for (;;) {
      const aabn = svg.indexOf("<g", i + 1);
      const luk = svg.indexOf("</g>", i + 1);
      if (luk < 0) throw new Error(`${fil}: ${hvad} lukker ikke.`);
      if (aabn >= 0 && aabn < luk) {
        const tagSlut = svg.indexOf(">", aabn);
        if (tagSlut < 0) throw new Error(`${fil}: uafsluttet <g i ${hvad}.`);
        if (svg[tagSlut - 1] !== "/") dybde++;
        i = tagSlut;
        continue;
      }
      dybde--;
      if (dybde === 0) { slut = luk + 4; break; }
      i = luk + 3;
    }
  }

  return (
    svg.slice(0, start) + `<!--${navn}-->` + svg.slice(start, slut) + `<!--/${navn}-->` + svg.slice(slut)
  );
}

const FILER = [
  {
    navnetPaaVarianten: "sort",
    til: "skabelon-sort.ts",
    navn: "SKABELON_SORT",
    bg: "#000000",
    skive: "#171717",
    ring: "#545454",
  },
  {
    navnetPaaVarianten: "hvid",
    til: "skabelon-hvid.ts",
    navn: "SKABELON_HVID",
    bg: "#ffffff",
    skive: "#f6f6f6",
    /*
     * SAMME MØRKEGRÅ SOM I DEN SORTE FIL. Den hvide eksport havde tidligere
     * #d9d9d9 her; fra 27. august står begge med #545454. Det har ingen
     * betydning for, hvad der trykkes — stregen afledes af baggrunden i
     * `ringFarve()`, og en hvid stander får stadig sin lyse tone. Literalen
     * skal bare kunne findes.
     */
    ring: "#545454",
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
      return s.includes(f.skive) && s.includes(`<path fill="${f.bg}" d="${STANDER_D}`);
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
  for (const [anker, hvad] of ankre(f.skive)) {
    if (!s.includes(anker)) {
      throw new Error(
        `${fra}: ${hvad} står ikke, hvor MAAL i src/lib/skilt-format.ts er målt op.\n` +
          `  Ledte efter: ${anker}\n` +
          `  Designet er flyttet i Canva. Mål feltet op på ny og ret MAAL — ` +
          `ellers tegnes QR-koden og logoet ved siden af, hvor de hører hjemme.`,
      );
    }
  }

  // 0) Attrapperne mærkes op, før farverne skiftes: ankrene er `transform`-
  //    strenge og påvirkes ikke af erstatningerne, men mærkerne skal sidde
  //    om det RÅ element, så det kan skæres ud i ét stykke.
  for (const p of PLADSHOLDERE) s = omslut(s, p, fra);

  // 1) Selve skiltet. Ankret på bredden, ikke på farven: i den hvide fil har
  //    lærredet og standeren samme #ffffff.
  s = erstat(
    s,
    new RegExp(`<path fill="${f.bg}" d="${STANDER_D}`, "g"),
    `<path fill="{{BG}}" d="${STANDER_D}`,
    1,
    "standerens flade",
    fra,
  );

  // 2) Bagpladen og lærredet slås fra. `fill="none"` frem for at slette
  //    stien: mindre indgreb i et dokument, vi ikke selv har tegnet.
  for (const [farve, d, hvad] of [
    ["#b4b4b4", BAGPLADE_D, "Canvas grå bagplade"],
    ["#ffffff", LAERRED_D, "lærredet"],
  ]) {
    s = erstat(
      s,
      new RegExp(`<path fill="${farve}" d="${d}`, "g"),
      `<path fill="none" d="${d}`,
      1,
      hvad,
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
  s = erstat(s, LAERRED_VIEWBOX, `viewBox="${UDSNIT}"`, 1, "viewBox", fra);
  s = erstat(s, HOEJDE_FRA, HOEJDE_TIL, 1, "højden", fra);

  const ud = `/* GENERERET af scripts/lav-print-skabelon.mjs — ret ikke i hånden.
 * Kilde: "${fra}". {{BG}}, {{ACCENT}}, {{SKIVE}} og {{RING}} udfyldes af
 * src/lib/skilt.ts. ${antalAccent} accentfarver blev fundet.
 * Geometrien er kontrolleret mod MAAL i src/lib/skilt-format.ts.
 * Attrapperne er mærket <!--LOGOFELT--> og <!--QRFELT--> og skæres ud af
 * byggSkilt(), når kunden har et logo og en adresse. */
export const ${f.navn} = ${JSON.stringify(s)};
`;
  writeFileSync(join("src/lib/print", f.til), ud);
  console.log(f.til, "←", fra, "·", antalAccent, "accent, geometri OK");
}
