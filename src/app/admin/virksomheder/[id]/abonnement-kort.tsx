import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  abonnementTilstand,
  dageTil,
  sletningSker,
  suspensionUdloeber,
} from "@/lib/abonnement";
import {
  TILSTAND_ETIKET,
  maanedspris,
  produktNavn,
  stripeStatusTekst,
  type AbonnentFelter,
} from "@/lib/abonnenter";
import type { Betaling } from "@/lib/stripe-abonnement";

/** Én linje i kortet. Etiket til venstre, svar til højre — aldrig et tomt felt. */
function Linje({
  etiket,
  children,
  hjaelp,
}: {
  etiket: string;
  children: React.ReactNode;
  hjaelp?: string;
}) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-2 border-b border-border py-2 last:border-b-0">
      <span className="text-sm text-muted">{etiket}</span>
      <span className="text-right text-sm">
        {children}
        {hjaelp ? (
          <span className="mt-0.5 block text-xs text-muted">{hjaelp}</span>
        ) : null}
      </span>
    </div>
  );
}

/**
 * Alt om kundeforholdet ét sted: abonnementet, pengene og fristerne.
 *
 * HVAD DER MANGLEDE. Virksomhedssiden viste købt produkt og niveau, men INTET
 * om, at kunden betaler — eller er holdt op. `stripe_status`,
 * `suspenderet_siden`, `ophoert_den` og sletningsdatoen fandtes i basen og
 * blev læst af kundens egen betalingsskærm, mens vi selv kun kunne se dem i
 * Supabase. En kunde kunne stå seks måneder i suspension og få sine data
 * slettet, uden at det nogensinde stod på en skærm, vi kigger på.
 *
 * FRISTERNE ER DEN VIGTIGE DEL. De regnes med de SAMME funktioner, kunden får
 * sine tal af (`suspensionUdloeber`, `sletningSker`) — to udregninger af samme
 * dato ville før eller siden give to forskellige svar, og så ville vi love
 * kunden ét og selv planlægge efter noget andet.
 *
 * KØBSHISTORIKKEN STÅR HER OG IKKE UNDER ORDRER, fordi spørgsmålet "har hun
 * købt hos os før?" stilles, mens man har kunden i røret — ikke mens man
 * kigger på en ordreliste.
 */
export function AbonnementKort({
  company,
  betaling,
  historik,
  stripeUrl,
}: {
  company: AbonnentFelter & { stripe_customer_id: string | null };
  /** Fra Stripe. Undefined hvis nøglen mangler, eller Stripe ikke svarede. */
  betaling: Betaling | undefined;
  historik: {
    antalBetalte: number;
    samletBeloeb: number;
    foersteKoeb: string | null;
  };
  /** Kunden hos Stripe. Null hvis der aldrig er oprettet en. */
  stripeUrl: string | null;
}) {
  const tilstand = TILSTAND_ETIKET[abonnementTilstand(company)];
  const pris = maanedspris(company.product_slug);
  const udloeber = suspensionUdloeber(company);
  const sletning = sletningSker(company);
  const dageTilSletning = dageTil(sletning);

  /*
   * VORES STATUS MOD STRIPES. De to skal være ens; er de ikke, er en webhook
   * gået tabt, og alt på siden — inklusive kundens egen adgang — bygger på det
   * forkerte af de to tal. Det er værd at få at vide med det samme frem for at
   * opdage det, når en kunde ringer.
   */
  const uenige =
    betaling !== undefined && betaling.status !== company.stripe_status;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement &amp; betaling</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        <Linje etiket="Tilstand">
          <Badge tone={tilstand.tone}>{tilstand.label}</Badge>
        </Linje>

        <Linje etiket="Status hos Stripe" hjaelp={stripeStatusTekst(company.stripe_status)}>
          <code className="text-xs">{company.stripe_status ?? "ingen"}</code>
        </Linje>

        {uenige ? (
          <Linje
            etiket="Uenighed"
            hjaelp="Stripe siger noget andet end vores database. En webhook er sandsynligvis gået tabt — Stripes tal er det rigtige."
          >
            <Badge tone="danger">Stripe: {betaling.status}</Badge>
          </Linje>
        ) : null}

        <Linje
          etiket="Abonnement"
          hjaelp={pris === null ? undefined : `${formatCurrency(pris)}/md ex moms`}
        >
          {produktNavn(company.product_slug)}
        </Linje>

        <Linje
          etiket="Næste betaling"
          hjaelp={
            betaling?.stopperVedPeriodeslut
              ? "Opsagt — perioden køres ud, og så trækkes der ikke mere."
              : undefined
          }
        >
          {betaling?.naesteBetaling ? (
            <>
              {formatDate(betaling.naesteBetaling)}
              {betaling.beloebOere === null
                ? ""
                : ` · ${formatCurrency(betaling.beloebOere / 100, betaling.valuta)}`}
            </>
          ) : (
            <span className="text-muted">
              {/* Tre grunde til tomt, og de betyder ikke det samme. */}
              {company.stripe_subscription_id
                ? "Ukendt — Stripe svarede ikke"
                : "Intet abonnement hos Stripe"}
            </span>
          )}
        </Linje>

        <Linje
          etiket="Betalingskort"
          hjaelp={
            betaling && !betaling.kort
              ? "Kortet kan sidde på kunden i stedet for på abonnementet. Det betyder ikke, at der mangler et."
              : undefined
          }
        >
          {betaling?.kort ?? <span className="text-muted">Ikke oplyst</span>}
        </Linje>

        {/* Fristerne vises KUN, når de findes. En tom "Suspenderet siden"-linje
            på en rask kunde læser som om der er noget galt. */}
        {company.suspenderet_siden ? (
          <Linje
            etiket="Suspenderet siden"
            hjaelp={
              udloeber
                ? `Aftalen ophører ${formatDate(udloeber)}, hvis der ikke betales.`
                : undefined
            }
          >
            {formatDate(company.suspenderet_siden)}
          </Linje>
        ) : null}

        {company.ophoert_den ? (
          <Linje etiket="Aftalen ophørte">
            {formatDate(company.ophoert_den)}
          </Linje>
        ) : null}

        {sletning ? (
          <Linje
            etiket="Data slettes"
            hjaelp={
              dageTilSletning === null
                ? undefined
                : `Om ${dageTilSletning} dage. Kan ikke gøres om.`
            }
          >
            <Badge tone="danger">{formatDate(sletning)}</Badge>
          </Linje>
        ) : null}

        <Linje
          etiket="Har købt før"
          hjaelp={
            historik.foersteKoeb
              ? `Første køb ${formatDate(historik.foersteKoeb)}`
              : undefined
          }
        >
          {historik.antalBetalte === 0 ? (
            <span className="text-muted">Ingen betalte køb</span>
          ) : (
            <>
              {historik.antalBetalte}{" "}
              {historik.antalBetalte === 1 ? "køb" : "køb"} ·{" "}
              {formatCurrency(historik.samletBeloeb)}
            </>
          )}
        </Linje>

        <Linje etiket="Hos Stripe">
          {stripeUrl ? (
            <a
              href={stripeUrl}
              target="_blank"
              rel="noreferrer"
              className="text-accent hover:underline"
            >
              Åbn kunden
            </a>
          ) : (
            <span className="text-muted">Ingen Stripe-kunde</span>
          )}
        </Linje>
      </CardBody>
    </Card>
  );
}
