import { describe, it, expect } from "vitest";
import sharp from "sharp";
import { laegLogoPaaFront } from "./logo-flade";
import { logoPlacering, MAAL } from "./skilt-format";

/**
 * Det, prøven passer på, kan ikke ses på en skærm.
 *
 * Et `<image>` er ÉT objekt for en printer, og hele dets rektangel bliver
 * behandlet som billede — også de tomme hjørner. Målt på en rigtig kundefil:
 * hvert eneste gennemsigtige pixel var RGB (0,0,0), og 68 % af logoets kasse
 * var gennemsigtig. Tabes alfakanalen undervejs, bliver de 68 % til sort; og
 * selv når den ikke tabes, får fladen sit eget rasterkorn og står som en
 * firkant om logoet. Det første blev set på et trykt skilt, det andet også.
 *
 * Prøven kigger derfor på ALFAKANALEN, på hvad der bliver SKÅRET VÆK, og på
 * at logoet bliver liggende, hvor det lå — ikke på hvordan billedet ser ud.
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
      await ringLogo(),
      "image/png",
      "#111111",
    );
    const p = await pixel(buffer, 5, 5);
    expect(p.kanaler).toBe(3);
    expect([p.r, p.g, p.b]).toEqual([17, 17, 17]);
  });

  /** Følger baggrunden og ikke en fast farve — en hvid stander skal blive hvid. */
  it("bruger den baggrund, den får", async () => {
    const { buffer } = await laegLogoPaaFront(
      await ringLogo(),
      "image/png",
      "#ffffff",
    );
    const p = await pixel(buffer, 5, 5);
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

/**
 * ET RING-LOGO: hvidt hele vejen ud til kanten, gennemsigtigt sort i midten.
 *
 * DER ER INTET AT SKÆRE på sådan en fil — indholdet rører alle fire kanter.
 * Den findes netop derfor: hullet i midten er den halvdel af problemet,
 * beskæringen ikke kan løse, og det er `flatten`, der skal tage den.
 */
async function ringLogo(): Promise<Buffer> {
  const hvid = { r: 255, g: 255, b: 255, alpha: 1 };
  const flade = (b: number, h: number) =>
    sharp({ create: { width: b, height: h, channels: 4, background: hvid } })
      .png()
      .toBuffer();

  return await sharp({
    create: {
      width: 10,
      height: 10,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([
      { input: await flade(10, 2), left: 0, top: 0 },
      { input: await flade(10, 2), left: 0, top: 8 },
      { input: await flade(2, 10), left: 0, top: 0 },
      { input: await flade(2, 10), left: 8, top: 0 },
    ])
    .png()
    .toBuffer();
}

/** En pixel et vilkårligt sted. */
async function pixel(buf: Buffer, x: number, y: number) {
  const { data, info } = await sharp(buf)
    .raw()
    .toBuffer({ resolveWithObject: true });
  const i = (y * info.width + x) * info.channels;
  return { kanaler: info.channels, r: data[i], g: data[i + 1], b: data[i + 2] };
}

describe("luften omkring logoet skæres væk", () => {
  /**
   * DEN STORE GEVINST. Hver eneste pixel i logoets rektangel får farve i
   * trykken, også de tomme — og på en rigtig kundefil var 68 % af kassen tom.
   * Skæres luften af, er der ikke længere en flade at lægge farve på.
   */
  it("beskærer til det synlige og fortæller hvad der blev skåret", async () => {
    const { buffer, udsnit } = await laegLogoPaaFront(
      await testLogo(),
      "image/png",
      "#111111",
    );

    // Prikken i prøvelogoet er 4×4 og sidder i (3,3) af et 10×10-billede.
    expect(udsnit).toEqual({
      kildeBredde: 10,
      kildeHoejde: 10,
      x: 3,
      y: 3,
      bredde: 4,
      hoejde: 4,
    });

    const m = await sharp(buffer).metadata();
    expect([m.width, m.height]).toEqual([4, 4]);
  });

  /**
   * KUNDENS EGEN BAGGRUND ER IKKE LUFT.
   *
   * `sharp.trim()` ville have beskåret efter hjørnets FARVE og ædt en hvid,
   * ugennemsigtig kasse — netop den slags fil, `LOGO_TEKSTER.fastBaggrund`
   * advarer om, og som kunden selv har valgt at levere. Derfor findes
   * udsnittet på alfakanalen alene. Fejler denne, skærer vi i noget, der skal
   * trykkes.
   */
  it("rører ikke en fil, der er ugennemsigtig helt ud til kanten", async () => {
    const fast = await sharp({
      create: {
        width: 10,
        height: 10,
        channels: 4,
        background: { r: 255, g: 255, b: 255, alpha: 1 },
      },
    })
      .png()
      .toBuffer();

    const { buffer, udsnit } = await laegLogoPaaFront(fast, "image/png", "#111111");
    expect(udsnit).toBeUndefined();

    const m = await sharp(buffer).metadata();
    expect([m.width, m.height]).toEqual([10, 10]);
  });

  /**
   * HULLER INDE I LOGOET kan ikke skæres væk — der er ingen kant at skære fra.
   * Ringen rører alle fire kanter, så beskæringen har intet at tage, og det er
   * `flatten`, der bærer hullet. Derfor bliver den ved med at være nødvendig.
   */
  it("lader en fil være, når indholdet rører alle fire kanter", async () => {
    const { udsnit } = await laegLogoPaaFront(
      await ringLogo(),
      "image/png",
      "#111111",
    );
    expect(udsnit).toBeUndefined();
  });

  /**
   * BESKÆRINGEN MÅ IKKE KUNNE SES PÅ SKILTET.
   *
   * Det er dén fejl, der ellers ville slippe igennem: filen bliver mindre,
   * `preserveAspectRatio` skalerer den op til hele feltet, og hvert eneste
   * eksisterende design får pludselig et større logo, end kunden har godkendt
   * — synligt først på et trykt skilt. Prøven regner ad en anden vej end
   * koden: den finder først, hvor HELE billedet ville have ligget, og
   * derefter prikkens plads inden i det.
   */
  it("lægger det beskårne præcis dér, hvor det ubeskårne lå", async () => {
    const { udsnit } = await laegLogoPaaFront(
      await testLogo(),
      "image/png",
      "#111111",
    );

    const felt = MAAL.logo;
    // `meet` på hele det ubeskårne 10×10-billede.
    const s = Math.min(felt.bredde / 10, felt.hoejde / 10);
    const helX = felt.x + (felt.bredde - 10 * s) / 2;
    const helY = felt.y + (felt.hoejde - 10 * s) / 2;

    const plads = logoPlacering(udsnit);
    expect(plads.x).toBeCloseTo(helX + 3 * s, 6);
    expect(plads.y).toBeCloseTo(helY + 3 * s, 6);
    expect(plads.bredde).toBeCloseTo(4 * s, 6);
    expect(plads.hoejde).toBeCloseTo(4 * s, 6);
  });

  /** Uden udsnit er svaret hele feltet — nøjagtig som før beskæringen fandtes. */
  it("bruger hele feltet, når der ikke er skåret noget", () => {
    expect(logoPlacering(undefined)).toEqual(MAAL.logo);
    expect(logoPlacering(null)).toEqual(MAAL.logo);
  });
});
