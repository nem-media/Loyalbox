import { describe, it, expect } from "vitest";
import {
  lyshed,
  kontrast,
  skabelonTil,
  nuance,
  skiveFarve,
  ringFarve,
  MAAL,
  daek,
  iProcent,
  FOD_HOEJDE,
  FOD_START_Y,
  SKILT_CM,
  FOD_CM,
  cmTekst,
  FAERDIG_CM,
  KLIP_CM,
  FRONT_MAAL,
  SKILT_BREDDE,
  SKILT_HOEJDE,
  PREVIEW_KLIP_CM,
  PREVIEW_HOEJDE_CM,
  laesQrSvg,
} from "./skilt-format";
import { STANDARD_ACCENT } from "./stander-tilvalg";

/**
 * Skiltets farvelogik.
 *
 * Skabelonerne er Canva-eksporter uden <text> og <circle> — 440 kurver, hvor
 * kun farverne står som literaler. Det, der kan gå galt, er derfor ikke
 * tegningen, men VALGET af farve: at der trykkes sort på sort, eller at
 * QR-koden får samme tone som bunden og holder op med at kunne skannes.
 *
 * `byggSkilt()` testes ikke her: den importerer 340 KB skabelon og er
 * `server-only`. Det, der kan regnes forkert, ligger i skilt-format.ts.
 */

describe("skabelonTil", () => {
  /**
   * DET ER DENNE, DER HOLDER QR-KODEN SKANBAR. Den sorte fil har lyse
   * moduler, den hvide har mørke. Vælges den forkerte skabelon til en
   * baggrund, får QR-koden samme tone som bunden — og et trykt skilt kan
   * ikke kaldes tilbage.
   */
  it("vælger den sorte skabelon til mørke bunde", () => {
    for (const f of ["#000000", "#111111", "#070707", "#6b1f2e", "#1e1c1a"]) {
      expect(skabelonTil(f), f).toBe("sort");
    }
  });

  it("vælger den hvide skabelon til lyse bunde", () => {
    for (const f of ["#ffffff", "#e8dfd0", "#f6f4ee", "#b4a189", "#ffb700"]) {
      expect(skabelonTil(f), f).toBe("hvid");
    }
  });

  /** Falder en farvekode ud som ugyldig, skal der vælges noget — ikke kastes. */
  it("falder tilbage frem for at fejle på noget uforståeligt", () => {
    expect(skabelonTil("ikke en farve")).toBe("sort");
    expect(skabelonTil("")).toBe("sort");
  });
});

describe("kontrast", () => {
  it("regner de yderpunkter, alt andet ligger imellem", () => {
    expect(kontrast("#000000", "#ffffff")).toBeCloseTo(21, 0);
    expect(kontrast("#4ea4ad", "#4ea4ad")).toBeCloseTo(1, 5);
  });

  it("er den samme vej rundt", () => {
    expect(kontrast("#26616e", "#ffffff")).toBeCloseTo(
      kontrast("#ffffff", "#26616e"),
      6,
    );
  });

  /**
   * LoyalSums egen accent skal kunne ses på BEGGE standere — ellers er
   * standardvalget en fejl fra starten. 3:1 er WCAG's grænse for grafik.
   */
  it("holder standardaccenten over grænsen på både sort og hvid", () => {
    expect(kontrast(STANDARD_ACCENT, "#111111")).toBeGreaterThan(3);
    expect(kontrast(STANDARD_ACCENT, "#ffffff")).toBeGreaterThan(1.9);
  });
});

describe("lyshed", () => {
  it("stiger fra sort til hvid", () => {
    expect(lyshed("#000000")).toBeCloseTo(0, 5);
    expect(lyshed("#ffffff")).toBeCloseTo(1, 5);
    expect(lyshed("#808080")).toBeGreaterThan(0.1);
    expect(lyshed("#808080")).toBeLessThan(0.3);
  });
});

