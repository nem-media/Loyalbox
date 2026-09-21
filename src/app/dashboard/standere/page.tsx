import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { reviewUrl } from "@/lib/site";
import { PageHeader, Sektion } from "@/components/dashboard-shell";
import { DesignListe } from "./design-liste";
import { Card, CardBody } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateStand } from "./create-stand";
import { GuideHint } from "@/components/guide";
import { EmptyState } from "@/components/ui/empty-state";
import { StandIcon } from "@/components/nav-icons";
import {
  adresseSpaerre,
  adresserTilladt,
  kanKoebeAdresseSelv,
  prisPrAdresse,
  ADRESSE_TEKSTER,
} from "@/lib/abonnement";
import { PRODUCTS, COMPANY, getProduct } from "@/lib/constants";
import { koebSpaerre } from "@/lib/commerce";
import { standerPrisForDesign } from "@/lib/ekstra-adresse";
import { skalBetaleFrontfarve, designFrontfarve } from "@/lib/design";
import { standerFarveNavn } from "@/lib/stander-tilvalg";
import { createAdminClient } from "@/lib/supabase/admin";
import { EKSTRA_STANDER_SLUG } from "@/components/bestil-stander";
import { TilfoejButik, type DesignValgmulighed } from "./tilfoej-butik";

/** Varerne med en QR-adresse. Udledt, så navnene ikke kan drive. */
const ABONNEMENTER = PRODUCTS.filter((p) => p.monthlyPrice && !p.addon).map(
  (p) => p.name,
);

export const metadata = { title: "Standere" };

