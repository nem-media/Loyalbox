"use server";

import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { generateSlug } from "@/lib/utils";
import {
  adresseSpaerre,
  adresserTilladt,
  prisPrAdresse,
  ADRESSE_TEKSTER,
} from "@/lib/abonnement";
import { koebEkstraAdresse, standerPrisForDesign } from "@/lib/ekstra-adresse";
import { skalBetaleFrontfarve, type DesignValg } from "@/lib/design";
import { getProduct, TERMS_VERSION } from "@/lib/constants";
import { koebSpaerre } from "@/lib/commerce";
import { noterFejl } from "@/lib/drift";
import { modtagerNavn, tilStripeShipping } from "@/lib/adresse";
import { ordrevarsel, type Ordredetaljer } from "@/lib/ordrevarsel";
import { ordrebekraeftelse } from "@/lib/ordrebekraeftelse";
import { sendIntern, sendKundeMail } from "@/lib/mail";
import { reviewUrl } from "@/lib/site";
import { EKSTRA_STANDER_SLUG } from "@/components/bestil-stander";
import type { FormResult } from "../actions";

/**
 * "Har du åbnet en butik mere?" — købet af QR-adresse nummer to.
 *
 * HELE POINTEN ER, AT DER IKKE OPRETTES ET ABONNEMENT MERE. En virksomhed
 * bærer ét `stripe_subscription_id`, ét login og ét stempelkort, der gælder på
 * tværs af butikkerne. En butik mere er derfor en LINJE mere på det
 * abonnement, der allerede kører — mekanikken står i
 * `koebEkstraAdresse()` (src/lib/ekstra-adresse.ts).
 *
 * EGEN VIRKSOMHED PR. BUTIK ER DEN ANDEN MODEL, og den hører til franchise,
 * hvor stempelkortet netop IKKE skal deles. Valget mellem de to kan ikke gøres
 * om bagefter — stempler, medlemmer og statistik ligger, hvor de blev lagt —
 * og det er derfor selvbetjeningen har et loft, se `ADRESSER_SELVBETJENING_MAKS`.
 *
 * OG SKILTET KØBES MED. En ny adresse er en ny QR-kode, og en trykt QR kan
 * ikke omdirigeres; en adresse uden et skilt er en tom linje på fakturaen.
 * Samme regel som ved hovedkøbet, hvor et abonnement KØBES med en stander.
 */
