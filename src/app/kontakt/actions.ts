"use server";

import { after } from "next/server";
import { sendIntern } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import { COMPANY } from "@/lib/constants";
import { laesKontakt, kontaktMail, type KontaktFejl } from "@/lib/kontakt";

export interface KontaktResultat {
  ok?: boolean;
  fejl?: KontaktFejl;
  /** Noget gik galt hos os — ikke i det, brugeren skrev. */
  fejlbesked?: string;
  /**
   * Det, brugeren skrev, sendt retur.
   *
   * REACT NULSTILLER EN FORMULAR, når dens action er kørt færdig — også når
   * den blev afvist. Uden det her stod man med en tom side og en rød linje
   * efter at have skrevet en lang besked, og så skriver de færreste den igen.
   * Værdierne lægges tilbage som `defaultValue`, og dét er præcis dét,
   * nulstillingen gendanner.
   */
  udfyldt?: Record<string, string>;
}

/**
 * Send en besked via kontaktformularen.
 *
 * MAILEN SENDES FØR SVARET, og det er med vilje — samme regel som ventelisten.
 * Ellers ville afsenderen få at vide, at beskeden er sendt, uden at vi ved, om
 * den nåede frem, og så sidder et menneske og venter på et svar, ingen har set.
 * Sammenlign med ordrevarslet, der bruger `after()`: dér er pengene hjemme
 * uanset, så beskeden må gerne komme bagefter. Her ER beskeden det hele.
 */
export async function sendKontakt(
  _forrige: KontaktResultat,
  formData: FormData,
): Promise<KontaktResultat> {
  /*
   * HONNINGKRUKKEN. Feltet er skjult for mennesker og udfyldes kun af en
   * robot, der udfylder alt. Vi svarer OK uden at sende noget: en robot, der
   * får en fejl, prøver igen med en anden formulering.
   */
  if (String(formData.get("hjemmeside") ?? "").trim() !== "") {
    return { ok: true };
  }

  const raa = {
    navn: formData.get("navn"),
    email: formData.get("email"),
    telefon: formData.get("telefon"),
    emne: formData.get("emne"),
    besked: formData.get("besked"),
  };
  // Sendes retur ved enhver afvisning, så felterne ikke bliver tømt. Kun
  // strenge: en fil eller et manglende felt har intet at lægge tilbage.
  const udfyldt = Object.fromEntries(
    Object.entries(raa).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const laest = laesKontakt(raa);

  if (!laest.ok) return { fejl: laest.fejl, udfyldt };

  const { emne, tekst, svarTil } = kontaktMail(laest.vaerdier!);
  const sendt = await sendIntern(emne, tekst, svarTil);

  if (!sendt) {
    // Loggen skal kunne fortælle os, at nogen prøvede — også når mailen
    // fejlede. Uden den forsvinder henvendelsen sporløst. Beskedens INDHOLD
    // må aldrig med i driftsloggen: den er fritekst fra et menneske og kan
    // indeholde hvad som helst, og loggen er ikke stedet for personoplysninger.
    after(() =>
      noterFejl(
        "kontaktformular",
        `Kunne ikke sende en henvendelse fra ${laest.vaerdier!.email}`,
      ),
    );
    return {
      fejlbesked: `Vi kunne ikke sende din besked lige nu. Prøv igen, eller skriv direkte til ${COMPANY.email}.`,
      udfyldt,
    };
  }

  return { ok: true };
}
