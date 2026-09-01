import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { FeedbackList } from "@/components/feedback-list";
import { CompanyInfo } from "./company-info";
import { AdminStandLinks } from "./admin-stand-links";
import { AddStand } from "./add-stand";
import { ProductSelect } from "./product-select";
import { TIER_LABELS } from "@/lib/constants";
import { Leveringsadresse } from "@/components/leveringsadresse";
import { formatDate } from "@/lib/utils";
import { BETALTE_ORDRE_STATUSSER, stripeMode } from "@/lib/commerce";
import { hentBetalinger } from "@/lib/stripe-abonnement";
import { AbonnementKort } from "./abonnement-kort";

export const metadata = { title: "Admin — Virksomhed" };

export default async function AdminCompanyDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: company } = await supabase
    .from("companies")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (!company) notFound();

  const [
    { data: stands },
    { data: feedback },
    { count: scans },
    { data: ordrer },
    { data: betalteOrdrer },
  ] = await Promise.all([
      supabase
        .from("stands")
        .select("*")
        .eq("company_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("feedback")
        .select("*")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("scans")
        .select("*", { count: "exact", head: true })
        .eq("company_id", id),
      /*
       * ORDRERNE HØRER HJEMME HER. Siden viste standere, feedback og
       * scanninger, men ikke en eneste ordre — og dermed heller ikke
       * LEVERINGSADRESSEN, som er dét, man skal bruge for at sende noget.
       * Den lå kun på den enkelte ordre, og der var ingen vej dertil fra
       * virksomheden.
       */
      supabase
        .from("orders")
        .select("id, product_name, quantity, status, created_at, leveringsadresse")
        .eq("company_id", id)
        .order("created_at", { ascending: false })
        .limit(5),
      /*
       * ALLE betalte ordrer, ikke de fem nyeste. Spørgsmålet "har hun handlet
       * hos os før, og for hvor meget" kan ikke besvares af et udsnit — og et
       * udsnit ville svare FORKERT med fuld selvtillid frem for at sige, at
       * det ikke ved det.
       */
      supabase
        .from("orders")
        .select("total_amount, created_at")
        .eq("company_id", id)
        .in("status", [...BETALTE_ORDRE_STATUSSER])
        .order("created_at", { ascending: true }),
    ]);

  const betalte = betalteOrdrer ?? [];
  const historik = {
    antalBetalte: betalte.length,
    // Beløbene er numeric i basen og kommer hjem som streng i nogle drivere.
    // Number() på hver række frem for en sum i SQL: der er få ordrer, og en
    // aggregering ville skulle vedligeholdes to steder.
    samletBeloeb: betalte.reduce((sum, o) => sum + Number(o.total_amount ?? 0), 0),
    foersteKoeb: betalte[0]?.created_at ?? null,
  };

  /*
   * Betalingsdatoen findes ikke i basen — se `stripe-abonnement.ts`. Ét opslag
   * for én virksomhed; svarer Stripe ikke, er kortet tomt, og siden virker.
   */
  const betalinger = await hentBetalinger([company.stripe_subscription_id]);
  const betaling = company.stripe_subscription_id
    ? betalinger.get(company.stripe_subscription_id)
    : undefined;

  /*
   * Test og live er adskilte verdener hos Stripe, og de har hver sin adresse i
   * dashboardet. Et link uden `test/` ville i udvikling føre til en kunde, der
   * ikke findes — og det ligner, at kunden er væk.
   */
  const stripeUrl = company.stripe_customer_id
    ? `https://dashboard.stripe.com/${
        stripeMode() === "test" ? "test/" : ""
      }customers/${company.stripe_customer_id}`
    : null;

  /*
   * Adressen tages fra den NYESTE ordre, der har en. En ubetalt ordre har
   * ingen — Stripe indsamler den først i betalingsvinduet — og den skal ikke
   * skygge for adressen på det køb, der faktisk blev gennemført.
   */
  const senesteAdresse = (ordrer ?? []).find((o) => o.leveringsadresse) ?? null;

  return (
    <>
      <div className="mb-4">
        <Link href="/admin/virksomheder" className="text-sm text-accent">
          ← Alle virksomheder
        </Link>
      </div>
      <PageHeader
        title={company.name}
        description={`${scans ?? 0} scanninger · ${stands?.length ?? 0} standere`}
      />

{/*
        ÉN VÆLGER, IKKE TO. Planen kan ikke sættes i hånden mere — den FØLGER
        varen via `planForProduct()`, den samme funktion webhooken bruger.

        De to felter stod før side om side og kunne komme i utakt: Frisør
        Nielsine blev solgt LoyalSum Komplet manuelt og endte på `premium`,
        fordi planvælgeren tilbød niveauet lige ved siden af. Resultatet var
        en betalende kunde uden feedback-indbakke, statistik og dynamiske
        links. Intet gik i stykker, så det blev ikke opdaget.

        Vælgeren var desuden misvisende: planen er altid den bestilte, og det
        eneste, der reelt skal kunne skiftes, er MELLEM de to abonnementsvarer
        — begge veje. Det gør produktvælgeren.
      */}
      <Card className="mb-6">
        <CardBody>
          <CardTitle>Købt produkt</CardTitle>
          <p className="mt-1 mb-3 max-w-2xl text-sm text-muted">
            Afgør hvad kunden har adgang til — både review-funktionerne og om{" "}
            <strong>stempelkortet</strong> er låst op. Skift mellem
            Reviewstander Pro og LoyalSum Komplet begge veje; niveauet følger
            med af sig selv og slår igennem med det samme i kundens panel.
          </p>
          <div className="max-w-md">
            <ProductSelect
              companyId={company.id}
              productSlug={company.product_slug ?? null}
            />
          </div>
          <p className="mt-2 text-xs text-muted">
            Niveau lige nu:{" "}
            <strong>{TIER_LABELS[company.plan] ?? company.plan}</strong>
          </p>
        </CardBody>
      </Card>

      {/* PENGENE FØRST. Kundeforholdet er det, man kommer for at afklare, når
          man åbner en virksomhed i admin — og fristerne i kortet er dem, der
          har en deadline. */}
      <div className="grid gap-6 lg:grid-cols-2">
        <AbonnementKort
          company={company}
          betaling={betaling}
          historik={historik}
          stripeUrl={stripeUrl}
        />

        <Card>
          <CardHeader>
            <CardTitle>Virksomhedsinfo</CardTitle>
          </CardHeader>
          <CardBody className="space-y-4">
            <CompanyInfo company={company} />

            <div className="border-t border-border pt-4">
              <p className="etiket">Leveringsadresse</p>
              {senesteAdresse ? (
                <>
                  <Leveringsadresse
                    navn={company.name}
                    adresse={
                      senesteAdresse.leveringsadresse as Record<
                        string,
                        string | null
                      >
                    }
                  />
                  <p className="mt-1 text-xs text-muted">
                    Fra betalingen{" "}
                    {formatDate(senesteAdresse.created_at)} —{" "}
                    <Link
                      href={`/admin/ordrer/${senesteAdresse.id}`}
                      className="text-accent"
                    >
                      se ordren
                    </Link>
                  </p>
                </>
              ) : (
                <p className="mt-1 text-sm text-muted">
                  Ingen endnu. Adressen kommer fra Stripe, når en ordre er
                  betalt — vi spørger ikke om den i bestillingen.
                </p>
              )}
            </div>
          </CardBody>
        </Card>

      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Seneste feedback</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          <FeedbackList items={feedback ?? []} />
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Seneste ordrer</CardTitle>
        </CardHeader>
        <CardBody className="pt-0">
          {ordrer && ordrer.length ? (
            <ul className="divide-y divide-border text-sm">
              {ordrer.map((o) => (
                <li
                  key={o.id}
                  className="flex flex-wrap items-center justify-between gap-2 py-2"
                >
                  <Link
                    href={`/admin/ordrer/${o.id}`}
                    className="font-medium text-accent"
                  >
                    {o.product_name} × {o.quantity}
                  </Link>
                  <span className="text-muted">
                    {formatDate(o.created_at)}
                    {o.status === "new" ? " · ikke betalt" : ""}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">Ingen ordrer endnu.</p>
          )}
        </CardBody>
      </Card>

      <Card className="mt-6">
        <CardHeader className="flex items-center justify-between">
          <CardTitle>Standere & links</CardTitle>
        </CardHeader>
        <CardBody className="space-y-4">
          <AddStand companyId={company.id} />
          {stands && stands.length ? (
            stands.map((s) => <AdminStandLinks key={s.id} stand={s} />)
          ) : (
            <p className="text-sm text-muted">Ingen standere endnu.</p>
          )}
        </CardBody>
      </Card>
    </>
  );
}
