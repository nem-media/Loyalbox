import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Stat } from "@/components/ui/stat";
import { SearchIcon, BillingIcon } from "@/components/nav-icons";
import { formatCurrency, formatDate } from "@/lib/utils";
import { visCvr } from "@/lib/cvr";
import { abonnementTilstand, erBetalende } from "@/lib/abonnement";
import {
  ABONNEMENTS_SLUGS,
  TILSTAND_ETIKET,
  kraeverHandling,
  maanedligOmsaetning,
  maanedspris,
  produktNavn,
  sorterAbonnenter,
  stripeStatusTekst,
  type AbonnentFelter,
} from "@/lib/abonnenter";
import { hentBetalinger } from "@/lib/stripe-abonnement";

export const metadata = { title: "Admin — Abonnenter" };

/** Virksomhedsrækken, som denne side læser den. */
type Abonnent = AbonnentFelter & {
  id: string;
  name: string;
  cvr: string | null;
  contact_email: string | null;
  user_id: string | null;
  created_at: string;
};

/**
 * Hvem betaler, for hvad, og hvornår trækkes der næste gang?
 *
 * SIDEN FANDTES IKKE FØR. Admin havde Ordrer (hvad der skal pakkes) og
 * Virksomheder (hvem der findes), men intet sted at se, hvem der har et
 * LØBENDE kundeforhold. En suspenderet kunde på vej mod ophør — og dermed mod
 * at få alle sine data slettet om seks måneder — var usynlig, medmindre man
 * åbnede netop hendes side og vidste, hvad man ledte efter.
 *
 * RÆKKEFØLGEN ER SIDENS POINTE. Det, der kræver noget, står øverst; se
 * `sorterAbonnenter()`. Sorteret på navn ville listen være en rapport.
 *
 * BETALINGSDATOEN HENTES LIVE HOS STRIPE og findes ikke i vores database — se
 * `stripe-abonnement.ts` for hvorfor der ikke blev lagt en kolonne. Svarer
 * Stripe ikke, står der en tankestreg, og resten af siden virker.
 */
export default async function AdminAbonnenterPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const supabase = await createClient();

  let query = supabase
    .from("companies")
    .select("*")
    // Abonnenterne er dem, der har købt en vare MED månedspris. Spurgte vi på
    // `plan`, kom en kunde med, hvis niveau er sat i hånden i admin, uden at
    // der er solgt noget — samme grund som harAbonnement() i abonnement.ts.
    .in("product_slug", ABONNEMENTS_SLUGS);

  const term = (q ?? "").replace(/[,%]/g, "").trim();
  if (term) {
    query = query.or(
      `name.ilike.%${term}%,cvr.ilike.%${term}%,contact_email.ilike.%${term}%,billing_email.ilike.%${term}%,phone.ilike.%${term}%`,
    );
  }

  const { data } = await query;
  const raekker = sorterAbonnenter((data ?? []) as Abonnent[]);

  const betalinger = await hentBetalinger(
    raekker.map((r) => r.stripe_subscription_id),
  );

  /*
   * Tallene regnes af DE VISTE rækker. Er der søgt, er det søgningens tal, og
   * det er med vilje: "to af de fem, der matcher, betaler ikke" er et svar,
   * mens et globalt tal ved siden af en filtreret liste bare forvirrer.
   */
  const betalende = raekker.filter((r) => erBetalende(r.stripe_status)).length;

  return (
    <>
      <PageHeader
        title="Abonnenter"
        description="Hvem betaler løbende, for hvad, og hvornår der trækkes næste gang."
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Stat
          label="Betaler nu"
          value={betalende}
          sub={`ud af ${raekker.length} abonnementer`}
        />
        <Stat
          label="Kræver handling"
          value={raekker.filter(kraeverHandling).length}
          sub="Suspenderet, ophørt eller uden status"
        />
        <Stat
          label="Månedlig omsætning"
          value={formatCurrency(maanedligOmsaetning(raekker))}
          sub="Ex moms — kun dem, der faktisk betaler"
        />
      </div>

      <form className="mb-6 flex gap-2" action="/admin/abonnenter">
        <Input
          name="q"
          defaultValue={q ?? ""}
          placeholder="Søg på navn, CVR, e-mail eller telefon"
        />
        <Button type="submit" variant="outline">
          Søg
        </Button>
      </form>

      {raekker.length ? (
        <Card>
          <CardBody className="p-0">
            <Table>
              <THead>
                <TR className="hover:bg-transparent">
                  <TH>Virksomhed</TH>
                  <TH>Abonnement</TH>
                  <TH>Tilstand</TH>
                  <TH>Næste betaling</TH>
                  <TH>Kunde siden</TH>
                </TR>
              </THead>
              <TBody>
                {raekker.map((c) => {
                  const tilstand = TILSTAND_ETIKET[abonnementTilstand(c)];
                  const betaling = c.stripe_subscription_id
                    ? betalinger.get(c.stripe_subscription_id)
                    : undefined;
                  const pris = maanedspris(c.product_slug);

                  return (
                    <TR key={c.id}>
                      <TD>
                        <Link
                          href={`/admin/virksomheder/${c.id}`}
                          className="font-medium text-accent hover:underline"
                        >
                          {c.name}
                        </Link>
                        <span className="mt-0.5 block text-xs text-muted">
                          {c.cvr ? visCvr(c.cvr) : "Intet CVR"}
                          {c.contact_email ? ` · ${c.contact_email}` : ""}
                          {/* Uden login kan kunden ikke bare prøve at logge
                              ind — og det er ellers det første, man siger. */}
                          {c.user_id ? "" : " · uden konto"}
                        </span>
                      </TD>

                      <TD>
                        {produktNavn(c.product_slug)}
                        <span className="mt-0.5 block text-xs text-muted">
                          {pris === null
                            ? "Ingen månedspris"
                            : `${formatCurrency(pris)}/md`}
                        </span>
                      </TD>

                      <TD>
                        <Badge tone={tilstand.tone}>{tilstand.label}</Badge>
                        <span className="mt-1 block max-w-xs text-xs text-muted">
                          {stripeStatusTekst(c.stripe_status)}
                        </span>
                      </TD>

                      <TD className="whitespace-nowrap">
                        {betaling?.naesteBetaling ? (
                          <>
                            {formatDate(betaling.naesteBetaling)}
                            <span className="mt-0.5 block text-xs text-muted">
                              {betaling.beloebOere === null
                                ? "Beløb ukendt"
                                : formatCurrency(
                                    betaling.beloebOere / 100,
                                    betaling.valuta,
                                  )}
                              {betaling.stopperVedPeriodeslut
                                ? " · sidste træk"
                                : ""}
                            </span>
                          </>
                        ) : (
                          <span className="text-muted">—</span>
                        )}
                      </TD>

                      <TD className="whitespace-nowrap text-muted">
                        {formatDate(c.created_at)}
                      </TD>
                    </TR>
                  );
                })}
              </TBody>
            </Table>
          </CardBody>
        </Card>
      ) : term ? (
        <EmptyState
          icon={SearchIcon}
          title="Ingen abonnenter matchede søgningen"
          description="Prøv med et navn, et CVR-nummer, en e-mail eller et telefonnummer."
        />
      ) : (
        <EmptyState
          icon={BillingIcon}
          title="Ingen abonnenter endnu"
          description="En virksomhed står her, når den har købt Reviewstander Pro eller LoyalSum Komplet. Engangskøb af den enkle Reviewstander tæller ikke — den har ingen månedspris."
        />
      )}
    </>
  );
}
