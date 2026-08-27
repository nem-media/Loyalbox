"use server";

import { after } from "next/server";
import { sendIntern } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import {
  laesVenteliste,
  ventelisteMail,
  type VentelisteFejl,
} from "@/lib/venteliste";

export interface VentelisteResultat {
  ok?: boolean;
  fejl?: VentelisteFejl;
  /** Noget gik galt hos os — ikke i det, brugeren skrev. */
  fejlbesked?: string;
}

/**
 * Skriv mig op, når salget åbner.
 *
 * DER GEMMES INTET HOS OS. Tilmeldingen sendes som en mail til
 * kontakt@loyalsum.dk. En tabel med navne og telefonnumre ville udløse
 * opbevaringsfrister, sletterutiner og et afsnit i databehandleraftalen — for
 * noget, der skal bruges én gang.
 *
 * MAILEN SENDES FØR SVARET, og det er med vilje. Ellers ville brugeren få at
 * vide, at de er skrevet op, uden at vi ved, om beskeden nåede frem — og en
 * venteliste, ingen har, er værre end ingen venteliste. Sammenlign med
 * ordrevarslet, der bruger `after()`: dér er pengene hjemme uanset, så
 * beskeden må gerne komme bagefter. Her ER beskeden det hele.
 */
export async function skrivMigOp(
  _forrige: VentelisteResultat,
  formData: FormData,
): Promise<VentelisteResultat> {
  /*
   * HONNINGKRUKKEN. Feltet er skjult for mennesker og udfyldes kun af en
   * robot, der udfylder alt. Vi svarer OK uden at sende noget: en robot, der
   * får en fejl, prøver igen med en anden formulering.
   */
  if (String(formData.get("hjemmeside") ?? "").trim() !== "") {
    return { ok: true };
  }

  const laest = laesVenteliste({
    navn: formData.get("navn"),
    email: formData.get("email"),
    telefon: formData.get("telefon"),
    interesse: formData.get("interesse"),
  });

  if (!laest.ok) return { fejl: laest.fejl };

  const { emne, tekst } = ventelisteMail(laest.vaerdier!);
  const sendt = await sendIntern(emne, tekst);

  if (!sendt) {
    // Loggen skal kunne fortælle os, at nogen prøvede — også når mailen
    // fejlede. Uden den ville tilmeldingen forsvinde sporløst.
    after(() =>
      noterFejl(
        "venteliste",
        `Kunne ikke sende tilmelding fra ${laest.vaerdier!.email}`,
      ),
    );
    return {
      fejlbesked:
        "Vi kunne ikke sende din tilmelding lige nu. Prøv igen, eller skriv til kontakt@loyalsum.dk.",
    };
  }

  return { ok: true };
}