describe("felterne i skabelonen", () => {
  /**
   * ÉT SÆT TAL TIL BEGGE SKABELONER. At de faktisk passer til dem begge
   * prøves i `skilt-skabelon.test.ts`, som regner dem ud af selve
   * skabelonstrengen. Her prøves kun, at tallene giver mening som geometri.
   */
  it("holder logofeltet inde på skiltet", () => {
    const f = MAAL.logo;
    expect(f.x).toBeGreaterThan(0);
    expect(f.y).toBeGreaterThan(0);
    expect(f.x + f.bredde).toBeLessThan(SKILT_BREDDE);
    // Overskriften "Din oplevelse betyder meget for os" står lige under.
    expect(f.y + f.hoejde).toBeLessThan(150);
  });

  /**
   * DÆKFLADEN SKAL VÆRE STØRRE END FELTET. Rammen tegnes oven på feltets kant,
   * og en streg sidder midt på sin egen sti: dækkes kun feltet, bliver den
   * yderste halvdel stående som en turkis kontur rundt om kundens logo.
   */
  it("dækker mere end feltet, så rammen ryger med", () => {
    const f = MAAL.logo;
    const d = daek(f);
    expect(d.x).toBeLessThan(f.x);
    expect(d.y).toBeLessThan(f.y);
    expect(d.x + d.bredde).toBeGreaterThan(f.x + f.bredde);
    expect(d.y + d.hoejde).toBeGreaterThan(f.y + f.hoejde);
  });

  /** Feltet er bredt. Et logo skal kunne fylde noget, ellers er der ingen gevinst. */
  it("giver logoet et felt værd at trykke i", () => {
    expect(MAAL.logo.bredde).toBeGreaterThan(250);
    expect(MAAL.logo.hoejde).toBeGreaterThan(90);
  });

  /**
   * Procenterne bruges til at lægge logoet oven på previewet i browseren.
   * Er de forkerte, sidder logoet ikke i feltet — og previewet holder op med
   * at vise det, der bliver trykt.
   */
  it("regner feltets plads i procent ud fra samme tal", () => {
    const p = iProcent(MAAL.logo);
    expect(p.venstre).toBeCloseTo((MAAL.logo.x / SKILT_BREDDE) * 100, 6);
    expect(p.hoejde).toBeCloseTo((MAAL.logo.hoejde / SKILT_HOEJDE) * 100, 6);
  });

  /** Koden skal være kvadratisk; et aflangt felt ville strække modulerne. */
  it("har et kvadratisk QR-felt", () => {
    expect(Math.abs(MAAL.qr.bredde - MAAL.qr.hoejde)).toBeLessThan(1);
  });

  /**
   * NFC-feltet ligger til venstre for QR-koden. Dækfladen under koden må ikke
   * æde en flig af det — så ville der stå et hak i kanten på det trykte skilt.
   */
  it("holder QR-kodens dækflade klar af NFC-feltet", () => {
    expect(daek(MAAL.qr).x).toBeGreaterThan(MAAL.nfc.x + MAAL.nfc.bredde);
  });
});

