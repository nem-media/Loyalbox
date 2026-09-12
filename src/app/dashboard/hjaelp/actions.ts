"use server";

import { after } from "next/server";
import { sendIntern } from "@/lib/mail";
import { noterFejl } from "@/lib/drift";
import { getCurrentUser } from "@/lib/auth";
import { COMPANY, getProduct } from "@/lib/constants";
import { laesSupport, supportMail, type SupportFejl } from "@/lib/kontakt";

export interface SupportResultat {
  ok?: boolean;
  fejl?: SupportFejl;
  /** Noget gik galt hos os — ikke i det, kunden skrev. */
  fejlbesked?: string;
  /** Det skrevne sendt retur, så React ikke tømmer felterne ved en afvisning. */
  udfyldt?: Record<string, string>;
}

/**
 * Support fra hjælpesiden i dashboardet.
 *
 * HVEM DER SKRIVER, LÆSES AF SESSIONEN OG ALDRIG AF FORMULAREN. Butik, produkt,
 * niveau og mailadresse kommer fra `getCurrentUser()`. Lå de i skjulte felter,
 * kunne de forfalskes, og en henvendelse ville se ud til at komme fra en anden
 * butik, end den gjorde. Det er også derfor, formularen kun har to felter.
 *
 * MAILEN SENDES FØR SVARET, samme regel som på den offentlige formular: ellers
 * får kunden at vide, at beskeden er sendt, uden at vi ved, om den nåede frem.
 */
export async function sendSupport(
  _forrige: SupportResultat,
  formData: FormData,
): Promise<SupportResultat> {
  const user = await getCurrentUser();
  if (!user) {
    // Siden ligger bag login, så det her sker kun, hvis sessionen udløb, mens
    // beskeden blev skrevet. Sig det ligeud frem for at tabe teksten i stilhed.
    return {
      fejlbesked:
        "Du er blevet logget ud. Log ind igen, og send beskeden — eller skriv til " +
        `${COMPANY.email}.`,
    };
  }

  const raa = { emne: formData.get("emne"), besked: formData.get("besked") };
  const udfyldt = Object.fromEntries(
    Object.entries(raa).filter(([, v]) => typeof v === "string"),
  ) as Record<string, string>;

  const laest = laesSupport(raa);
  if (!laest.ok) return { fejl: laest.fejl, udfyldt };

  /*
    `supportFor` er sat, når en ADMIN kigger i en kundes dashboard. Så er
    butikken kundens, mens mailadressen er vores egen — og dét skal stå i
    mailen, ellers ligner det en henvendelse fra butikken selv.
  */
  const virksomhed = user.company;
  const { emne, tekst, svarTil } = supportMail(laest.vaerdier!, {
    email: user.email,
    butik: virksomhed?.name,
    produkt: getProduct(virksomhed?.product_slug ?? "")?.name ?? null,
    plan: virksomhed?.plan,
    viaAdmin: Boolean(user.supportFor),
  });

  const sendt = await sendIntern(emne, tekst, svarTil);

  if (!sendt) {
    // Beskedens INDHOLD må aldrig i driftsloggen — den er fritekst fra et
    // menneske. Kun at nogen prøvede, og hvem vi skal ringe tilbage til.
    after(() =>
      noterFejl("support", `Kunne ikke sende en henvendelse fra ${user.email}`),
    );
    return {
      fejlbesked: `Vi kunne ikke sende din besked lige nu. Prøv igen, eller skriv direkte til ${COMPANY.email}.`,
      udfyldt,
    };
  }

  return { ok: true };
}
