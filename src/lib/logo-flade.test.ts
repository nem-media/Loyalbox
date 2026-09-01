import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { laegLogoPaaFront } from "./logo-flade";

/**
 * Det, prøven passer på, kan ikke ses på en skærm.
 *
 * En PNG med transparens gemmer stadig en FARVE i de gennemsigtige pixels, og
 * eksportværktøjer skriver som regel sort. Respekterer trykkeriets RIP ikke
 * alfakanalen, bliver de til blæk — en firkant bag logoet, som hverken
 * browseren eller previewet viser. Målt på en rigtig kundefil: hvert eneste
 * gennemsigtige pixel var RGB (0,0,0), og 68 % af logoets kasse var
 * gennemsigtig.
 *
 * Prøven kigger derfor på ALFAKANALEN og på de pixels, der før var
 * gennemsigtige — ikke på hvordan billedet ser ud.
 */

/** Et lille logo: en hvid prik midt i sort-og-gennemsigtigt. Som en rigtig fil. */
async function testLogo(): Promise<Buffer> {
  return await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      // Gennemsigtigt OG sort — præcis kombinationen, der gør skade.
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      {
        input: await sharp({
          create: {
            width: 4,
            height: 4,
            channels: 4,
            background: { r: 255, g: 255, b: 255, alpha: 1 },
          },
        })
          .png()
          .toBuffer(),
        left: 3,
        top: 3,
      },
    ])
    .png()
    .toBuffer();
}

/** Pixlen i øverste venstre hjørne — den, der før var sort og gennemsigtig. */
async function hjoerne(buf: Buffer) {
  const { data, info } = await sharp(buf)
    .raw()
    .toBuffer({ resolveWithObject: true });
  return {
    kanaler: info.channels,
    r: data[0],
    g: data[1],
    b: data[2],
  };
}

describe("logoet lægges på fronten", () => {
  it("fjerner alfakanalen fra en PNG", async () => {
    const raa = await testLogo();
    expect((await sharp(raa).metadata()).hasAlpha).toBe(true);

    const { buffer, type } = await laegLogoPaaFront(raa, "image/png", "#111111");

    // DET, DER BETYDER NOGET: der er ikke længere en kanal at ignorere.
    expect((await sharp(buffer).metadata()).hasAlpha).toBe(false);
    expect(type).toBe("image/png");
  });

  /**
   * DEN FARLIGE PIXEL. Før: sort og gennemsigtig — altså sort blæk, hvis
   * alfakanalen tabes. Efter: standerfrontens egen farve, så selv en RIP, der
   * ignorerer alt om transparens, lægger den rigtige farve.
   */
  it("giver de gennemsigtige pixels frontens farve", async () => {
    const { buffer } = await laegLogoPaaFront(
      await testLogo(),
      "image/png",
      "#111111",
    );
    const p = await hjoerne(buffer);
    expect(p.kanaler).toBe(3);
    expect([p.r, p.g, p.b]).toEqual([17, 17, 17]);
  });

  /** Følger baggrunden og ikke en fast farve — en hvid stander skal blive hvid. */
  it("bruger den baggrund, den får", async () => {
    const { buffer } = await laegLogoPaaFront(
      await testLogo(),
      "image/png",
      "#ffffff",
    );
    const p = await hjoerne(buffer);
    expect([p.r, p.g, p.b]).toEqual([255, 255, 255]);
  });

  /**
   * SVG RØRES IKKE. Kurver har ingen alfakanal at misforstå, og en rastrering
   * ville gøre et skarpt logo uskarpt — vi ville løse et problem, der ikke
   * findes, og skabe et, der gør.
   */
  it("sender en SVG uændret videre", async () => {
    const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"/>');
    const ud = await laegLogoPaaFront(svg, "image/svg+xml", "#111111");
    expect(ud.buffer).toBe(svg);
    expect(ud.type).toBe("image/svg+xml");
  });

  /**
   * ET LOGO ER BEDRE END INTET LOGO. Kan filen ikke læses, skal trykfilen
   * stadig blive til noget — den gamle udgave af billedet er et brugbart
   * skilt, en rute der kaster er ikke.
   */
  it("falder tilbage til originalen, hvis billedet ikke kan læses", async () => {
    const skrald = Buffer.from("det her er ikke en PNG");
    const ud = await laegLogoPaaFront(skrald, "image/png", "#111111");
    expect(ud.buffer).toBe(skrald);
  });
});