describe("nuancerne til skiven og ringen", () => {
  /**
   * DEN VIGTIGSTE PRØVE I FILEN.
   *
   * Tallene bag `skiveFarve` og `ringFarve` er regnet baglæns ud af
   * designerens egne to filer. Rammer de ikke skabelonens værdier præcist,
   * tegner vi noget andet, end der er tegnet i Canva — og forskellen er så
   * lille, at ingen opdager den før på et tryk.
   */
  it("rammer skabelonens egne farver på sort og hvid bund", () => {
    expect(skiveFarve("#000000")).toBe("#171717");
    expect(ringFarve("#000000")).toBe("#545454");
    expect(skiveFarve("#ffffff")).toBe("#f6f6f6");
    expect(ringFarve("#ffffff")).toBe("#d9d9d9");
  });

  /**
   * Den fejl, det hele handler om: cirklen stod før med skabelonens faste
   * sort, så en bordeaux stander fik en sort plet midt på. Nu SKAL den følge
   * kundens farve — uden at være den samme, ellers forsvinder den.
   */
  it("følger kundens farve uden at være den samme", () => {
    const bund = "#6b1f2e";
    for (const f of [skiveFarve(bund), ringFarve(bund)]) {
      expect(f).not.toBe(bund);
      // Tættere på bunden end på noget yderpunkt — det er en nuance, ikke en kontrast.
      expect(kontrast(f, bund)).toBeLessThan(3);
      expect(kontrast(f, bund)).toBeGreaterThan(1);
    }
  });

  /** Ringen skal ligge længere ude end skiven, ellers kan de ikke skelnes. */
  it("lægger ringen længere fra bunden end skiven", () => {
    for (const bund of ["#000000", "#ffffff", "#6b1f2e", "#e8dfd0"]) {
      expect(kontrast(ringFarve(bund), bund), bund).toBeGreaterThan(
        kontrast(skiveFarve(bund), bund),
      );
    }
  });

  /**
   * RETNINGEN SKAL FØLGE SKABELONEN. En mørk bund lysnes, en lys mørknes —
   * og grænsen er den samme som `skabelonTil`, så en lys nuance aldrig kan
   * lande på den sorte skabelon.
   */
  it("lysner mørke bunde og mørkner lyse", () => {
    for (const bund of ["#000000", "#111111", "#1e1c1a", "#6b1f2e"]) {
      expect(lyshed(skiveFarve(bund)), bund).toBeGreaterThan(lyshed(bund));
    }
    for (const bund of ["#ffffff", "#f6f4ee", "#ffb700", "#b4a189"]) {
      expect(lyshed(skiveFarve(bund)), bund).toBeLessThan(lyshed(bund));
    }
  });

  it("giver farven selv ved styrke 0 og yderpunktet ved 1", () => {
    expect(nuance("#6b1f2e", 0, "hvid")).toBe("#6b1f2e");
    expect(nuance("#6b1f2e", 1, "hvid")).toBe("#ffffff");
    expect(nuance("#6b1f2e", 1, "sort")).toBe("#000000");
  });
});

describe("foden", () => {
  /**
   * Arket trykkes 12,4 × 19,5 cm, klippes ned til 12 × 19,3, og kun de
   * øverste 15 cm kan ses. TALLENE BRUGES KUN TIL MARKERINGEN I PREVIEWET —
   * trykfilen er altid hele arket, ellers står der en hvid stribe frem under
   * foden.
   */
  it("udleder foden af arket og fronten", () => {
    expect(FOD_CM).toBeCloseTo(SKILT_CM.hoejde - SKILT_CM.front, 6);
    // Skrives til kunden, så det må ikke være 4,499999999999999. Prøven
    // hænger på FORMEN og ikke på tallet: arkets højde ændrer sig, når
    // designet gør, og et hårdkodet "4,2" ville så fejle uden at noget var
    // galt — mens en hale på seksten decimaler stadig ville slippe igennem.
    expect(cmTekst(FOD_CM)).toMatch(/^\d+(,\d)?$/);
    expect(FOD_HOEJDE).toBeCloseTo(
      (FOD_CM / SKILT_CM.hoejde) * SKILT_HOEJDE,
      6,
    );
    expect(FOD_START_Y + FOD_HOEJDE).toBeCloseTo(SKILT_HOEJDE, 6);
  });

  /**
   * DE OPGIVNE CENTIMETER SKAL PASSE TIL TEGNINGEN. Vi skriver "12 cm bred og
   * 15 cm høj" til kunden, og det er kun sandt, hvis arkets sideforhold er
   * 12 : 19,2. Skifter en Canva-eksport format, bliver de tal forkerte uden at
   * noget andet fejler — og en kunde bestiller et skilt i en anden størrelse,
   * end der står.
   */
  it("har det sideforhold, centimetrene lover", () => {
    expect(SKILT_BREDDE / SKILT_HOEJDE).toBeCloseTo(
      SKILT_CM.bredde / SKILT_CM.hoejde,
      2,
    );
  });

  /** Foden dækker en femtedel til en fjerdedel. Er tallet vildt forkert, er en enhed gået tabt. */
  it("dækker omtrent en femtedel", () => {
    expect(FOD_HOEJDE / SKILT_HOEJDE).toBeGreaterThan(0.15);
    expect(FOD_HOEJDE / SKILT_HOEJDE).toBeLessThan(0.3);
  });

  /**
   * DEN PRØVE, DER FANGEDE FEJLEN. I den første eksport af det nye design rakte
   * bomærket 11,4 enheder ned i det, foden dækker — den nederste tredjedel af
   * bogstaverne ville være væk på et trykt skilt. Nu er der 2,5 mm luft, og
   * prøven står tilbage, så en ny eksport ikke stille kan skubbe noget derned.
   */
  it("holder alt tegnet indhold fri af foden", () => {
    expect(MAAL.indholdBund).toBeLessThan(FOD_START_Y);
  });

  /**
   * QR-koden og NFC-feltet er dét, skiltet er til for. Ryger de ned i foden,
   * er skiltet ubrugeligt, uanset hvor pænt det er.
   */
  it("holder QR-koden og NFC-feltet fri af foden", () => {
    for (const f of [daek(MAAL.qr), MAAL.nfc]) {
      expect(f.y + f.hoejde).toBeLessThan(FOD_START_Y);
    }
  });
});

