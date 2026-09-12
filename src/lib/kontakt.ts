import { COMPANY } from "./constants";
import { erGyldigEmail } from "./bestilling-uden-konto";

/**
 * Kontaktformularen.
 *
 * DER GEMMES INTET HOS OS. Beskeden sendes som en mail til kontakt@loyalsum.dk
 * og lander ingen steder i databasen — samme valg som ventelisten, og af samme
 * grund: en tabel med navne, telefonnumre og fritekst ville udløse
 * opbevaringsfrister, en sletterutine og et afsnit i databehandleraftalen for
 * noget, der skal besvares én gang. Mailboksen er dét, der holder styr på det.
 * Står der personfølsomt i en besked, hører det hjemme samme sted som al anden
 * korrespondance.
 *
 * VALIDERINGEN LIGGER HER OG IKKE I FORMULAREN, fordi en browser kan sende
 * hvad som helst — og fordi den så kan prøves uden at rendere noget.
 */

/** Svartid vi tør skrive på siden. Ét sted, så den kan rettes uden at lede. */
export const SVARTID = "Vi svarer normalt inden for 1-2 hverdage.";

/**
 * Emnerne.
 *
 * De er ikke pynt: emnet bliver til mailens emnelinje, så en indbakke kan
 * sorteres uden at åbne hver besked. Listen er kort med vilje — en lang
 * emneliste får folk til at vælge "Andet", og så er den ingen hjælp.
 */
export const EMNER = [
  { vaerdi: "bestilling", navn: "Bestilling og priser" },
  { vaerdi: "produkt", navn: "Sådan virker LoyalSum" },
  { vaerdi: "konto", navn: "Min konto eller login" },
  { vaerdi: "faktura", navn: "Faktura og abonnement" },
  { vaerdi: "privatliv", navn: "Privatliv og data" },
  { vaerdi: "andet", navn: "Noget andet" },
] as const;

export const STANDARD_EMNE = "bestilling";

export function emneNavn(vaerdi: string): string | null {
  return EMNER.find((e) => e.vaerdi === vaerdi)?.navn ?? null;
}

export interface KontaktFelter {
  navn: string;
  email: string;
  /** Frivilligt. Tom streng betyder "ikke oplyst". */
  telefon: string;
  emne: string;
  besked: string;
}

export type KontaktFejl = Partial<Record<keyof KontaktFelter, string>>;

/**
 * Lofter på felterne.
 *
 * Formularen er offentlig og sender en mail. Uden et loft kunne nogen sende en
 * megabyte tekst af sted — det er ikke en sikkerhedsfejl, men det gør indbakken
 * ubrugelig og koster på en mailkvote, vi deler med ordrevarsler og alarmer.
 */
const MAKS = { navn: 100, email: 200, telefon: 40, besked: 4000 } as const;
const MINDST_BESKED = 10;

export function laesKontakt(raw: Record<string, unknown>): {
  ok: boolean;
  fejl: KontaktFejl;
  vaerdier?: KontaktFelter;
} {
  const tekst = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const fejl: KontaktFejl = {};

  const navn = tekst(raw.navn);
  if (navn.length < 2) fejl.navn = "Skriv dit navn.";
  else if (navn.length > MAKS.navn) fejl.navn = "Navnet er for langt.";

  const email = tekst(raw.email);
  if (!erGyldigEmail(email))
    fejl.email = "Skriv en mailadresse, vi kan svare på.";
  else if (email.length > MAKS.email) fejl.email = "Adressen er for lang.";

  /*
   * TELEFON ER FRIVILLIGT, men skal ligne et nummer, hvis det skrives. Et felt,
   * der tager imod hvad som helst, giver os et nummer, vi ikke kan ringe til —
   * og det opdager afsenderen først, når der ikke bliver ringet. Bevidst løs:
   * mellemrum, plus og bindestreger er almindelige. Samme regel som ventelisten.
   */
  const telefon = tekst(raw.telefon);
  if (telefon && !/^[+\d][\d\s().-]{5,}$/.test(telefon)) {
    fejl.telefon =
      "Det ligner ikke et telefonnummer. Lad feltet stå tomt, hvis du hellere vil.";
  } else if (telefon.length > MAKS.telefon) {
    fejl.telefon = "Nummeret er for langt.";
  }

  const emne = tekst(raw.emne);
  if (!emneNavn(emne)) fejl.emne = "Vælg hvad det handler om.";

  const besked = tekst(raw.besked);
  if (besked.length < MINDST_BESKED) {
    // Ikke for at være streng: en besked på tre tegn kan vi ikke svare på, og
    // afsenderen venter så på et svar, der aldrig kan blive brugbart.
    fejl.besked = "Skriv lidt mere, så vi kan svare ordentligt.";
  } else if (besked.length > MAKS.besked) {
    fejl.besked = `Beskeden er for lang. Skriv højst ${MAKS.besked} tegn, eller send den til ${COMPANY.email}.`;
  }

  if (Object.keys(fejl).length > 0) return { ok: false, fejl };

  return { ok: true, fejl: {}, vaerdier: { navn, email, telefon, emne, besked } };
}

/** Mailen til os selv. Alt det, der skal bruges for at svare. */
export function kontaktMail(v: KontaktFelter): {
  emne: string;
  tekst: string;
  svarTil: string;
} {
  const emne = emneNavn(v.emne) ?? v.emne;
  return {
    // Emnet forrest, så indbakken kan sorteres uden at åbne beskeden.
    emne: `Kontakt (${emne}): ${v.navn}`,
    tekst: [
      `Nogen har skrevet via kontaktformularen på ${COMPANY.email.split("@")[1]}.`,
      "",
      `Navn:     ${v.navn}`,
      `E-mail:   ${v.email}`,
      `Telefon:  ${v.telefon || "ikke oplyst"}`,
      `Emne:     ${emne}`,
      "",
      "Besked:",
      v.besked,
      "",
      "— Svar direkte på denne mail; den er sat op til at gå til afsenderen.",
    ].join("\n"),
    /*
      SVAR-TIL ER AFSENDEREN, ikke os. Uden den ville et svar gå til
      drift@loyalsum.dk — altså til os selv — og beskeden ville se besvaret ud,
      uden at nogen havde fået noget. Afsenderadressen bliver stående som vores
      egen, fordi domænet er verificeret hos Resend; sender vi som kunden,
      ryger mailen i spamfilteret på SPF/DKIM.
    */
    svarTil: v.email,
  };
}
