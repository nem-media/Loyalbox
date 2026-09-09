import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { ButtonLink } from "@/components/ui/button";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/auth";
import { COMPANY } from "@/lib/constants";
import { aktiveringSpaerre } from "@/lib/aktivering";
import { aktiverFraSession } from "@/app/aktiver/actions";
import { AktiverForm, AktiveringSpaerret } from "@/components/aktiver-form";

export const metadata = {
  title: "Tak for din bestilling",
  robots: { index: false, follow: false },
};

/**
 * Kvittering efter Stripe Checkout.
 *
 * SIDEN BEKRÆFTER IKKE BETALINGEN. Den kommer fra Stripes redirect, som en
 * bruger i teorien kan kalde direkte — sandheden om, at pengene er hjemme,
 * kommer fra webhooken. Derfor er teksten holdt til "vi har modtaget din
 * bestilling" frem for at love, at der er trukket.
 *
 * DER ER TO SLAGS KØBERE HER, og de skal ikke have samme besked. Et
 * abonnement giver en konto, og næste skridt ligger i dashboardet. Et køb
 * uden konto giver INTET login — siden sendte alligevel alle videre til
 * "Gå til dashboardet" og "Sæt din stander op", altså to knapper, der fører
 * til en loginskærm, man aldrig kan komme forbi. Det er den værst tænkelige
 * besked at få lige efter en betaling.
 */
export default async function OrderThanksPage({
  searchParams,
}: {
  searchParams: Promise<{ session_id?: string }>;
}) {
  const { session_id } = await searchParams;
  const { medKonto, firma } = await koebsTilstand(session_id);

  /*
   * ET ABONNEMENT KØBT UDEN KONTO er den nye, tredje slags køber, og den skal
   * hverken have "gå til dashboardet" (der er intet login endnu) eller "du
   * skal ikke gøre mere" (det skal de). De skal vælge en adgangskode, og de
   * skal kunne gøre det HER — ikke i en mail, der kan lande forkert.
   */
  const spaerre = firma ? aktiveringSpaerre(firma) : null;
  const kanAktivere = Boolean(firma && !spaerre && session_id);

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-2xl px-4 py-20">
        <div className="box-shape border border-accent/30 bg-accent/5 p-8 text-center">
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Tak for din bestilling
          </h1>
          <p className="mt-3 leading-relaxed text-muted">
            Vi har modtaget den. Du får en kvittering på mail, så snart
            betalingen er bekræftet — den kan bruges til bogføring.
          </p>
        </div>

        <div className="mt-8">
          <h2 className="font-bold tracking-tight">Hvad sker der nu?</h2>
          <ol className="mt-3 space-y-2 text-muted">
            {(kanAktivere
              ? TRIN_AKTIVERING
              : medKonto
                ? TRIN_MED_KONTO
                : TRIN_UDEN_KONTO
            ).map((trin, i) => (
              <li key={trin}>
                {i + 1}. {trin}
              </li>
            ))}
          </ol>
        </div>

        {kanAktivere ? (
          <AktiverForm
            action={aktiverFraSession}
            skjultFelt={{ navn: "session_id", vaerdi: session_id! }}
          />
        ) : firma && spaerre ? (
          <AktiveringSpaerret grund={spaerre} />
        ) : medKonto ? (
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <ButtonLink href="/dashboard" size="lg">
              Gå til dashboardet
            </ButtonLink>
            <ButtonLink href="/dashboard/standere" variant="outline" size="lg">
              Sæt din stander op
            </ButtonLink>
          </div>
        ) : (
          /* INGEN KNAP TIL DASHBOARDET. Der er intet login at gå ind med, og
             en knap, der beder om en adgangskode, man aldrig har fået, ligner
             en fejl i købet. Til gengæld skal det siges HØJT, at der ikke
             mangler noget — ellers leder man efter en mail, der aldrig
             kommer.

             INTET SALG HER. Kunden har lige betalt; et tilbud om at opgradere
             i samme åndedrag læser som om købet ikke var nok. Vejen til de
             øvrige varer står på bestillingssiden, før man beslutter sig. */
          <p className="mt-8 leading-relaxed text-muted">
            Der følger ikke noget login med, og du skal ikke gøre mere —
            skiltet virker af sig selv, når det kommer.
          </p>
        )}

        <p className="mt-8 text-sm text-muted">
          Noget der ikke stemmer? Skriv til{" "}
          <Link
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-accent"
          >
            {COMPANY.email}
          </Link>
          .
        </p>
      </main>
      <SiteFooter />
    </>
  );
}

