import { describe, it, expect } from "vitest";
import {
  lyshed,
  kontrast,
  skabelonTil,
  nuance,
  skiveFarve,
  ringFarve,
  STANDER,
  LOGO_FELT,
  LOGO_DAEK,
  LOGO_PROCENT,
  FOD_HOEJDE,
  FOD_START_Y,
  SKILT_CM,
  SKILT_BREDDE,
  QR_FELT,
  QR_DAEK,
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

describe("logofeltet", () => {
  /**
   * Målt i skabelonen: gruppen ligger på (28, 16), og stien inden i løber fra
   * (0,746, 0,305) til (282,852, 107,137). Ændres tallene uden at skabelonen
   * ændres, lander logoet ved siden af feltet — og det ses først, når nogen
   * kigger på et trykt skilt.
   */
  it("holder feltet dér, hvor det er tegnet", () => {
    expect(LOGO_FELT.x).toBeCloseTo(28.746094, 5);
    expect(LOGO_FELT.y).toBeCloseTo(16.304688, 5);
    expect(LOGO_FELT.x + LOGO_FELT.bredde).toBeCloseTo(310.851562, 5);
    expect(LOGO_FELT.y + LOGO_FELT.hoejde).toBeCloseTo(123.136719, 5);
  });

  /**
   * DÆKFLADEN SKAL VÆRE STØRRE END FELTET. Rammen tegnes oven på feltets kant,
   * og en streg sidder midt på sin egen sti: dækkes kun feltet, bliver den
   * yderste halvdel stående som en turkis kontur rundt om kundens logo.
   */
  it("dækker mere end feltet, så rammen ryger med", () => {
    expect(LOGO_DAEK.x).toBeLessThan(LOGO_FELT.x);
    expect(LOGO_DAEK.y).toBeLessThan(LOGO_FELT.y);
    expect(LOGO_DAEK.x + LOGO_DAEK.bredde).toBeGreaterThan(
      LOGO_FELT.x + LOGO_FELT.bredde,
    );
    expect(LOGO_DAEK.y + LOGO_DAEK.hoejde).toBeGreaterThan(
      LOGO_FELT.y + LOGO_FELT.hoejde,
    );
  });

  /** Og den må ikke blive så stor, at den æder noget af det, der skal trykkes. */
  it("holder dækfladen inde på standeren", () => {
    expect(LOGO_DAEK.x).toBeGreaterThan(STANDER.x);
    expect(LOGO_DAEK.y).toBeGreaterThan(STANDER.y);
    expect(LOGO_DAEK.x + LOGO_DAEK.bredde).toBeLessThan(
      STANDER.x + STANDER.bredde,
    );
    // Overskriften "Din oplevelse betyder meget for os" begynder ved y 134.
    expect(LOGO_DAEK.y + LOGO_DAEK.hoejde).toBeLessThan(134);
  });

  /**
   * Procenterne bruges til at lægge logoet oven på previewet i browseren.
   * Er de forkerte, sidder logoet ikke i feltet — og previewet holder op med
   * at vise det, der bliver trykt.
   */
  it("regner feltets plads i procent ud fra de samme tal", () => {
    expect(LOGO_PROCENT.venstre).toBeCloseTo(
      (LOGO_FELT.x / SKILT_BREDDE) * 100,
      6,
    );
    expect(LOGO_PROCENT.bredde).toBeCloseTo(
      (LOGO_FELT.bredde / SKILT_BREDDE) * 100,
      6,
    );
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
   * Skiltet er 19,2 cm højt, og de nederste 5 cm sidder i standerens fod.
   * TALLENE BRUGES KUN TIL MARKERINGEN I PREVIEWET — trykfilen er altid hele
   * skiltet, ellers står der en hvid stribe frem under foden.
   */
  it("regner fodens højde af standerens flade, ikke af lærredet", () => {
    expect(FOD_HOEJDE).toBeCloseTo(
      (SKILT_CM.fod / SKILT_CM.hoejde) * STANDER.hoejde,
      6,
    );
    expect(FOD_START_Y + FOD_HOEJDE).toBeCloseTo(STANDER.y + STANDER.hoejde, 6);
  });

  /** Foden er en fjerdedel af skiltet. Er tallet vildt forkert, er en enhed gået tabt. */
  it("dækker omtrent en fjerdedel", () => {
    expect(FOD_HOEJDE / STANDER.hoejde).toBeGreaterThan(0.2);
    expect(FOD_HOEJDE / STANDER.hoejde).toBeLessThan(0.3);
  });

  /**
   * QR-koden og NFC-cirklen er dét, skiltet er til for. Ryger de ned i foden,
   * er skiltet ubrugeligt, uanset hvor pænt det er.
   */
  it("holder QR-koden fri af foden", () => {
    expect(QR_DAEK.y + QR_DAEK.hoejde).toBeLessThan(FOD_START_Y);
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
    const skala = QR_FELT.side / net;
    expect(skala).toBeGreaterThan(2);
  });
});
