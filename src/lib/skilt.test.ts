import { describe, it, expect } from "vitest";
import {
  lyshed,
  kontrast,
  skabelonTil,
  RING,
  SKIVE_R,
  RING_PROCENT,
  SKILT_BREDDE,
  QR_FELT,
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

describe("geometrien om logoet", () => {
  /**
   * Målt i skabelonen: ringen løber fra x 111→231 og y 6→126. Ændres
   * tallene uden at skabelonen ændres, lander logoet ved siden af cirklen —
   * og det ses først, når nogen kigger på et skilt.
   */
  it("holder ringen dér, hvor den er tegnet", () => {
    expect(RING.cx - RING.r).toBe(111);
    expect(RING.cx + RING.r).toBe(231);
    expect(RING.cy - RING.r).toBe(6);
    expect(RING.cy + RING.r).toBe(126);
  });

  it("lader skiven være mindre end ringen, så stregen bliver stående", () => {
    expect(SKIVE_R).toBeLessThan(RING.r);
    expect(RING.r - SKIVE_R).toBeGreaterThanOrEqual(2);
  });

  /**
   * Procenterne bruges til at lægge logoet oven på previewet i browseren.
   * Er de forkerte, sidder logoet ikke i cirklen — og previewet holder op
   * med at vise det, der bliver trykt.
   */
  it("regner ringens plads i procent ud fra de samme tal", () => {
    expect(RING_PROCENT.venstre).toBeCloseTo(
      ((RING.cx - SKIVE_R) / SKILT_BREDDE) * 100,
      6,
    );
    expect(RING_PROCENT.bredde).toBeCloseTo(
      ((SKIVE_R * 2) / SKILT_BREDDE) * 100,
      6,
    );
    // Logoet skal kunne være i skiven.
    expect(RING_PROCENT.logoAndel).toBeLessThanOrEqual(100);
    expect(RING_PROCENT.logoAndel).toBeGreaterThan(50);
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