export async function tilfoejButik(
  _prev: FormResult,
  formData: FormData,
): Promise<FormResult> {
  const user = await getCurrentUser();
  const company = user?.company;
  if (!company) return { error: "Ingen virksomhed fundet." };

  const navn = String(formData.get("name") ?? "").trim();
  if (!navn) return { error: "Giv butikken et navn." };

  /*
   * ACCEPTEN KRÆVES HER SOM VED ETHVERT ANDET KØB — og det er vigtigere her
   * end noget andet sted: der er ingen Stripe-checkout imellem, hvor
   * betingelserne ellers ville blive vist. Knappen ER betalingen.
   */
  if (formData.get("accepterVilkaar") !== "on") {
    return { error: "Du skal acceptere handelsbetingelserne for at gå videre." };
  }

  /*
   * `koebSpaerre()` ER DEN ENESTE DØR. Skiltet er den samme vare som i
   * "Mangler du et skilt?", og adgangen til at købe den skal afgøres samme
   * sted — ellers kan denne knap sælge noget, /bestil siger nej til. Den
   * fanger både en manglende Stripe-nøgle og testtilstanden, hvor kun
   * testkontiene må betale.
   */
  const vare = getProduct(EKSTRA_STANDER_SLUG);
  if (koebSpaerre(user, vare)) {
    return { error: "Købet er ikke åbent her. Skriv til os, så ordner vi det." };
  }

  const admin = createAdminClient();

  /*
   * SAMME SPÆRRE SOM KNAPPEN, og antallet tælles i BASEN — samme grund som i
   * `createStand()`: handlingen kører i mange eksemplarer, og en variabel
   * ville lade to faner slippe forbi.
   *
   * NULL ER OGSÅ ET NEJ HER, og det er den vigtigste af grenene: der er plads
   * i det, kunden allerede betaler for, og så skal adressen OPRETTES og ikke
   * købes. Uden dette led ville et gammelt faneblad kunne tage penge for
   * noget, kunden har i forvejen.
   */
  const { count } = await admin
    .from("stands")
    .select("id", { count: "exact", head: true })
    .eq("company_id", company.id);

  const spaerre = adresseSpaerre(company, count ?? 0);
  if (spaerre !== "kan-koebes") {
    return {
      error:
        spaerre === null
          ? "Du har allerede en QR-adresse til gode — opret den i stedet for at købe en ny."
          : spaerre === "intet-abonnement"
            ? ADRESSE_TEKSTER.intetAbonnement
            : `${ADRESSE_TEKSTER.loftOverskrift}. ${ADRESSE_TEKSTER.loftHjaelp}`,
    };
  }

  /*
   * DESIGNET VÆLGES BLANDT DEM, KUNDEN HAR — der laves ikke et nyt her.
   *
   * Butikken har allerede bestilt mindst ét skilt (det fulgte med købet), og
   * butik nummer to skal se ud som butik nummer ét. Vil de have noget andet,
   * er vejen den almindelige bestilling inde på den nye adresse bagefter.
   *
   * EJERSKABET LIGGER I FORESPØRGSLEN og ikke i en kontrol bagefter, præcis
   * som i /api/checkout: et design, der tilhører en anden butik, må ikke
   * engang læses.
   */
  const designId = String(formData.get("design_id") ?? "");
  if (!designId) return { error: "Vælg det design, skiltet skal trykkes med." };

  const { data: design } = await admin
    .from("designs")
    .select(
      "id, stander_farve, front_type, front_hex, accent_hex, frontfarve_betalt",
    )
    .eq("id", designId)
    .eq("company_id", company.id)
    .maybeSingle();

  if (!design) return { error: "Designet blev ikke fundet." };

  // Prisen regnes SERVERSIDE ud af designet, aldrig af noget klienten sendte.
  const betalFrontfarve = skalBetaleFrontfarve(design as DesignValg);
  const standerPris = standerPrisForDesign({
    stander_farve: design.stander_farve,
    betalFrontfarve,
  });

  /*
   * PLADSEN RESERVERES FØR DER BETALES — en optimistisk lås.
   *
   * To faner kunne ellers begge komme forbi tællingen ovenfor og begge
   * trække penge, og en dobbelt opkrævning er værre end en fejlbesked.
   * Betingelsen `.eq("adresser_tilladt", foer)` gør opdateringen til
   * databasens afgørelse: den, der taber kapløbet, rammer nul rækker.
   *
   * VALGT SÅDAN, FORDI DEN FORKERTE UDGANG SKAL VÆRE DEN BILLIGE. Fejler
   * betalingen bagefter, sættes tallet tilbage — og lykkes selv dét ikke,
   * står kunden med én adresse for meget, som de ikke er blevet trukket for.
   * Det er til at rette. En dobbelt opkrævning på et rigtigt kort er ikke.
   */
  /*
   * ACCEPTEN STEMPLES FØR BETALINGEN. Fejler betalingen, har kunden ikke
   * fået noget, og en accept uden køb er harmløs — modsat et køb uden
   * accept. Samme rækkefølge som i /api/checkout.
   */
  const { error: vilkaarFejl } = await admin
    .from("companies")
    .update({
      terms_accepted_at: new Date().toISOString(),
      terms_version: TERMS_VERSION,
    })
    .eq("id", company.id);

  if (vilkaarFejl) {
    // Købet stoppes ikke: accepten er givet i kraft af afkrydsningsfeltet.
    // Men fejlen skal ud af systemet — ellers står kunden uden registreret
    // accept, og ingen ville opdage det.
    await noterFejl(
      "vilkaar-accept",
      `Kunne ikke registreres ved ekstra butik for ${company.id}: ${vilkaarFejl.message}`,
    );
  }

  const foer = adresserTilladt(company);
  const { data: reserveret } = await admin
    .from("companies")
    .update({ adresser_tilladt: foer + 1 })
    .eq("id", company.id)
    .eq("adresser_tilladt", foer)
    .select("id")
    .maybeSingle();

  if (!reserveret) {
    return { error: "Der skete noget samtidig med dit klik. Prøv igen." };
  }

  const svar = await koebEkstraAdresse(company, standerPris);

  if (!svar.ok) {
    // Reservationen rulles tilbage. Betingelsen sikrer, at vi kun tager DET
    // tal tilbage, vi selv satte — har en webhook nået at rette i mellemtiden,
    // er Stripes tal det rigtige, og vi skal ikke overskrive det.
    await admin
      .from("companies")
      .update({ adresser_tilladt: foer })
      .eq("id", company.id)
      .eq("adresser_tilladt", foer + 1);

    if (svar.fejl === "stripe" || svar.fejl === "linjen-mangler") {
      await noterFejl(
        "ekstra-adresse",
        `Købet fejlede for virksomhed ${company.id}: ${svar.fejl}${
          svar.besked ? ` — ${svar.besked}` : ""
        }`,
      );
    }

    return { error: koebsFejlTekst(svar.fejl) };
  }

  const kvittering = svar.kvittering;

  /*
   * STRIPE ER SANDHEDEN OM ANTALLET. Reservationen ovenfor var et gæt på, at
   * de to tal fulgtes ad; her skrives det, abonnementet FAKTISK står på. Er
   * de kommet i utakt, er det her, de kommer i takt igen.
   */
  await admin
    .from("companies")
    .update({ adresser_tilladt: kvittering.adresserTilladt })
    .eq("id", company.id);

  /*
   * ADRESSEN OPRETTES EFTER BETALINGEN, og fejler den, er kunden ikke
   * fanget: `adresser_tilladt` er hævet, så /dashboard/standere viser den
   * almindelige "Opret QR-adresse"-formular. Fejlen skal alligevel ud af
   * systemet — vi skal vide, at nogen betalte for noget, de selv måtte
   * oprette bagefter.
   */
  const { data: stand } = await admin
    .from("stands")
    .insert({ company_id: company.id, name: navn, slug: generateSlug() })
    .select("id, slug")
    .maybeSingle();

  if (!stand) {
    await noterFejl(
      "ekstra-adresse",
      `Adressen kunne ikke oprettes efter betaling for virksomhed ${company.id}.`,
    );
  }

  /*
   * ORDREN PÅ SKILTET.
   *
   * STATUS SÆTTES HER OG IKKE AF EN WEBHOOK. Ved et almindeligt køb står
   * ordren som `new` ("oprettet, aldrig betalt"), indtil webhooken flytter
   * den — men der ER ingen checkout-session i dette flow, og altså ingen
   * webhook, der kommer forbi. Blev den stående som `new`, ville et betalt
   * skilt aldrig komme i produktion, og ingen ville opdage det.
   *
   * Kræver betalingen stadig en godkendelse, bliver den `new` med vilje:
   * så er den ikke betalt endnu, og den skal ikke pakkes.
   */
  const levering = tilStripeShipping(
    company,
    modtagerNavn(company.name, company.kontaktperson),
  );

  const { error: ordreFejl } = await admin.from("orders").insert({
    company_id: company.id,
    product_name: vare?.name ?? "Ekstra stander",
    product_slug: EKSTRA_STANDER_SLUG,
    quantity: 1,
    status: kvittering.betalt ? ("needs_onboarding" as const) : ("new" as const),
    total_amount: standerPris,
    design_id: design.id,
    stand_id: stand?.id ?? null,
    frontfarve_beloeb: betalFrontfarve ? standerPris - (vare?.price ?? 0) : 0,
    leveringsadresse: levering?.address ?? null,
  });

  if (ordreFejl) {
    await noterFejl(
      "ekstra-adresse",
      `Ordren kunne ikke gemmes efter betaling for virksomhed ${company.id}: ${ordreFejl.message}`,
    );
  }

  await varslOmEkstraButik({
    company,
    navn,
    slug: stand?.slug ?? null,
    standerPris,
    kvittering,
    leveringslinjer: levering
      ? [
          levering.name,
          levering.address.line1,
          `${levering.address.postal_code} ${levering.address.city}`,
        ]
      : [],
  });

  revalidatePath("/dashboard/standere");

  /*
   * KRÆVER BETALINGEN EN GODKENDELSE, skal kunden have fakturaen at gøre
   * den færdig på. Butikken er oprettet uanset hvad — en manglende betaling
   * er suspension og ikke ophør, og bliver fakturaen aldrig betalt, går
   * abonnementet i `past_due` ad den vej, systemet i forvejen kender.
   */
  if (!kvittering.betalt && kvittering.fakturaUrl) {
    return {
      ok: true,
      message: `${navn} er oprettet, men betalingen mangler en godkendelse fra din bank. Gør den færdig her: ${kvittering.fakturaUrl}`,
      gaaTil: stand ? `/dashboard/standere/${stand.id}` : undefined,
    };
  }

  return {
    ok: true,
    gaaTil: stand ? `/dashboard/standere/${stand.id}` : undefined,
  };
}