const TRIN_MED_KONTO = [
  "Vi sætter din stander op med dit logo og dine links og sender den afsted.",
  "Din adgang åbnes i dashboardet, så du kan gøre klar imens.",
  "Sæt standeren på disken, og du er i gang.",
];

/**
 * Abonnement købt uden konto. Standeren ER oprettet af betalingen — den
 * mangler kun at vide, hvor QR-koden skal føre hen, og dét er første skridt
 * i dashboardet.
 */
const TRIN_AKTIVERING = [
  "Vælg en adgangskode nedenfor, så åbner dit dashboard.",
  "Fortæl hvor QR-koden skal føre hen — det kan ændres når som helst.",
  `Vi trykker og sender skiltet — typisk ${COMPANY.deliveryDays}.`,
];

const TRIN_UDEN_KONTO = [
  "Vi trykker skiltet med dit logo og det link, du valgte.",
  `Vi sender det til adressen fra betalingen — typisk ${COMPANY.deliveryDays}.`,
  "Sæt det på disken. QR-koden og NFC-taggen peger direkte på dit link.",
];

/**
 * Hvilken af de to beskeder skal kunden have?
 *
 * ORDREN SPØRGES FØRST, fordi den ved det med sikkerhed: `uden_konto` sættes,
 * da ordren blev oprettet, og den kan ikke nå at ændre sig. Der læses ét
 * boolesk felt og intet om hverken kunde eller beløb — siden viser ikke
 * ordredata, den vælger kun ordlyd.
 *
 * Findes ordren ikke — en gammel adresse, en manglende `session_id`, en der
 * gemte linket — falder vi tilbage på, om der overhovedet er nogen logget
 * ind. Det passer med virkeligheden i begge veje ind: en abonnent købte fra
 * sit eget dashboard og er logget ind, mens en køber uden konto aldrig har
 * haft et login at være logget ind med.
 */
async function koebsTilstand(sessionId: string | undefined): Promise<{
  medKonto: boolean;
  /** Sat KUN når købet venter på en aktivering — ellers null. */
  firma: {
    user_id: string | null;
    aktivering_token: string | null;
    aktivering_udloeber: string | null;
  } | null;
}> {
  if (sessionId) {
    const admin = createAdminClient();
    const { data } = await admin
      .from("orders")
      .select("uden_konto, company_id")
      .eq("stripe_session_id", sessionId)
      .maybeSingle();

    if (data) {
      /*
       * Kun en ordre UDEN konto kan have noget at aktivere. Et abonnement
       * købt fra et dashboard har allerede en ejer, og at slå op på den ville
       * kun kunne give det forkerte svar.
       */
      if (!data.uden_konto) return { medKonto: true, firma: null };
      // En ordre uden virksomhed kan ikke aktiveres — og bør ikke findes.
      if (!data.company_id) return { medKonto: false, firma: null };

      const { data: firma } = await admin
        .from("companies")
        .select("user_id, aktivering_token, aktivering_udloeber")
        .eq("id", data.company_id)
        .maybeSingle();

      // Uden token er det et Basic-køb: der er ingen konto, og det er meningen.
      return {
        medKonto: false,
        firma: firma?.aktivering_token || firma?.user_id ? firma : null,
      };
    }
  }

  return { medKonto: Boolean(await getCurrentUser()), firma: null };
}
