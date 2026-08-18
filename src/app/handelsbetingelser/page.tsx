import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LegalSection, CompanyDetails, Udfyld } from "@/components/legal";
import { COMPANY, mangler, PRODUCTS, VOLUME_DISCOUNTS, MAX_QTY, SITE_NAME } from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";

/**
 * Handelsbetingelser.
 *
 * REGEL FOR DENNE SIDE, samme som for landingssiderne: her må kun stå det,
 * produktet faktisk gør. Hvert vilkår herunder svarer til noget i koden —
 * trækdatoen den 20. (nextBillingAnchor i src/lib/stripe.ts), mængderabatten
 * (VOLUME_DISCOUNTS), at adgangen falder til Basic ved manglende betaling
 * (webhooken i src/app/api/stripe/webhook/route.ts), og at standeren virker
 * videre med sit eget link. Ændres et af de steder, skal teksten følge med.
 *
 * JURIDISK GENNEMSYN: teksten er skrevet ud fra produktets faktiske
 * funktion, ikke af en advokat. Få den læst igennem, før den sendes til
 * Stripe eller bruges i en tvist.
 */

const title = "Handelsbetingelser";
const description =
  "Vilkår for køb af reviewstandere og abonnement hos LoyalSum — betaling, levering, opsigelse og reklamation.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/handelsbetingelser" },
};

export default function TermsPage() {
  const abonnementer = PRODUCTS.filter((p) => p.monthlyPrice);
  // 0-trinnet er "ingen rabat" og hører ikke til i en opremsning af rabatter.
  const rabatter = VOLUME_DISCOUNTS.filter((d) => d.discountPct > 0)
    .map((d) => `${d.minQty}+ stk. − ${d.discountPct} %`)
    .join(" · ");

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          Vilkårene gælder for alle køb på {SITE_NAME}. Køber du som
          virksomhed, indgår du aftalen på virksomhedens vegne.
        </p>

        <LegalSection id="saelger" title="1. Sælger">
          <CompanyDetails />
        </LegalSection>

        <LegalSection id="priser" title="2. Priser og moms">
          <p>
            Alle priser på sitet er angivet <strong>uden moms</strong>. Dansk
            moms på 25 % lægges oveni ved betaling og fremgår af fakturaen.
          </p>
          <p>
            Standeren betales som et engangsbeløb. Abonnementet er en fast
            månedlig pris, uanset hvor mange standere du har:
          </p>
          <ul className="space-y-1">
            {abonnementer.map((p) => (
              <li key={p.slug}>
                <strong>{p.name}</strong> — {formatCurrency(p.price)} pr.
                stander + {formatCurrency(p.monthlyPrice!)} pr. måned
              </li>
            ))}
          </ul>
          <p>
            Køber du flere standere, falder prisen pr. stander: {rabatter}.
            Rabatten beregnes automatisk. Der kan bestilles op til {MAX_QTY}{" "}
            standere ad gangen — skal du bruge flere, så skriv til os.
          </p>
        </LegalSection>

        <LegalSection id="betaling" title="3. Betaling">
          <p>
            Betaling sker med betalingskort gennem Stripe. Vi ser og gemmer
            aldrig dine kortoplysninger — de håndteres udelukkende af Stripe.
          </p>
          <p>
            Standerne betales ved bestilling. Abonnementet trækkes den{" "}
            <strong>20. i måneden</strong> for den kommende måned. Køber du midt
            i en måned, betaler du kun for dagene frem til den 20., og derefter
            fast den 20.
          </p>
          <p>
            Kvittering og faktura med moms sendes på mail og kan altid hentes
            under Betaling og kvitteringer i dit dashboard.
          </p>
        </LegalSection>

        <LegalSection id="levering" title="4. Levering">
          <p>
            Standeren fremstilles til dig med dit logo og dine links og sendes
            derefter til den adresse, du oplyser.{" "}
            {mangler(COMPANY.deliveryDays) ? (
              <>
                Forventet leveringstid: <Udfyld hvad="leveringstid" />
              </>
            ) : (
              <>Forventet leveringstid er {COMPANY.deliveryDays}.</>
            )}
          </p>
          <p>
            Din adgang til dashboardet åbnes, så snart betalingen er
            gennemført — du kan altså gå i gang med at sætte op, mens standeren
            er undervejs.
          </p>
        </LegalSection>

        <LegalSection id="fortrydelse" title="5. Fortrydelsesret">
          <p>
            Ved salg til virksomheder er der{" "}
            <strong>ikke lovbestemt fortrydelsesret</strong>. Standeren
            fremstilles desuden efter dine specifikationer — dit logo og dine
            links — og er derfor en vare, der er tilpasset dig.
          </p>
          <p>
            Er der noget galt med din bestilling, så kontakt os på{" "}
            <a href={`mailto:${COMPANY.email}`} className="font-medium text-accent">
              {COMPANY.email}
            </a>
            . Vi finder en løsning.
          </p>
        </LegalSection>

        <LegalSection id="opsigelse" title="6. Opsigelse af abonnement">
          <p>
            Du kan opsige når som helst under Betaling og kvitteringer i
            dashboardet. Der er ingen bindingsperiode.
          </p>
          <p>
            Opsigelsen træder i kraft ved udgangen af den periode, du allerede
            har betalt for — du beholder altså adgangen perioden ud. Vi
            refunderer ikke en påbegyndt periode.
          </p>
          <p>
            Når abonnementet ophører, lukkes dashboard, statistik og
            stempelkort. <strong>Standeren virker videre</strong> — den sender
            fortsat dine kunder hen til det link, den peger på.
          </p>
        </LegalSection>

        <LegalSection id="manglende-betaling" title="7. Manglende betaling">
          <p>
            Kan betalingen ikke gennemføres, forsøger Stripe igen og sender dig
            besked. Lykkes det ikke, falder din adgang til det gratis niveau,
            indtil betalingen er på plads. Dine data slettes ikke af den grund.
          </p>
        </LegalSection>

        <LegalSection id="reklamation" title="8. Reklamation">
          <p>
            Er standeren defekt eller beskadiget ved modtagelsen, så skriv til
            os hurtigst muligt med et billede, så sender vi en ny. Der gælder de
            almindelige regler i købeloven.
          </p>
        </LegalSection>

        <LegalSection id="aendringer" title="9. Ændringer af priser og vilkår">
          <p>
            Vi kan ændre priser og vilkår. Ændringer varsles på mail senest 30
            dage før, de træder i kraft for dit abonnement, og du kan altid
            opsige inden da.
          </p>
        </LegalSection>

        <LegalSection id="tvister" title="10. Lovvalg og tvister">
          <p>
            Aftalen er underlagt dansk ret. Kan en uenighed ikke løses i
            mindelighed, afgøres den ved de danske domstole.
          </p>
        </LegalSection>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted">
          Se også vores{" "}
          <Link href="/privatliv" className="font-medium text-accent">
            privatlivspolitik
          </Link>
          .
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
