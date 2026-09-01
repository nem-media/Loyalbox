import { normaliserHex } from "./stander-tilvalg";

/**
 * Skiltets mål og geometri — det, både serveren og browseren skal kende.
 *
 * EGEN FIL, fordi `skilt.ts` er `server-only`: den importerer to skabeloner på
 * 155 KB hver, og previewet i bestillingen ville trække dem med ind i
 * browserens bundt bare for at kende en radius.
 *
 * ALLE TAL ER MÅLT I SKABELONEN og ikke skønnet. Et tal, der er en enhed
 * forkert, ses ikke i en editor — det ses på et trykt skilt.
 */

export type Variant = "sort" | "hvid";

/**
 * Skiltets mål — standerens egen firkant, ikke Canvas lærred.
 *
 * Skabelonernes viewBox skæres af generatoren ind til netop denne firkant, så
 * (0, 0) er skiltets øverste venstre hjørne. Canva lægger et par enheders tomt
 * lærred uden om designet, og det ville ellers blive til en gennemsigtig
 * stribe langs previewets kant, hvor silhuetten så ikke fulgte skiltet.
 */
export const SKILT_BREDDE = 351.242188;
export const SKILT_HOEJDE = 552.933594;

/** Standerens afrundede hjørner. */
export const HJOERNE_R = 15.601562;

export interface Felt {
  x: number;
  y: number;
  bredde: number;
  hoejde: number;
}

/**
 * FELTERNE I SKABELONEN. Ét sæt tal til begge filer — de er ens ud over
 * farverne.
 *
 * MÅLT I EKSPORTEN 31. AUGUST (`_design-selv_online (1)`) ad to uafhængige
 * veje: med getBBox i browseren og ved at regne tallene ud af filernes egne
 * `d`-strenge. De to veje gav det samme, og de to filer gav det samme.
 *
 * DE HAR VÆRET UENIGE ÉN GANG. I eksporten tidligere samme dag lå den hvide
 * fils nederste blok 5 enheder lavere end den sortes, og logofeltet var 5
 * enheder højere; en kunde, der skiftede standerfarve, ville have set sit logo
 * skifte størrelse. Derfor prøves BEGGE skabeloner mod netop dette ene sæt i
 * `skilt-skabelon.test.ts` — driver de fra hinanden igen, fejler den ene af de
 * to, i stedet for at forskellen bliver skrevet ind i koden og glemt.
 *
 * Tallene er MÅLT i filerne, ikke skønnet, og `lav-print-skabelon.mjs`
 * kontrollerer ved hver kørsel, at de `d`-strenge, de er målt på, stadig står
 * der. Flytter designet sig, fejler generatoren frem for at lave en skabelon,
 * koden peger forkert i. Alle y-tal er regnet fra udsnittets øverste kant.
 */
export const MAAL = {
  /** Hele den firkant, "Dit logo" står i. */
  logo: {
    x: 35.664063,
    y: 17.429688,
    bredde: 280.121094,
    hoejde: 112.574219,
  } as Felt,

  /** QR-pladsholderens felt. */
  qr: { x: 200.816406, y: 250.734376, bredde: 114.761719, hoejde: 114.761719 } as Felt,

  /**
   * NFC-feltet. Var en cirkel indtil 27. august og er nu en afrundet firkant
   * ved siden af QR-koden — derfor et felt og ikke et centrum med en radius.
   * Bruges til at holde QR-kodens dækflade klar af den.
   */
  nfc: {
    x: 35.9375,
    y: 251.429688,
    bredde: 118.078125,
    hoejde: 114.066406,
  } as Felt,

  /**
   * Nederste kant af alt, der er tegnet. Bruges til at prøve mod foden — se
   * `FOD_START_Y`. Bomærket lå 4 mm nede i fodzonen i den første eksport af
   * det nye design; nu er der 2,5 mm luft.
   */
  indholdBund: 392.0701,
};