/** Det kunden får at vide, når købet ikke kunne gennemføres. */
function koebsFejlTekst(fejl: string): string {
  switch (fejl) {
    case "ikke-betalende":
      return "Dit abonnement er sat på pause, indtil betalingen er på plads. Ordn den først, så kan du tilføje en butik.";
    case "intet-hos-stripe":
    case "linjen-mangler":
    case "intet-abonnement":
      return "Vi kunne ikke finde dit abonnement hos vores betalingsudbyder. Skriv til os, så ordner vi det i hånden.";
    case "ikke-aabnet":
      return "Betaling er ikke åben i dette miljø.";
    default:
      return "Betalingen kunne ikke gennemføres. Vi har fået besked og ser på det — prøv igen om lidt.";
  }
}

/**
 * De to mails — ét datasæt, præcis som ved et almindeligt køb.
 *
 * VARSLET TIL OS ER DET VIGTIGSTE: der skal pakkes et skilt, og den viden
 * findes ellers kun i admin, som ingen har åbent. Kundens bekræftelse sendes
 * EFTER, så en fejl i den ikke koster os beskeden om, at der er noget at
 * sende — samme rækkefølge som i webhooken.
 *
 * Kaster aldrig. En mail, der ikke kan sendes, må ikke vælte et køb, der er
 * betalt.
 */