export default async function StandsPage() {
  const user = await getCurrentUser();
  const company = user!.company;
  const supabase = await createClient();

  const { data: stands } = company
    ? await supabase
        .from("stands")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: true })
    : { data: [] };

  /*
   * SAMME SPÆRRE SOM HANDLINGEN. `adresseSpaerre()` er det ene sted,
   * reglen står, så knappen og `createStand()` ikke kan svare forskelligt.
   */
  const graense = adresseSpaerre(company, stands?.length ?? 0);

  /*
   * KØBET AF EN BUTIK MERE — kun hentet, når det er dét, skærmen skal vise.
   *
   * `koebSpaerre()` spørges OGSÅ, og det er den samme dør som alle andre
   * steder: er der ingen Stripe-nøgle, eller er vi i testtilstand uden en
   * testkonto, må knappen ikke stå der. Så falder vi tilbage på den besked,
   * der beder kunden skrive til os — det er stadig sandt.
   *
   * DESIGNENE HENTES MED SERVICE-ROLE, præcis som `DesignListe` gør det
   * lige nedenfor på samme side.
   */
  const maaKoebe =
    graense === "kan-koebes" &&
    kanKoebeAdresseSelv(company) &&
    koebSpaerre(user, getProduct(EKSTRA_STANDER_SLUG)) === null;

  const { data: designRaekker } = maaKoebe && company
    ? await createAdminClient()
        .from("designs")
        .select(
          "id, navn, stander_farve, front_type, front_hex, accent_hex, frontfarve_betalt",
        )
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
    : { data: null };

  const designValg: DesignValgmulighed[] = (designRaekker ?? []).map((d) => ({
    id: d.id,
    navn: d.navn,
    beskrivelse: `${standerFarveNavn(d.stander_farve)} stander · ${
      designFrontfarve(d).beskrivelse
    }`,
    // Prisen regnes af DESIGNET: en sort stander koster mere, og en egen
    // frontfarve, der allerede er betalt, koster ikke igen.
    pris: standerPrisForDesign({
      stander_farve: d.stander_farve,
      betalFrontfarve: skalBetaleFrontfarve(d),
    }),
  }));

  const prAdresse = prisPrAdresse(company) ?? 0;
  const tilladt = adresserTilladt(company);

  return (
    <>
      <PageHeader
        title="Standere"
        description="Hver stander har sit eget dynamiske link og QR-kode. Det fysiske skilt bestilles for sig."
      />

      <GuideHint id="standere" className="mb-6" />

      {/* OPRETTELSEN VISES KUN, NÅR DEN VIRKER. Selve spærringen ligger i
          `createStand()` — en skjult knap er ikke adgangskontrol — men en
          formular, der altid afviser, er en dårlig måde at sige det på.

          GRÆNSEN AFGØRES AF SAMME FUNKTION som handlingen bruger. Stod der
          et håndskrevet `stands.length < 1` her, ville de to kunne komme i
          utakt den dag, tallet ændrer sig. */}
      <Card className="mb-4">
        <CardBody>
          {graense === null ? (
            <CreateStand />
          ) : maaKoebe ? (
            <>
              {/* FØRST HVAD DE HAR, SÅ HVAD DE KAN KØBE. Den, der trykker
                  "opret", vil som regel bare have et skilt mere — og skal
                  ikke tro, at dét kræver et køb. Misforståelsen ryddes af
                  vejen, før prisen nævnes. */}
              <p className="font-semibold tracking-tight">
                {ADRESSE_TEKSTER.graenseOverskrift}
              </p>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
                {ADRESSE_TEKSTER.graenseHjaelp}
              </p>
              <hr className="my-5 border-border" />
              <TilfoejButik
                designs={designValg}
                adresseNummer={tilladt + 1}
                maanedsprisPrAdresse={prAdresse}
                maanedsprisEfter={prAdresse * (tilladt + 1)}
              />
            </>
          ) : graense === "kan-koebes" || graense === "kontakt-os" ? (
            <>
              <p className="font-semibold tracking-tight">
                {graense === "kontakt-os"
                  ? ADRESSE_TEKSTER.loftOverskrift
                  : ADRESSE_TEKSTER.graenseOverskrift}
              </p>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
                {graense === "kontakt-os"
                  ? ADRESSE_TEKSTER.loftHjaelp
                  : ADRESSE_TEKSTER.graenseHjaelp}
              </p>
              <p className="mt-3 text-sm">
                <Link
                  href={`mailto:${COMPANY.email}`}
                  className="trykmaal inline-block font-medium text-accent hover:underline"
                >
                  Skriv til os om en butik mere →
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="font-semibold tracking-tight">
                QR-adresser følger med et abonnement
              </p>
              <p className="mt-1.5 max-w-2xl text-sm leading-relaxed text-muted">
                Med {ABONNEMENTER.join(" eller ")} får du QR-adresser, du kan
                pege hvorhen du vil, din egen anmeldelsesside og indsigt i, hvad
                der sker. Du kan designe og bestille dit skilt uden — adressen
                kommer med abonnementet.
              </p>
              <div className="mt-4 flex flex-wrap gap-4 text-sm font-medium">
                <Link href="/dashboard/abonnement" className="trykmaal text-accent">
                  Se dit abonnement →
                </Link>
                <Link href="/bestil" className="trykmaal text-accent">
                  Design og bestil et skilt →
                </Link>
              </div>
            </>
          )}
        </CardBody>
      </Card>

      {/* Bestillingen ligger nu INDE PAA den enkelte stander og ikke her.
          Den generelle boks lavede en ordre uden at sige, hvilken QR-adresse
          skiltet skulle trykkes med — og et skilt uden en QR er ingenting.
          Hver stander har sin egen vej ind via "Tilpas og bestil skilt". */}
      {/* `grid-cols-1` ER IKKE PYNT — DEN KLEMMER SPORET.
          Uden den er den implicitte kolonne `auto`, og et gitterelement har
          `min-width: auto`: kortet kan ikke skrumpe under sit indholds
          min-bredde, og med en `truncate`-overskrift (white-space: nowrap) er
          den bredde stor. Målt på en telefon i 375 px blev kortet 442 px, og
          HELE siden fik vandret scroll. `sm:grid-cols-2` har problemet ikke,
          fordi Tailwind udskriver den som `minmax(0, 1fr)`. */}
      {stands && stands.length ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {stands.map((s) => (
            /* Hele kortet er stadig ét link, men "Tilpas" står nu skrevet.
               Et kort, der bare bliver lidt grønt i kanten ved hover, kan
               kunden ikke se er en vej videre — og på en telefon findes hover
               slet ikke, så dér var der INGEN antydning af, at man kunne
               klikke. Knappen er derfor tekst og ikke kun en farve. */
            <Link
              key={s.id}
              href={`/dashboard/standere/${s.id}`}
              className="group"
            >
              <Card className="h-full transition-colors group-hover:border-accent">
                <CardBody className="flex h-full flex-col gap-3">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-semibold">{s.name}</h3>
                    <Badge tone={s.is_active ? "success" : "neutral"}>
                      {s.is_active ? "Aktiv" : "Inaktiv"}
                    </Badge>
                  </div>
                  <p className="truncate text-sm text-accent">
                    {reviewUrl(s.slug)}
                  </p>
                  <p className="text-xs text-muted">
                    Destination: {s.destination_type}
                  </p>

                  <span className="mt-auto flex items-center gap-1.5 pt-1 text-sm font-medium text-accent">
                    Tilpas og bestil skilt
                    <span
                      aria-hidden="true"
                      className="transition-transform group-hover:translate-x-0.5"
                    >
                      →
                    </span>
                  </span>
                </CardBody>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <EmptyState
          icon={StandIcon}
          title="Ingen standere endnu"
          description="Opret din første ovenfor — giv den et navn du kan kende den på, fx “Disken”. Bagefter sætter du de links på, kunden skal kunne vælge imellem, og bestiller det fysiske skilt."
        />
      )}

      {/* Designet hørte før til et selvstændigt menupunkt med SAMME ikon som
          Standere. Det giver kun mening sammen med den stander, det trykkes
          på, så det hører hjemme her. */}
      {company ? (
        <Sektion titel="Design" id="design">
          <DesignListe companyId={company.id} />
        </Sektion>
      ) : null}
    </>
  );
}
