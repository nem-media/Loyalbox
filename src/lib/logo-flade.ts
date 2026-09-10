import "server-only";
import sharp from "sharp";
import type { LogoUdsnit } from "./skilt-format";

/**
 * Logoets gennemsigtige felter skæres væk og lægges på standerfrontens farve,
 * FØR det bages ind i trykfilen.
 *
 * FEJLEN, DEN LØSER — set på et trykt skilt, ikke gættet. Kunden fik en sort
 * firkant bag sit logo på en sort stander: "logoets baggrund ligner det
 * trykkes med ekstra sort farve". Det er samme klasse fejl som dækrektanglet,
 * der gav en sort firkant i sin tid — men denne gang er objektet SELVE
 * `<image>`-elementet.
 *
 * HVORFOR DET SKER. En PNG med transparens gemmer stadig en farve i de
 * gennemsigtige pixels, og eksportværktøjer skriver som regel sort. Målt på
 * kundens egen fil: hvert eneste gennemsigtige pixel er RGB (0,0,0), og 68 %
 * af logoets kasse er gennemsigtig. Flades billedet uden at alfakanalen
 * respekteres, bliver de 68 % til SORT toner over hele logoets rektangel —
 * 99 × 21 mm — dér hvor arket ellers ikke får farve. På skærmen er der intet
 * at se; forskellen er blæk mod ikke-blæk.
 *
 * TO TING GØRES, OG DE LØSER HVER SIN HALVDEL:
 *
 * 1. `extract` skærer den HELT gennemsigtige luft af kanterne. Så er der ikke
 *    længere et rektangel af tomhed at lægge farve på. Det er den store gevinst
 *    — på kundens fil forsvinder 68 % af fladen.
 * 2. `flatten` blander resten ned på baggrundsfarven og FJERNER alfakanalen.
 *    Inde midt i et logo kan der stadig være huller, og dem er der ingen kant
 *    at skære væk fra; de skal bære arkets egen farve.
 *
 * HVORFOR BESKÆRINGEN IKKE KAN SES. `logoPlacering()` i `skilt-format.ts`
 * flytter og skalerer `<image>`-elementet med, så udsnittet lander præcis dér,
 * hvor den ubeskårne fil lå. Uden dét ville `preserveAspectRatio` skalere det
 * beskårne op til hele feltet, og ethvert eksisterende design ville få et
 * større logo end kunden har godkendt.
 *
 * DER SKÆRES KUN PÅ ALFAKANALEN, ALDRIG PÅ FARVE. `sharp.trim()` bruger som
 * standard hjørnets farve og ville beskære en hvid, UGENNEMSIGTIG kasse i
 * logofilen — netop den slags fil, `LOGO_TEKSTER.fastBaggrund` advarer om, og
 * kundens egen beslutning. Derfor findes udsnittet på alfaen alene: er hvert
 * pixel ugennemsigtigt, skæres der intet, og filen går uændret igennem.
 *
 * DET SKJULER IKKE KUNDENS EGEN BAGGRUND. Vi rører kun de pixels, der ER
 * gennemsigtige, og lægger dem på den farve, der i forvejen ligger bag dem.
 * Et korrekt renderet skilt ser derfor nøjagtig ud som før.
 *
 * KUN PNG. SVG-logoer er kurver og har ikke problemet — de har ingen
 * alfakanal at misforstå, og en rastrering ville gøre et skarpt logo
 * uskarpt. De sendes uændret videre.
 */

export interface FladtLogo {
  buffer: Buffer;
  type: string;
  /** Sat, når der faktisk blev skåret noget af. Se `logoPlacering()`. */
  udsnit?: LogoUdsnit;
}

/** Fejler flatningen, bruges originalen. Et logo er bedre end intet logo. */
export async function laegLogoPaaFront(
  raa: Buffer,
  type: string,
  baggrund: string,
): Promise<FladtLogo> {
  if (type !== "image/png") return { buffer: raa, type };

  try {
    const udsnit = await synligtUdsnit(raa);

    let billede = sharp(raa);
    if (udsnit) {
      billede = billede.extract({
        left: udsnit.x,
        top: udsnit.y,
        width: udsnit.bredde,
        height: udsnit.hoejde,
      });
    }

    const flad = await billede
      // `flatten` er præcis operationen: bland mod baggrunden, drop kanalen.
      .flatten({ background: baggrund })
      .png()
      .toBuffer();

    return { buffer: flad, type: "image/png", ...(udsnit ? { udsnit } : {}) };
  } catch (err) {
    // Logges og sluges. En trykfil med et logo, der har sin alfakanal i
    // behold, er stadig et brugbart skilt — en rute, der giver 500, er ikke.
    console.error("[logo] kunne ikke lægge logoet på fronten:", (err as Error).message);
    return { buffer: raa, type };
  }
}

/**
 * Den mindste firkant, der rummer hvert eneste pixel med bare lidt farve i.
 *
 * KUN HELT GENNEMSIGTIGE PIXELS SKÆRES VÆK (alfa nøjagtig 0). Grænsen er
 * bevidst sat i bund: en kant med alfa 1 er usynlig, men at skære den væk er
 * en ændring af kundens fil, vi ikke kan begrunde — og gevinsten er nul, for
 * eksportværktøjer skriver rent 0 i den luft, der er tale om.
 *
 * `null` betyder "der er intet at skære": enten er filen ugennemsigtig hele
 * vejen ud til kanten, eller den er tom. Begge dele skal gå uændret igennem —
 * en `extract` på hele billedet ville være arbejde uden virkning, og et
 * `udsnit` uden beskæring ville få `logoPlacering()` til at regne på noget,
 * der ikke er sket.
 */
async function synligtUdsnit(raa: Buffer): Promise<LogoUdsnit | null> {
  const { data, info } = await sharp(raa)
    // Uden alfakanal svarer `extractChannel` med en fejl frem for at antage
    // ugennemsigtig — og en PNG uden kanal er netop en, der intet skal have.
    .ensureAlpha()
    .extractChannel("alpha")
    .raw()
    .toBuffer({ resolveWithObject: true });

  const bredde = info.width;
  const hoejde = info.height;

  let venstre = bredde;
  let hoejre = -1;
  let top = hoejde;
  let bund = -1;

  for (let y = 0; y < hoejde; y++) {
    const raekke = y * bredde;
    for (let x = 0; x < bredde; x++) {
      if (data[raekke + x] === 0) continue;
      if (x < venstre) venstre = x;
      if (x > hoejre) hoejre = x;
      if (y < top) top = y;
      bund = y;
    }
  }

  // Helt gennemsigtig fil. Ikke vores opgave at rette; den går videre som den er.
  if (hoejre < 0) return null;

  const intetAtSkaere =
    venstre === 0 && top === 0 && hoejre === bredde - 1 && bund === hoejde - 1;
  if (intetAtSkaere) return null;

  return {
    kildeBredde: bredde,
    kildeHoejde: hoejde,
    x: venstre,
    y: top,
    bredde: hoejre - venstre + 1,
    hoejde: bund - top + 1,
  };
}
