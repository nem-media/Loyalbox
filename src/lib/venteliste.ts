import { KATALOG } from "./constants";
import { erGyldigEmail } from "./bestilling-uden-konto";

/**
 * Skriv mig op, når salget åbner.
 *
 * HVORFOR DEN FINDES: beskeden om at man ikke kan købe endnu var en blindgyde.
 * Den bad folk skrive en mail — og det gør de færreste. Nu kan de skrive sig
 * op på stedet, og vi har dem, den dag betalingen åbner.
 *
 * DER GEMMES INTET HOS OS. Tilmeldingen sendes som en mail til
 * kontakt@loyalsum.dk og lander ingen steder i databasen. Det er et bevidst
 * valg: en tabel med navne og telefonnumre ville udløse opbevaringsfrister,
 * sletterutiner og et afsnit i databehandleraftalen — for noget, der skal
 * bruges én gang og så er forbi. Mailboksen er dét, der holder styr på det.
 *
 * Valideringen ligger her og ikke i formularen, fordi en browser kan sende
 * hvad som helst — og fordi den så kan prøves.
 */

/** Hvad man kan være interesseret i. Varerne hentes, så listen ikke kan drive. */
export const VED_IKKE = "ved-ikke";

export function interesseValg(): { vaerdi: string; navn: string }[] {
  return [
    ...KATALOG.map((p) => ({ vaerdi: p.slug, navn: p.name })),
    { vaerdi: VED_IKKE, navn: "Jeg overvejer stadig hvilken" },
  ];
}

export function interesseNavn(vaerdi: string): string | null {
  return interesseValg().find((v) => v.vaerdi === vaerdi)?.navn ?? null;
}

export interface VentelisteFelter {
  navn: string;
  email: string;
  /** Frivilligt. Tom streng betyder "ikke oplyst". */
  telefon: string;
  interesse: string;
}

export type VentelisteFejl = Partial<Record<keyof VentelisteFelter, string>>;

/**
 * Lofter på felterne.
 *
 * Formularen er offentlig og sender en mail. Uden et loft kunne nogen sende
 * en megabyte tekst afsted i hvert felt — det er ikke en sikkerhedsfejl, men
 * det gør indbakken ubrugelig, og det koster på en mailkvote, vi deler med
 * ordrevarsler og alarmer.
 */
const MAKS = { navn: 100, email: 200, telefon: 40 } as const;

export function laesVenteliste(raw: Record<string, unknown>): {
  ok: boolean;
  fejl: VentelisteFejl;
  vaerdier?: VentelisteFelter;
} {
  const tekst = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fejl: VentelisteFejl = {};

  const navn = tekst(raw.navn);
  if (navn.length < 2) fejl.navn = "Skriv dit navn.";
  else if (navn.length > MAKS.navn) fejl.navn = "Navnet er for langt.";

  const email = tekst(raw.email);
  if (!erGyldigEmail(email)) fejl.email = "Skriv en mailadresse, vi kan svare på.";
  else if (email.length > MAKS.email) fejl.email = "Adressen er for lang.";

  /*
   * TELEFON ER FRIVILLIGT, men skal ligne et nummer, hvis det skrives. Et
   * felt, der tager imod hvad som helst, giver os et nummer, vi ikke kan
   * ringe til — og folk opdager det først, når de ikke bliver kontaktet.
   * Bevidst løs: mellemrum, plus og bindestreger er almindelige.
   */
  const telefon = tekst(raw.telefon);
  if (telefon && !/^[+\d][\d\s().-]{5,}$/.test(telefon)) {
    fejl.telefon = "Det ligner ikke et telefonnummer. Lad feltet stå tomt, hvis du hellere vil.";
  } else if (telefon.length > MAKS.telefon) {
    fejl.telefon = "Nummeret er for langt.";
  }

  const interesse = tekst(raw.interesse);
  if (!interesseNavn(interesse)) {
    fejl.interesse = "Vælg hvad du er interesseret i.";
  }

  if (Object.keys(fejl).length > 0) return { ok: false, fejl };

  return {
    ok: true,
    fejl: {},
    vaerdier: { navn, email, telefon, interesse },
  };
}

/** Mailen til os selv. Alt det, der skal bruges for at ringe tilbage. */
export function ventelisteMail(v: VentelisteFelter): {
  emne: string;
  tekst: string;
} {
  const interesse = interesseNavn(v.interesse) ?? v.interesse;
  return {
    emne: `Venteliste: ${v.navn} — ${interesse}`,
    tekst: [
      "Nogen har skrevet sig op til at blive kontaktet, når salget åbner.",
      "",
      `Navn:       ${v.navn}`,
      `E-mail:     ${v.email}`,
      `Telefon:    ${v.telefon || "ikke oplyst"}`,
      `Interesse:  ${interesse}`,
      "",
      "Svar direkte på mailadressen ovenfor.",
    ].join("\n"),
  };
}
