import Link from "next/link";
import { getCurrentUser } from "@/lib/auth";
import { PageHeader } from "@/components/dashboard-shell";
import { PurchaseNotice } from "@/components/purchase-notice";
import {
  CAPABILITY_LABELS,
  CAPABILITY_ORDER,
  getProduct,
  PRODUCTS,
  TIER_LABELS,
  tierCan,
  type Tier,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import { PlanPicker } from "./plan-picker";
import { PortalButton } from "./portal-button";
import { DPA_VERSION, dpaIsCurrent } from "@/lib/dpa";
import { formatDate } from "@/lib/utils";

export const metadata = { title: "Abonnement" };

/**
 * Abonnementssiden viser hvad kunden HAR — ikke en prisliste.
 *
 * Tidligere solgte siden planer til 79 og 149 kr./md. De priser findes ikke:
 * abonnementet købes som en del af et produkt (Reviewstander Pro 99 kr./md,
 * LoyalSum Komplet 399 kr./md), og Basic/Premium/Pro er adgangsniveauer, der
 * følger med købet. En kunde der havde betalt 99 kr. så altså et dashboard,
 * der tilbød "Premium" til 79.
 *
 * Priserne herunder kommer fra PRODUCTS, så der kun er én sandhed.
 */
export default async function SubscriptionPage() {
  const user = await getCurrentUser();
  const company = user!.company;
  const plan = (company?.plan ?? "basic") as Tier;

  /** Abonnementsvarerne — dem der faktisk koster noget om måneden. */
  const subscriptions = PRODUCTS.filter((p) => p.monthlyPrice);

  /**
   * Har kunden allerede købt et produkt, har de også allerede en stander og et
   * abonnement. Så er den reelle pris for at gå op forskellen mellem de to
   * månedspriser — ikke fuld pris forfra. `product_slug` (migration 0008)
   * gør det muligt at regne det præcist frem for at gætte ud fra niveauet.
   */
  const nuvaerende = company?.product_slug
    ? getProduct(company.product_slug)
    : undefined;
  const betalerAllerede = nuvaerende?.monthlyPrice ?? 0;

  return (
    <>
      <PageHeader
        title="Abonnement"
        description="Se hvad din forretning har adgang til, og hvad der skal til for at få mere."
      />

      {/* ------------------------------------------------------ din adgang */}
      <div className="box-shape border border-accent/30 bg-accent/5 p-6">
        <p className="text-sm font-medium text-muted">Dit niveau</p>
        <p className="mt-1 text-2xl font-bold tracking-tight">
          {TIER_LABELS[plan]}
        </p>

        <ul className="mt-5 space-y-2 text-sm">
          {CAPABILITY_ORDER.map((cap) => {
            const has = tierCan(plan, cap);
            return (
              <li key={cap} className="flex items-start gap-2">
                <span
                  className={has ? "text-accent" : "text-muted"}
                  aria-hidden="true"
                >
                  {has ? "✓" : "—"}
                </span>
                <span className={has ? "" : "text-muted"}>
                  {CAPABILITY_LABELS[cap]}
                </span>
              </li>
            );
          })}
        </ul>

        {/* Databehandleraftalen indgås ved købet. Den skal kunne findes igen
            bagefter — ellers har kunden en aftale, de ikke kan læse. */}
        {company?.dpa_accepted_at ? (
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm font-medium">Databehandleraftale</p>
            <p className="mt-1 text-sm text-muted">
              Indgået {formatDate(company.dpa_accepted_at)}
              {company.dpa_version ? ` · version ${company.dpa_version}` : null}.
              {dpaIsCurrent(company.dpa_version) ? null : (
                <>
                  {" "}
                  Der findes en nyere udgave (version {DPA_VERSION}) — læs den,
                  og skriv til os, hvis du har spørgsmål.
                </>
              )}
            </p>
            <Link
              href="/databehandleraftale"
              className="mt-2 inline-block text-sm font-medium text-accent hover:underline"
            >
              Læs databehandleraftalen
            </Link>
          </div>
        ) : null}

        {company?.stripe_customer_id ? (
          <div className="mt-6 border-t border-border pt-5">
            <p className="text-sm font-medium">Betaling og bilag</p>
            <p className="mt-1 mb-3 text-sm text-muted">
              Skift betalingskort, ret fakturamailen til bogholderiet, hent
              kvitteringer eller opsig — det hele sker sikkert hos Stripe.
            </p>
            <PortalButton />
          </div>
        ) : null}

        {plan === "basic" ? (
          <p className="mt-5 text-sm text-muted">
            Din stander virker som den skal med det link, du har sat på den.
            Abonnementet giver dig dashboardet oveni.
          </p>
        ) : null}
      </div>

      {/* -------------------------------------------------- sådan får du mere */}
      {plan !== "pro" ? (
        <section className="mt-8">
          <h2 className="text-lg font-bold tracking-tight">
            Sådan får du mere
          </h2>
          <p className="mt-1 text-sm text-muted">
            Adgangen følger med det produkt, du køber — der er ikke et separat
            abonnement at vælge.
          </p>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            {subscriptions
              .filter((p) => p.slug !== nuvaerende?.slug)
              .map((p) => (
              <div
                key={p.slug}
                className="box-shape flex flex-col border border-border bg-card p-5"
              >
                <h3 className="font-bold tracking-tight">{p.name}</h3>
                <p className="mt-1 text-sm text-muted">{p.tagline}</p>
                <p className="mt-3 text-xl font-bold">
                  {formatCurrency(p.monthlyPrice!)}
                  <span className="text-sm font-normal text-muted">
                    /md ex moms
                  </span>
                </p>
                {betalerAllerede && p.monthlyPrice! > betalerAllerede ? (
                  <p className="mt-1 text-sm text-accent">
                    Du betaler {formatCurrency(betalerAllerede)}/md i dag, så
                    opgraderingen koster{" "}
                    <strong>
                      {formatCurrency(p.monthlyPrice! - betalerAllerede)}/md
                      mere
                    </strong>{" "}
                    — og du beholder din stander.
                  </p>
                ) : (
                  <p className="text-sm text-muted">
                    + {formatCurrency(p.price)} for standeren
                  </p>
                )}
                <Link
                  href={`/produkter/${p.slug}`}
                  className="mt-4 text-sm font-medium text-accent"
                >
                  Se {p.name} →
                </Link>
              </div>
              ))}
          </div>

          <PurchaseNotice className="mt-5" />
        </section>
      ) : null}

      {/* ------------------------------------------------ midlertidigt skift */}
      {/*
        Kun for virksomheder UDEN abonnement. Har de først betalt, sættes
        niveauet af Stripe-webhooken, og en selvbetjent skifter ville lade en
        betalende kunde klikke sig til Pro gratis — eller ryge ned på Basic
        uden at abonnementet fulgte med.
      */}
      {company?.stripe_subscription_id ? null : (
        <section className="mt-10 border-t border-border pt-8">
          <h2 className="text-lg font-bold tracking-tight">
            Skift niveau (midlertidigt)
          </h2>
          <p className="mt-1 max-w-2xl text-sm text-muted">
            Indtil betaling åbner, kan du sætte dit niveau selv, så du kan prøve
            funktionerne af. Når betalingen er på plads, følger niveauet
            automatisk dit abonnement.
          </p>
          <div className="mt-5">
            <PlanPicker currentPlan={plan} />
          </div>
        </section>
      )}
    </>
  );
}
