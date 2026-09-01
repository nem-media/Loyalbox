import "server-only";
import sharp from "sharp";

/**
 * Logoets gennemsigtige felter lægges på standerfrontens farve, FØR det bages
 * ind i trykfilen.
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
 * af logoets kasse er gennemsigtig. Flader trykkeriets RIP billedet uden at
 * respektere alfakanalen, bliver de 68 % til SORT BLÆK over hele logoets
 * rektangel — 99 × 21 mm — dér hvor arket ellers ikke får blæk. På skærmen er
 * der intet at se; forskellen er blæk mod ikke-blæk.
 *
 * HVAD DER GØRES: `flatten` blander billedet ned på baggrundsfarven og
 * FJERNER alfakanalen. Så er der ikke længere en kanal, nogen kan komme til
 * at ignorere — og de pixels, der før var sorte-og-gennemsigtige, bærer nu
 * præcis den farve, arket har bag dem.
 *
 * DET SKJULER IKKE KUNDENS EGEN BAGGRUND. En hvid, ugennemsigtig kasse i
 * logofilen er stadig hvid bagefter — se `LOGO_TEKSTER.fastBaggrund`, der
 * advarer om netop det. Vi rører kun de pixels, der ER gennemsigtige, og
 * lægger dem på den farve, der i forvejen ligger bag dem. Et korrekt
 * renderet skilt ser derfor nøjagtig ud som før.
 *
 * KUN PNG. SVG-logoer er kurver og har ikke problemet — de har ingen
 * alfakanal at misforstå, og en rastrering ville gøre et skarpt logo
 * uskarpt. De sendes uændret videre.
 */

/** Fejler flatningen, bruges originalen. Et logo er bedre end intet logo. */
export async function laegLogoPaaFront(
  raa: Buffer,
  type: string,
  baggrund: string,
): Promise<{ buffer: Buffer; type: string }> {
  if (type !== "image/png") return { buffer: raa, type };

  try {
    const flad = await sharp(raa)
      // `flatten` er præcis operationen: bland mod baggrunden, drop kanalen.
      .flatten({ background: baggrund })
      .png()
      .toBuffer();
    return { buffer: flad, type: "image/png" };
  } catch (err) {
    // Logges og sluges. En trykfil med et logo, der har sin alfakanal i
    // behold, er stadig et brugbart skilt — en rute, der giver 500, er ikke.
    console.error("[logo] kunne ikke lægge logoet på fronten:", (err as Error).message);
    return { buffer: raa, type };
  }
}
