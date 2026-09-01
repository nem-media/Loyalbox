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
  kortTekst,
  maanedspris,
  produktNavn,
  stripeStatusTekst,
  type AbonnentFelter,
} from "@/lib/abonnenter";
import type { Varsel } from "@/lib/abonnent-varsler";
import {
  HANDLING_TEKST,
  beskrivAendring,
  type AdminHandling,
  type AdminLogRaekke,
} from "@/lib/admin-log";
import type { Betaling } from "@/lib/stripe-abonnement";
import { AbonnementHandlinger } from "./abonnement-handlinger";

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
 * Alt om kundeforholdet ét sted: varslerne, abonnementet, pengene, fristerne,
 * de tre handlinger — og sporet af, hvad vi selv har ændret.
 *
 * HVAD DER MANGLEDE. Virksomhedssiden viste købt produkt og niveau, men INTET
 * om, at kunden betaler — eller er holdt op. `stripe_status`,
 * `suspenderet_siden` og `ophoert_den` fandtes i basen og blev læst af
 * KUNDENS egen betalingsskærm, mens vi selv skulle i Supabase. En kunde kunne
 * stå seks måneder i suspension og få slettet alle sine data, uden at det
 * nogensinde stod på en skærm, vi kigger på.
 *
 * VARSLERNE STÅR ØVERST. Resten af kortet er tilstand; varslerne er det, der
 * kræver noget, og de fleste af dem kan afværges, hvis de ses i tide.
 *
 * FRISTERNE regnes med de SAMME funktioner, kunden får sine tal af
 * (`suspensionUdloeber`, `sletningSker`) — to udregninger af samme dato ville
 * før eller siden give to svar, og så ville vi love kunden ét og planlægge
 * efter noget andet.
 */
export function AbonnementKort({
  company,
  betaling,
  historik,
  stripeUrl,
  varsler,
  log,
}: {
  company: AbonnentFelter & { id: string; stripe_customer_id: string | null };
  /** Fra Stripe. Undefined hvis nøglen mangler, eller Stripe ikke svarede. */
  betaling: Betaling | undefined;
  historik: {
    antalBetalte: number;
    samletBeloeb: number;
    foersteKoeb: string | null;
  };
  /** Kunden hos Stripe. Null hvis der aldrig er oprettet en. */
  stripeUrl: string | null;
  varsler: Varsel[];
  log: AdminLogRaekke[];
}) {
  const tilstand = TILSTAND_ETIKET[abonnementTilstand(company)];
  const pris = maanedspris(company.product_slug);
  const udloeber = suspensionUdloeber(company);
  const sletning = sletningSker(company);
  const dageTilSletning = dageTil(sletning);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Abonnement &amp; betaling</CardTitle>
      </CardHeader>
      <CardBody className="pt-0">
        {varsler.length ? (
          <ul className="mb-4 space-y-2">
            {varsler.map((v) => (
              <li
                key={v.type}
                className="box-shape border border-border bg-muted-bg p-3"
              >
                <Badge tone={v.tone}>{v.overskrift}</Badge>
                <p className="mt-1 text-xs">{v.detalje}</p>
              </li>
            ))}
          </ul>
        ) : null}

        <Linje etiket="Tilstand">
          <Badge tone={tilstand.tone}>{tilstand.label}</Badge>
        </Linje>

        <Linje
          etiket="Status hos Stripe"
          hjaelp={stripeStatusTekst(company.stripe_status)}
        >
          <code className="text-xs">{company.stripe_status ?? "ingen"}</code>
        </Linje>

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
              {/* De to tomme tilfælde betyder ikke det samme. */}
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
          {betaling?.kort ? (
            kortTekst(betaling.kort)
          ) : (
            <span className="text-muted">Ikke oplyst</span>
          )}
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
              {historik.antalBetalte} køb · {formatCurrency(historik.samletBeloeb)}
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

        <AbonnementHandlinger
          companyId={company.id}
          subscriptionId={company.stripe_subscription_id}
          stopperVedPeriodeslut={betaling?.stopperVedPeriodeslut}
          kanGenoptages={abonnementTilstand(company) !== "aktiv"}
        />

        {/*
          SPORET AF OS SELV. De manuelle ændringer afgør kundens adgang og var
          de eneste, der ikke efterlod noget. Loggen står HER og ikke på en
          side for sig, fordi spørgsmålet altid stilles om én kunde: hvorfor
          har hun den adgang, hun har?
        */}
        <div className="mt-4 border-t border-border pt-4">
          <p className="etiket">Ændret i admin</p>
          {log.length ? (
            <ul className="mt-2 space-y-2">
              {log.map((r) => {
                const aendring = beskrivAendring(r);
                return (
                  <li key={r.id} className="text-xs">
                    <span className="font-medium">
                      {HANDLING_TEKST[r.handling as AdminHandling] ?? r.handling}
                    </span>
                    <span className="block text-muted">
                      {formatDate(r.created_at)} · {r.actor_email}
                    </span>
                    {aendring ? (
                      <span className="block text-muted">{aendring}</span>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="mt-1 text-xs text-muted">
              Intet er ændret i hånden. Loggen begynder ved migration 0025 — det,
              der skete før den, står ingen steder.
            </p>
          )}
        </div>
      </CardBody>
    </Card>
  );
}