/**
 * PREVIEWETS UDSNIT ER KOSMETIK — og det er lige præcis derfor, det skal
 * prøves. Et tal, der kun findes for at se godt ud på en skærm, sidder tæt
 * op ad tre tal, der IKKE er kosmetik: fodlinjen designet ikke må krydse,
 * højden vi lover kunden, og indholdets egen bund. Skrider udsnittet, er der
 * ingen, der opdager det — previewet ser stadig fint ud, det viser bare ikke
 * det, der bliver trykt.
 */
describe("previewets udsnit", () => {
  it("klipper noget væk, men er stadig et udsnit af fronten", () => {
    expect(PREVIEW_KLIP_CM).toBeGreaterThan(0);
    expect(PREVIEW_HOEJDE_CM).toBeCloseTo(SKILT_CM.front - PREVIEW_KLIP_CM, 6);
    expect(PREVIEW_HOEJDE_CM).toBeLessThan(SKILT_CM.front);
  });

  /**
   * DEN GRÆNSE, DER BINDER. Designet slutter ved `MAAL.indholdBund`, og
   * previewets nederste kant skal ligge under den — ellers skæres der i selve
   * skiltet, og kunden godkender noget andet, end der bliver trykt. Der er
   * knap 5 enheder (1,7 mm) tilbage ved én centimeter, så den næste
   * centimeter er der ikke plads til.
   */
  it("skærer ikke i selve designet", () => {
    const previewBund = SKILT_HOEJDE * (PREVIEW_HOEJDE_CM / SKILT_CM.hoejde);
    expect(previewBund).toBeGreaterThan(MAAL.indholdBund);
    for (const f of [daek(MAAL.logo), daek(MAAL.qr), MAAL.nfc]) {
      expect(f.y + f.hoejde, JSON.stringify(f)).toBeLessThan(previewBund);
    }
  });

  /**
   * Udsnittet ligger inde i fodzonen og ikke uden om den: det klipper MERE
   * end foden, aldrig mindre. Gjorde det mindre, ville previewet vise en
   * stribe, kunden aldrig kan se på sit bord.
   */
  it("klipper mere end foden og ikke mindre", () => {
    const previewBund = SKILT_HOEJDE * (PREVIEW_HOEJDE_CM / SKILT_CM.hoejde);
    expect(previewBund).toBeLessThan(FOD_START_Y);
  });

  /**
   * DET, HELE ADSKILLELSEN FINDES FOR. `SKILT_CM.front` er det fysiske mål og
   * bærer både fodlinjen og kundens tekst; udsnittet er kun en beholder.
   * Blev de slået sammen, ville et skærmvalg flytte trykkets sikkerhedslinje
   * og love kunden en anden højde.
   */
  it("rører hverken fodlinjen eller det, kunden får at vide", () => {
    expect(FOD_START_Y).toBeCloseTo(
      SKILT_HOEJDE - (FOD_CM / SKILT_CM.hoejde) * SKILT_HOEJDE,
      6,
    );
    expect(FRONT_MAAL).toContain(cmTekst(SKILT_CM.front));
    expect(FRONT_MAAL).not.toContain(cmTekst(PREVIEW_HOEJDE_CM));
  });
});