async function varslOmEkstraButik(v: {
  company: {
    id: string;
    name: string;
    cvr?: string | null;
    contact_email?: string | null;
    billing_email?: string | null;
    product_slug?: string | null;
  };
  navn: string;
  slug: string | null;
  standerPris: number;
  kvittering: { adresserTilladt: number; beloebExMoms: number };
  leveringslinjer: string[];
}): Promise<void> {
  try {
    const vare = getProduct(EKSTRA_STANDER_SLUG);
    const prAdresse = prisPrAdresse(v.company);

    const detaljer: Ordredetaljer = {
      type: "tilkoeb",
      vare: `${vare?.name ?? "Ekstra stander"} til ny butik: ${v.navn}`,
      antal: 1,
      beloeb: v.kvittering.beloebExMoms,
      /*
       * DET SAMLEDE MÅNEDSBELØB OG IKKE PRISEN FOR DEN ENE BUTIK. Kunden
       * skal kunne genkende det, der bliver trukket den 20. — står der 399,
       * mens der trækkes 798, ser mailen ud til at handle om noget andet.
       */
      maanedligt: prAdresse ? prAdresse * v.kvittering.adresserTilladt : null,
      firmanavn: v.company.name,
      cvr: v.company.cvr ?? null,
      email: v.company.billing_email ?? v.company.contact_email ?? null,
      leveringslinjer: v.leveringslinjer,
      // Der ER ingen checkout-session i dette flow; betalingen er en faktura
      // på abonnementet. En opdigtet reference ville være værre end ingen.
      sessionId: null,
      // Med abonnement er adressen vores egen og kan altid pege et nyt sted
      // hen — derfor er den ikke `fast`.
      qrAdresse: v.slug ? reviewUrl(v.slug) : null,
      qrFast: false,
    };

    const { emne, tekst } = ordrevarsel(detaljer);
    if (!(await sendIntern(emne, tekst))) {
      await noterFejl(
        "ordrevarsel",
        `Kunne ikke sendes for ekstra butik hos ${v.company.id}`,
      );
    }

    if (detaljer.email) {
      const kunde = ordrebekraeftelse(detaljer);
      if (!(await sendKundeMail(detaljer.email, kunde.emne, kunde.tekst))) {
        await noterFejl(
          "ordrebekraeftelse",
          `Kunne ikke sendes for ekstra butik hos ${v.company.id}`,
        );
      }
    }
  } catch (err) {
    await noterFejl(
      "ordrevarsel",
      `Fejl under varsel om ekstra butik hos ${v.company.id}: ${
        (err as Error).message
      }`,
    );
  }
}