/**
 * Hvor meget en dækflade er større end feltet, den skjuler.
 *
 * RAMMEN OM LOGOFELTET TEGNES OVEN PÅ FELTETS KANT med en stregbredde på
 * halvanden enhed, og en streg sidder midt på sin egen sti. Dækkes kun
 * feltet, bliver den yderste halvdel stående som en tynd turkis kontur rundt
 * om kundens logo.
 *
 * To enheder er nok og går klar af alt: det nærmeste, der ligger op ad et af
 * felterne, er 5,4 enheder væk (pilen over QR-koden i den sorte fil).
 */
export const DAEK_MARGEN = 2;

/** Et felt lagt ud til alle sider — den flade, der lægges i baggrundsfarven. */
export function daek(f: Felt): Felt {
  return {
    x: f.x - DAEK_MARGEN,
    y: f.y - DAEK_MARGEN,
    bredde: f.bredde + DAEK_MARGEN * 2,
    hoejde: f.hoejde + DAEK_MARGEN * 2,
  };
}

/**
 * Skiltets fysiske mål.
 *
 * DET TRYKTE ARK ER 12 × 19,2 cm, men kun de øverste 15 cm kan ses: resten
 * sidder i standerens fod, når den står på et bord. FODEN UDLEDES af de to
 * tal frem for at stå som sit eget — så kan de ikke komme til at sige noget
 * forskelligt, og en rettet frontmåling flytter markeringen med af sig selv.
 *
 * TRYKFILEN ER ALTID HELE ARKET. Fladen skal være der, også selvom den ikke
 * kan ses, ellers står der en hvid stribe frem under foden.
 *
 * Målene bruges KUN til at markere zonen og til at fortælle kunden, hvor
 * stort skiltet er. Markeringen ligger i `SkiltPreview` og ikke i SVG'en,
 * netop fordi den ikke må trykkes med.
 */
export const SKILT_CM = {
  /** Hele det TRYKTE ark — større end standeren med vilje, se `KLIP_CM`. */
  hoejde: 19.5,
  bredde: 12.4,
  /** Den del, der kan ses, når standeren står i sin fod. */
  front: 15,
} as const;

/**
 * Det, der klippes af i hånden, før skiltet sættes i standeren.
 *
 * ARKET ER STØRRE END STANDEREN MED VILJE. Standeren er 12 cm bred, og
 * trykket lægges 12,4 cm bredt, så der er 2 mm i hver side at klippe efter;
 * i bunden er der 2 mm. Uden den overkant skal trykket ramme kanten præcist,
 * og det gør et tryk aldrig.
 *
 * DERFOR ER `SKILT_CM` ARKET OG IKKE SKILTET. Sideforholdet i tegningen skal
 * passe til det, der TRYKKES — prøven `har det sideforhold, centimetrene
 * lover` sammenligner netop de to. Det, kunden får at vide, er derimod det
 * FÆRDIGE mål, og det er `FAERDIG_CM`. De to var ens indtil 31. august, hvor
 * arket voksede, og en linje, der havde blandet dem sammen, ville nu love
 * kunden et skilt, der er 4 mm bredere end det, de får.
 */
export const KLIP_CM = { bredde: 0.4, bund: 0.2 } as const;

/** Skiltet efter klipningen — det, kunden står med. */
export const FAERDIG_CM = {
  bredde: Math.round((SKILT_CM.bredde - KLIP_CM.bredde) * 10) / 10,
  hoejde: Math.round((SKILT_CM.hoejde - KLIP_CM.bund) * 10) / 10,
} as const;

/**
 * Det, foden dækker. Udledt, aldrig skrevet af.
 *
 * AFRUNDET, fordi et fradrag som 19,5 − 15 giver et flydende tal med hale, og
 * tallet skal kunne skrives til en kunde.
 *
 * Bemærk at den regnes af ARKET og derfor også indeholder de 2 mm, der
 * klippes af i bunden. Det er med vilje: begge dele er noget, kunden aldrig
 * ser, og linjen, designet ikke må krydse, skal ligge over dem begge.
 */
export const FOD_CM = Math.round((SKILT_CM.hoejde - SKILT_CM.front) * 10) / 10;