describe("laesQrSvg", () => {
  /**
   * DEN FEJL, DER FAKTISK SKETE. `qrcode` tegner modulerne med STROKE på
   * åbne, vandrette linjer — ikke med fill. Første udgave satte en fyldning
   * på dem, og QR-feltet stod næsten tomt med et par svage konturer.
   *
   * Der prøves mod bibliotekets FAKTISKE output og ikke mod en efterligning:
   * det, der skal fanges, er netop at svaret en dag ser anderledes ud.
   */
  it("finder koden i qrcodes svar — og ikke baggrundsfladen", async () => {
    const QRCode = (await import("qrcode")).default;
    const raa = await QRCode.toString("https://loyalsum.dk/r/abc123", {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
    });

    const kode = laesQrSvg(raa);
    expect(kode).not.toBeNull();
    // Finderpatternet øverst til venstre, forskudt af hvilezonen på 2.
    expect(kode!.d.startsWith("M2 2.5h7")).toBe(true);
    // Nettet er koden plus hvilezone i begge ender.
    expect(kode!.net).toBeGreaterThan(20);
    expect(kode!.net % 2).toBe(1); // QR-net er altid ulige
  });

  it("afviser en sti uden stroke — det er baggrunden, ikke koden", () => {
    expect(
      laesQrSvg(
        '<svg viewBox="0 0 29 29"><path fill="#fff" d="M0 0h29v29H0z"/></svg>',
      ),
    ).toBeNull();
  });

  it("afviser et svar, den ikke forstår, frem for at tegne noget forkert", () => {
    expect(laesQrSvg("")).toBeNull();
    expect(laesQrSvg("<svg></svg>")).toBeNull();
  });

  /** Koden skal fylde feltet — ellers bliver modulerne for små til at læse. */
  it("skalerer koden til QR-feltet", async () => {
    const QRCode = (await import("qrcode")).default;
    const raa = await QRCode.toString("https://loyalsum.dk/r/abc123", {
      type: "svg",
      errorCorrectionLevel: "M",
      margin: 2,
    });
    const { net } = laesQrSvg(raa)!;
    expect(MAAL.qr.bredde / net).toBeGreaterThan(2);
  });
});

/**
 * ARKET ER IKKE SKILTET, og forskellen opstod 31. august.
 *
 * Trykket lægges 12,4 cm bredt og klippes ned til 12, fordi et tryk aldrig
 * rammer en kant præcist. `SKILT_CM` er derfor ARKET — det er dét,
 * sideforholdet i tegningen skal passe til — mens `FAERDIG_CM` er det, kunden
 * står med. De to var ens indtil arket voksede, og netop dér er fælden: en
 * linje, der havde blandet dem sammen, virkede i månedsvis og begyndte så
 * stille at love 4 mm for meget.
 */
describe("arket mod det færdige skilt", () => {
  it("trykker større, end der klippes", () => {
    expect(SKILT_CM.bredde).toBeGreaterThan(FAERDIG_CM.bredde);
    expect(SKILT_CM.hoejde).toBeGreaterThan(FAERDIG_CM.hoejde);
    expect(FAERDIG_CM.bredde).toBeCloseTo(SKILT_CM.bredde - KLIP_CM.bredde, 6);
    expect(FAERDIG_CM.hoejde).toBeCloseTo(SKILT_CM.hoejde - KLIP_CM.bund, 6);
  });

  it("har noget at klippe i på begge led", () => {
    // Uden overkant skal trykket ramme kanten præcist, og det gør det ikke.
    expect(KLIP_CM.bredde).toBeGreaterThan(0);
    expect(KLIP_CM.bund).toBeGreaterThan(0);
  });

  it("fortæller kunden det FÆRDIGE mål og ikke arkets", () => {
    // Dét, linjen findes for. Står arkets bredde her, bestiller kunden et
    // skilt, der er bredere end det, de får.
    expect(FRONT_MAAL).toContain(cmTekst(FAERDIG_CM.bredde));
    expect(FRONT_MAAL).not.toContain(cmTekst(SKILT_CM.bredde));
    expect(FRONT_MAAL).toContain(cmTekst(SKILT_CM.front));
  });

  it("holder fronten inde på det færdige skilt", () => {
    // Den synlige del kan ikke være højere end skiltet selv.
    expect(SKILT_CM.front).toBeLessThan(FAERDIG_CM.hoejde);
  });
});
