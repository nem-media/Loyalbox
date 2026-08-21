import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LegalSection, CompanyDetails, Udfyld } from "@/components/legal";
import {
  COMPANY,
  mangler,
  PRODUCTS,
  VOLUME_DISCOUNTS,
  MAX_QTY,
  SITE_NAME,
  TERMS_VERSION,
  TERMS_DATE,
  LEVERINGSLAND_NAVN,
} from "@/lib/constants";
import { formatCurrency } from "@/lib/utils";
import {
  SUSPENSION_MAANEDER,
  SLETNING_EFTER_OPHOER_DAGE,
  SLETNING_ANGREFRIST_DAGE,
  SKIFT_VARSEL_MAANEDER,
  SKIFT_OVERGANG_DAGE,
  SKIFT_HENTEPERIODE_DAGE,
} from "@/lib/abonnement";

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
 * FRISTERNE I AFSNIT 7 HENTES FRA src/lib/abonnement.ts og skrives ikke som
 * tal her. De samme tal står i databehandleraftalen og i privatlivspolitikken,
 * og tre steder med håndskrevne tal ville før eller siden blive til tre
 * forskellige løfter om det samme.
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
          Vilkårene gælder for alle køb på {SITE_NAME}. Du indgår aftalen på
          virksomhedens vegne.
        </p>
        <p className="mt-2 text-sm text-muted">
          Version {TERMS_VERSION} · gældende fra {TERMS_DATE}.
        </p>

        <LegalSection id="saelger" title="1. Sælger og hvem vi sælger til">
          <CompanyDetails />
          <p>
            <strong>Vi sælger kun til virksomheder.</strong> Derfor kræver vi et
            gyldigt CVR-nummer, både når du opretter din konto og før du kan
            købe. Priserne vises uden moms, og der er ikke fortrydelsesret — se
            afsnit 2 og 5. Er du privatperson, kan du ikke handle her.
          </p>
          <p>
            Aftalen indgås på dansk. Du bestiller ved at vælge produkt og antal,
            acceptere disse betingelser og gennemføre betalingen hos Stripe. Du
            kan rette antal og oplysninger hele vejen frem til betalingen
            gennemføres. Vi gemmer din accept med den version, du sagde ja til,
            og betingelserne kan altid læses her på siden.
          </p>
        </LegalSection>

        <LegalSection id="priser" title="2. Priser og moms">
          <p>
            Alle priser på sitet er angivet <strong>uden moms</strong>, fordi vi
            sælger til virksomheder. Dansk moms på 25 % lægges oveni ved
            betaling og fremgår af fakturaen sammen med dit CVR-nummer.
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
            derefter til den leveringsadresse, du oplyser ved betalingen.{" "}
            <strong>Vi leverer kun i {LEVERINGSLAND_NAVN}.</strong>{" "}
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
          <p>
            Risikoen for standeren overgår til dig, når den er overgivet til
            fragtføreren. Er den beskadiget ved modtagelsen, gælder afsnit 8 —
            skriv til os, så finder vi en løsning.
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
            Derefter lukkes dashboardets indsigt og redigering: statistik,
            feedback-indbakken og muligheden for at ændre logo og links.{" "}
            <strong>Alt det, dine kunder mærker, kører videre</strong> —
            standeren sender som altid, stempelkortene virker, og personalet kan
            stadig give og indløse stempler.
          </p>
          <p>
            Der slettes ikke noget med det samme. Hvad der sker med dine data,
            og hvornår, står i afsnit 7.
          </p>
        </LegalSection>

        <LegalSection
          id="manglende-betaling"
          title="7. Manglende betaling — og hvad der sker med dine data"
        >
          <p>
            Kan betalingen ikke gennemføres, forsøger Stripe igen og sender dig
            besked. Lykkes det ikke, falder din adgang til det gratis niveau,
            som beskrevet i afsnit 6.
          </p>
          <p>
            <strong>
              Manglende betaling er ikke det samme som at forlade os, og der
              slettes ingenting.
            </strong>{" "}
            Dit kundeforhold består i {SUSPENSION_MAANEDER} måneder. Dine
            kunders stempelkort, deres stempler, dine belønninger, din feedback
            og dine standere er urørte hele perioden, og alt kommer tilbage i
            samme øjeblik betalingen er på plads. Vi gør det, fordi dine kunder
            ikke har gjort noget forkert — de skal ikke miste stempler, de har
            gjort sig fortjent til, fordi et betalingskort er udløbet.
          </p>
          <p>
            Har du bedt om at skifte til en anden leverandør, udskydes
            sletningen, indtil du har haft den tid til at hente dine data, som
            afsnit 12 giver dig. Loven kræver det, og vi må ikke slette
            imens.
          </p>
          <p>
            Går der {SUSPENSION_MAANEDER} måneder uden betaling, ophører aftalen.
            Vi sletter derefter alle personoplysninger inden for{" "}
            {SLETNING_EFTER_OPHOER_DAGE} dage, som vores{" "}
            <Link href="/databehandleraftale" className="font-medium text-accent">
              databehandleraftale
            </Link>{" "}
            kræver. Standerne holder op med at virke, når det sker.
          </p>
          <p>
            Vil du af med dine data før det, bestemmer du selv: under Abonnement
            i dashboardet kan du bestille sletning af alt. Vi sender en
            bekræftelse til virksomhedens mailadresse, og derefter går der{" "}
            {SLETNING_ANGREFRIST_DAGE} dage, hvor du kan fortryde. Du er
            velkommen til at skrive til{" "}
            <a href={`mailto:${COMPANY.email}`} className="font-medium text-accent">
              {COMPANY.email}
            </a>{" "}
            i stedet — så bekræfter vi først, hvem der spørger, og klarer det
            for dig.
          </p>
          <p>
            Uanset hvad gemmer vi fakturaerne. Det er ikke et valg fra vores
            side: bogføringsloven kræver regnskabsmateriale gemt i fem år efter
            regnskabsårets udløb. De indeholder virksomhedens navn og adresse og
            intet om dine kunder.
          </p>
        </LegalSection>

        <LegalSection id="reklamation" title="8. Reklamation og mangler">
          <p>
            Undersøg standeren, når du modtager den. Er den defekt eller
            beskadiget, så skriv til os hurtigst muligt med et billede — og
            under alle omstændigheder uden ugrundet ophold efter, at du har
            opdaget det. Reklamerer du senere, mister du retten til at gøre
            manglen gældende. Der kan ikke reklameres mere end to år efter
            leveringen.
          </p>
          <p>
            Vi afhjælper en mangel ved at reparere eller sende en ny stander.
            Lykkes det ikke inden for rimelig tid, kan du hæve købet af den
            pågældende stander og få pengene tilbage. Da du køber som
            virksomhed, gælder købelovens regler om handelskøb — ikke
            forbrugerkøbsreglerne.
          </p>
          <p>
            Virker noget ikke i selve tjenesten, hører vi også gerne fra dig.
            Det håndteres efter afsnit 11.
          </p>
        </LegalSection>

        <LegalSection id="brug" title="9. Sådan må du bruge LoyalSum">
          <p>
            Du bestemmer selv, hvad du bruger tjenesten til, så længe det er
            lovligt og loyalt over for dine egne kunder. Konkret må du ikke:
          </p>
          <ul className="space-y-1">
            <li>
              gøre en belønning, et stempel eller en rabat betinget af, at
              kunden skriver, ændrer eller sletter en offentlig anmeldelse
            </li>
            <li>
              bede om anmeldelser selektivt — altså kun spørge dem, du regner
              med er tilfredse
            </li>
            <li>
              indsamle oplysninger om dine kunder til noget, du ikke har fortalt
              dem, eller uden et lovligt grundlag
            </li>
            <li>bruge tjenesten til at genere, spamme eller vildlede nogen</li>
          </ul>
          <p>
            De to første er ikke husregler: markedsføringsloven forbyder at give
            urigtige oplysninger om forbrugeranmeldelser for at fremme et
            produkt, og anmeldelsesplatformene kan fjerne dine anmeldelser, hvis
            det sker. Derfor er vores eget flow bygget, så alle kunder får det
            samme tilbud uanset hvor mange stjerner de giver.
          </p>
          <p>
            Du er dataansvarlig for dine egne kunders oplysninger. Det betyder,
            at du selv skal have et lovligt grundlag for at indsamle dem og selv
            skal oplyse dine kunder om det. Vores rolle og dine forpligtelser
            står i{" "}
            <Link href="/databehandleraftale" className="font-medium text-accent">
              databehandleraftalen
            </Link>
            .
          </p>
          <p>
            Bruges tjenesten i strid med dette, kan vi lukke adgangen. Er der
            tale om noget, der kan rettes, siger vi altid til først og giver dig
            rimelig tid til det.
          </p>
        </LegalSection>

        <LegalSection id="rettigheder" title="10. Logo og rettigheder">
          <p>
            Du giver os ret til at bruge dit logo og dit virksomhedsnavn i det
            omfang, det er nødvendigt for at levere det, du har købt: at trykke
            det på standeren og vise det på dine kunders sider. Ikke andet — vi
            bruger det ikke i vores egen markedsføring uden at spørge dig først.
          </p>
          <p>
            Du indestår for, at du har ret til det materiale, du lægger op. Får
            vi et krav fra en tredjepart, fordi et logo eller andet materiale,
            du har lagt op, krænker deres rettigheder, holder du os skadesløse.
          </p>
          <p>
            Alle rettigheder til LoyalSum — softwaren, designet og indholdet —
            forbliver hos os. Du får en brugsret, så længe abonnementet løber,
            ikke ejendomsret. Dine egne data og dine kunders oplysninger er
            derimod dine; se afsnit 12 om, hvordan du får dem med dig.
          </p>
        </LegalSection>

        <LegalSection id="drift" title="11. Drift, support og vedligehold">
          <p>
            Vi gør vores bedste for at holde tjenesten kørende, men vi garanterer
            ikke en bestemt oppetid. Tjenesten leveres, som den er og
            forefindes.
          </p>
          <p>
            Planlagt vedligehold varsler vi på forhånd, når det kan påvirke dig,
            og lægger det uden for almindelig åbningstid, hvor vi kan. Akutte
            indgreb kan ske uden varsel.
          </p>
          <p>
            Support fås på{" "}
            <a href={`mailto:${COMPANY.email}`} className="font-medium text-accent">
              {COMPANY.email}
            </a>
            . Vi svarer normalt inden for én hverdag.
          </p>
        </LegalSection>

        <LegalSection id="skift" title="12. Skift til en anden leverandør">
          <p>
            Du har ret til at skifte til en anden leverandør eller flytte alt
            over på dit eget it-udstyr. Beder du om det, forløber det sådan:
          </p>
          <ul className="space-y-1">
            <li>
              <strong>Opsigelsesvarsel:</strong> højst {SKIFT_VARSEL_MAANEDER}{" "}
              måned. Du sætter skiftet i gang ved at skrive til os.
            </li>
            <li>
              <strong>Overgangsperiode:</strong> {SKIFT_OVERGANG_DAGE}{" "}
              kalenderdage efter varslet udløber. Er det teknisk umuligt at nå,
              siger vi det med en begrundelse og forlænger — aldrig mere end syv
              måneder i alt.
            </li>
            <li>
              <strong>Tid til at hente dine data:</strong> mindst{" "}
              {SKIFT_HENTEPERIODE_DAGE} kalenderdage efter overgangsperioden
              slutter. Har du brug for længere, aftaler vi det.
            </li>
            <li>
              <strong>Pris:</strong> ingen. Vi opkræver ikke gebyr for at
              skifte, og vi tager ikke betaling for at udlevere dine data.
            </li>
          </ul>
          <p>
            Når varslet er udløbet, vælger du selv: skifte til en anden
            leverandør, flytte alt til dit eget udstyr, eller få det hele
            slettet.
          </p>
          <p>
            <strong>Alt dette kan udføres</strong>, i et almindeligt
            maskinlæsbart format:
          </p>
          <ul className="space-y-1">
            <li>Din virksomhedsprofil: navn, CVR, kontaktoplysninger og logo</li>
            <li>
              Dine standere med deres links, QR-adresser og indstillinger
            </li>
            <li>
              Dine stempelkort: programmer, belønninger, rabatter, medlemmer,
              optjente og indløste stempler samt hele posteringshistorikken
            </li>
            <li>
              Al feedback: bedømmelser, kommentarer og de kontaktoplysninger,
              kunderne selv har skrevet
            </li>
            <li>Din statistik over scanninger</li>
            <li>Dine medarbejdere og deres rettigheder</li>
            <li>Dine ordrer og fakturaer</li>
          </ul>
          <p>
            Det er alt, hvad vi har om dig og dine kunder. Undtaget er alene
            vores egen software og opsætning, som ikke er dine data.
          </p>
          <p>
            Bemærk at fristen i afsnit 7 udskydes, mens et skifte er i gang: vi
            sletter først, når du har haft den tid til at hente dine data, som
            står ovenfor.
          </p>
        </LegalSection>

        <LegalSection id="ansvar" title="13. Ansvar">
          <p>
            Vi er ansvarlige efter dansk rets almindelige regler, men med disse
            begrænsninger:
          </p>
          <ul className="space-y-1">
            <li>
              Vi er ikke ansvarlige for indirekte tab, herunder driftstab,
              mistet omsætning, tabt goodwill eller tab af data.
            </li>
            <li>
              Vores samlede ansvar over for dig kan ikke overstige det højeste
              af (a) det beløb, du har betalt os i de seneste 12 måneder, og
              (b) 12 måneders abonnement til den pris, du betaler i dag.
            </li>
          </ul>
          <p>
            Punkt (b) sikrer, at loftet ikke bliver urimeligt lavt, blot fordi
            du er ny kunde. Havde vi kun regnet på det betalte, ville en butik,
            der købte for to måneder siden, stå med et loft på et par hundrede
            kroner.
          </p>
          <p>
            Begrænsningerne gælder ikke ved forsæt eller grov uagtsomhed. De
            begrænser heller ikke dit eller dine kunders krav efter
            databeskyttelsesforordningens artikel 82 — det kan de ikke, og de
            skal ikke se ud til at kunne.
          </p>
          <p>
            Du er selv ansvarlig for det indhold, du lægger op, for hvordan du
            bruger tjenesten over for dine egne kunder, og for at overholde
            afsnit 9.
          </p>
        </LegalSection>

        <LegalSection id="force-majeure" title="14. Force majeure">
          <p>
            Ingen af os er ansvarlig for manglende opfyldelse, der skyldes
            forhold uden for vores rimelige kontrol — herunder nedbrud hos vores
            underleverandører, svigt i internetforbindelser, strømafbrydelser,
            cyberangreb, brand, krig, myndighedsindgreb eller naturkatastrofer.
          </p>
          <p>
            Varer forholdet mere end 30 dage, kan hver af os opsige aftalen uden
            varsel. Har du betalt for en periode, du ikke har kunnet bruge,
            refunderer vi den forholdsmæssigt.
          </p>
        </LegalSection>

        <LegalSection id="aendringer" title="15. Ændringer, overdragelse">
          <p>
            Vi kan ændre priser og vilkår. Ændringer varsles på mail senest 30
            dage før, de træder i kraft for dit abonnement, og du kan altid
            opsige inden da. Det samme gælder, hvis databehandleraftalen ændres
            materielt.
          </p>
          <p>
            Vi kan overdrage aftalen til en anden virksomhed, fx hvis LoyalSum
            sælges. Du får besked, og dine vilkår ændrer sig ikke af den grund.
            Du kan overdrage din aftale med vores accept, som ikke nægtes uden
            saglig grund.
          </p>
        </LegalSection>

        <LegalSection id="tvister" title="16. Lovvalg og tvister">
          <p>
            Aftalen er underlagt dansk ret. Kan en uenighed ikke løses i
            mindelighed, afgøres den ved de danske domstole med Retten i
            Glostrup som første instans.
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