/**
 * Tal med dansk komma.
 *
 * HÅNDLAVET FREM FOR toLocaleString: konstanten regnes ud på både serveren og
 * i browseren, og et Node uden fuld ICU ville skrive "19.2", hvor browseren
 * skriver "19,2". Så er der en hydreringsfejl på en tekst, ingen kigger på.
 */
export function cmTekst(n: number): string {
  return String(n).replace(".", ",");
}

/**
 * Skiltets mål, som kunden ser dem.
 *
 * KUN FRONTEN, OG KUN DET FÆRDIGE SKILT. Arket er både bredere og højere end
 * det, kunden får: det trykkes 12,4 cm bredt og klippes ned til 12, og de
 * nederste centimeter sidder i foden. Begge dele er tryktekniske detaljer,
 * kunden ikke får noget ud af. Det tal, de skal bruge, er hvor stort skiltet
 * står på bordet.
 *
 * BRUG DERFOR `FAERDIG_CM` OG IKKE `SKILT_CM` her. De var ens indtil 31.
 * august; siden ville `SKILT_CM.bredde` love 4 mm for meget.
 *
 * Begge bestillingsformularer viser den samme linje; to håndskrevne udgaver
 * bliver til to forskellige mål på det samme skilt.
 */
export const FRONT_MAAL = `Fronten er ${cmTekst(
  FAERDIG_CM.bredde,
)} cm bred og ${cmTekst(SKILT_CM.front)} cm høj.`;

/** Fodens højde i skiltets egne enheder. */
export const FOD_HOEJDE = (FOD_CM / SKILT_CM.hoejde) * SKILT_HOEJDE;

/** Hvor foden begynder — den linje, designet ikke bør krydse. */
export const FOD_START_Y = SKILT_HOEJDE - FOD_HOEJDE;

/* ------------------------------------------------- previewets eget udsnit */

/**
 * DET, DER KLIPPES AF PREVIEWETS BUND — KUN PÅ SKÆRMEN.
 *
 * Previewet viste frontens fulde 15 cm. Men designet slutter ved
 * `MAAL.indholdBund`, og derfra og ned til fodlinjen er der godt en
 * centimeter tom baggrund. PÅ DET TRYKTE ARK SKAL DEN FLADE VÆRE DER — uden
 * den står en hvid stribe frem under standeren — men på en skærm læste den
 * som en tom bund, skiltet ikke havde brug for. Halvdelen af den tages her.
 *
 * TALLET RØRER KUN BEHOLDEREN I `SkiltPreview`. Det holdes BEVIDST adskilt
 * fra `SKILT_CM.front`: fronten er et FYSISK mål — det, foden lader stå
 * tilbage — og den bærer både `FOD_START_Y`, som designet ikke må krydse, og
 * `FRONT_MAAL`, som lover kunden en højde. Slås de to sammen, flytter et
 * kosmetisk udsnit på en skærm både trykkets sikkerhedslinje og det, vi
 * skriver til kunden.
 *
 * EN HALV CENTIMETER OG IKKE EN HEL. Første forsøg tog hele centimeteren, og
 * det var en halv for meget: skiltet kom til at sidde for tæt på beholderens
 * kant. Det er altså IKKE grænsen, der bestemmer tallet — der er plads til
 * mere — men øjemålet.
 *
 * GRÆNSEN ER DER ALLIGEVEL, og den er værd at kende: ved knap 1,2 cm rammer
 * udsnittet `MAAL.indholdBund` og begynder at skære i selve designet, så
 * previewet ville vise et andet skilt, end der bliver trykt. Ved en halv
 * centimeter er der 6,7 mm luft ned til den. `skilt.test.ts` prøver netop
 * den grænse — også så en ny Canva-eksport ikke kan skubbe indholdet ned i
 * klippet.
 */
export const PREVIEW_KLIP_CM = 0.5;

/**
 * Previewets synlige højde. Afrundet, fordi et fradrag mellem decimaltal
 * ellers giver en hale, der ville stå i en `aspect-ratio`.
 */
export const PREVIEW_HOEJDE_CM =
  Math.round((SKILT_CM.front - PREVIEW_KLIP_CM) * 10) / 10;

/**
 * Relativ lyshed efter WCAG. Bruges til tre ting: at vælge skabelon, at
 * afgøre hvilken vej en nuance skal gå, og at advare når en valgt farve
 * forsvinder i baggrunden.
 */
export function lyshed(hex: string): number {
  const h = normaliserHex(hex) ?? "#000000";
  const kanal = (v: number) => {
    const s = v / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  };
  const r = kanal(parseInt(h.slice(1, 3), 16));
  const g = kanal(parseInt(h.slice(3, 5), 16));
  const b = kanal(parseInt(h.slice(5, 7), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Kontrastforhold mellem to farver, 1–21. */
export function kontrast(a: string, b: string): number {
  const [l1, l2] = [lyshed(a), lyshed(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/**
 * Hvilken skabelon passer til baggrunden?
 *
 * VALGT PÅ LYSHED OG IKKE PÅ STANDERENS FARVE. Vælger kunden sin egen
 * baggrund, er det den, stregerne og QR-koden skal kunne ses på. Grænsen
 * 0,18 er der, hvor hvid og sort tekst er lige læselige.
 *
 * Det er samtidig dét, der holder QR-koden skanbar: den sorte fil har lyse
 * moduler, den hvide har mørke, og de følger med skabelonen.
 */
export function skabelonTil(baggrund: string): "sort" | "hvid" {
  return lyshed(baggrund) < 0.18 ? "sort" : "hvid";
}

/* --------------------------------------------------------------- nuancer */

/**
 * Blander en farve mod hvid eller sort.
 *
 * `styrke` er andelen, der blandes i: 0 giver farven selv, 1 giver rent hvidt
 * eller sort. Blandingen sker i rå RGB og ikke i et perceptuelt rum — det er
 * netop dét, skabelonens egne værdier er lavet med, og de skal kunne rammes
 * præcist (se `skiveFarve`).
 */
export function nuance(hex: string, styrke: number, mod: "hvid" | "sort"): string {
  const h = normaliserHex(hex) ?? "#000000";
  const maal = mod === "hvid" ? 255 : 0;
  const kanal = (i: number) => {
    const v = parseInt(h.slice(1 + i * 2, 3 + i * 2), 16);
    return Math.round(v + (maal - v) * styrke)
      .toString(16)
      .padStart(2, "0");
  };
  return `#${kanal(0)}${kanal(1)}${kanal(2)}`;
}

/**
 * Hvor meget en nuance flytter sig — og hvorfor de to retninger ikke er ens.
 *
 * TALLENE ER IKKE VALGT AF MIG. De er regnet baglæns ud af designerens egne
 * to filer, så en afledt farve rammer skabelonens præcist: sort bund gav
 * #171717 og #545454, hvid bund gav #f6f6f6 og #d9d9d9. Testen holder dem
 * fast, så en ændring her ikke stille kan komme til at tegne noget andet,
 * end der er tegnet i Canva.
 *
 * At de to retninger ikke er lige store, er ikke en fejl: mørke toner ligger
 * tættere sammen for øjet, så et skridt væk fra sort skal være større end
 * det tilsvarende skridt væk fra hvid for at ses lige tydeligt.
 */
const NUANCE_STYRKE = {
  hvid: { skive: 0.09, ring: 0.33 },
  sort: { skive: 0.035, ring: 0.15 },
} as const;

/**
 * Hvilken vej skal en nuance gå?
 *
 * Væk fra yderpunktet: en mørk bund lysnes, en lys bund mørknes. Samme
 * grænse som `skabelonTil`, så skabelonvalget og nuanceretningen ALDRIG kan
 * være uenige — en lys nuance på den sorte skabelon ville se ud som en fejl.
 */
function retning(baggrund: string): "hvid" | "sort" {
  return skabelonTil(baggrund) === "sort" ? "hvid" : "sort";
}

/**
 * Logofeltets bund og NFC-cirklen.
 *
 * DEN FØLGER BAGGRUNDEN, men ikke helt: den er kundens egen farve, en anelse
 * lysere på en mørk bund og en anelse mørkere på en lys. Før stod cirklen
 * med skabelonens faste sort, så en bordeaux stander fik en sort plet midt
 * på — cirklen så ud til at høre til et andet skilt.
 */
export function skiveFarve(baggrund: string): string {
  const vej = retning(baggrund);
  return nuance(baggrund, NUANCE_STYRKE[vej].skive, vej);
}

/** Stregen om NFC-cirklen. Samme vej som skiven, men et skridt længere ud. */
export function ringFarve(baggrund: string): string {
  const vej = retning(baggrund);
  return nuance(baggrund, NUANCE_STYRKE[vej].ring, vej);
}

/* ------------------------------------------- mål i procent, til browseren */

/** Et felt i skiltets enheder omregnet til procent af hele billedet. */
export function iProcent(f: Felt) {
  return {
    venstre: (f.x / SKILT_BREDDE) * 100,
    top: (f.y / SKILT_HOEJDE) * 100,
    bredde: (f.bredde / SKILT_BREDDE) * 100,
    hoejde: (f.hoejde / SKILT_HOEJDE) * 100,
  };
}



/**
 * Standerens afrundede hjørner som en CSS-radius.
 *
 * TO PROCENTTAL OG IKKE ÉT: en procentradius regnes af hver sin akse, så ét
 * tal alene ville give en oval på et højformat.
 *
 * Den lodrette procent regnes af BEHOLDERENS højde, og previewet viser kun
 * sit eget udsnit — brugtes hele arkets højde, ville hjørnet blive fladtrykt.
 * Derfor `PREVIEW_HOEJDE_CM` og ikke `SKILT_CM.front`: bliver udsnittet
 * klippet en centimeter kortere, skal hjørnet følge med, ellers tegnes en
 * radius for en beholder, der ikke findes. Kun de to øverste hjørner sættes:
 * nederst er skiltet skåret, ikke afrundet.
 */
export const HJOERNE_RADIUS_FRONT = `${(HJOERNE_R / SKILT_BREDDE) * 100}% ${
  (HJOERNE_R / (SKILT_HOEJDE * (PREVIEW_HOEJDE_CM / SKILT_CM.hoejde))) * 100
}%`;

/**
 * Trækker modulerne ud af `qrcode`s SVG-svar.
 *
 * EGEN FUNKTION, FORDI DET ER HER, DET GIK GALT. Svaret indeholder TO stier:
 * en hvid baggrundsflade og selve koden — og koden er tegnet med STROKE, ikke
 * fill: åbne, vandrette linjer på halve koordinater (`M0 0.5h7m3 0h1…`) med
 * en stregbredde på 1. Første udgave satte en fyldning på dem, og QR-feltet
 * stod næsten tomt med et par svage konturer. Set i previewet, ikke gættet.
 *
 * Eksporteret for at kunne prøves mod bibliotekets faktiske output, så en
 * opdatering, der ændrer formen på svaret, bliver fanget her og ikke af en
 * kunde med et ubrugeligt skilt.
 */
export function laesQrSvg(raa: string): { d: string; net: number } | null {
  // Sidste sti er koden; den første er baggrunden, vi ikke bruger.
  const sti = raa.match(/<path[^>]*\/>/g)?.pop();
  const d = sti?.match(/d="([^"]+)"/)?.[1];
  const net = Number(raa.match(/viewBox="0 0 (\d+)/)?.[1] ?? 0);
  if (!d || !net || !sti?.includes("stroke=")) return null;
  return { d, net };
}

/**
 * Modulernes farve pr. skabelon.
 *
 * BEMÆRK AT DEN SORTE ER INVERTERET: lyse moduler på mørk bund. Det er
 * designets eget valg — pladsholderen ser sådan ud — og telefonkameraer
 * læser inverterede koder. Skal det laves om, er det HER, og så skal
 * baggrunden bag koden også skifte, ellers forsvinder den.
 */
export const QR_MODUL = { sort: "#ffffff", hvid: "#000000" } as const;
