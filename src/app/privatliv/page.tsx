import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LegalSection, CompanyDetails } from "@/components/legal";
import { COMPANY, SITE_NAME } from "@/lib/constants";
import { FRISTER, OPRYDNING_KADENCE } from "@/lib/opbevaring";
import {
  SUSPENSION_MAANEDER,
  SLETNING_ANGREFRIST_DAGE,
} from "@/lib/abonnement";

/**
 * Version og dato på politikken.
 *
 * Uden dem kan ingen — heller ikke vi selv — se hvilken udgave en besøgende
 * læste. Hæves versionen, skal datoen følge med; det er den eneste måde at
 * kunne svare på "hvad stod der dengang".
 */
// 1.2 (27. august 2026): nyt afsnit 4 om ventelisten til åbningen — vi
// indsamler navn, mail og evt. telefon, og det skal fremgå, også selv om
// oplysningerne kun ligger i mailboksen og ikke i systemet.
const POLITIK_VERSION = "1.2";
const POLITIK_DATO = "27. august 2026";

/**
 * Google Ads er ikke i drift, før id'et er sat. Afsnittet om marketing skal
 * derfor kun stå, når kategorien FAKTISK kan vælges i dialogen — ellers
 * beskriver politikken en cookie, ingen kan sige ja eller nej til.
 */
const ADS_ID = process.env.NEXT_PUBLIC_GOOGLE_ADS_ID;

/**
 * Privatlivspolitik.
 *
 * DEN VIGTIGE SONDRING: LoyalSum har to forskellige roller, og de må ikke
 * blandes sammen.
 *
 *  - For BUTIKSEJERENS egne data (konto, virksomhed, betaling) er vi
 *    dataansvarlige.
 *  - For BUTIKKENS SLUTKUNDER (stempelkort, feedback) er butikken
 *    dataansvarlig, og vi er databehandler. Det er butikken, der bestemmer,
 *    hvad der indsamles, og som slutkunden skal henvende sig til.
 *
 * Underdatabehandlerne herunder svarer til det, koden faktisk bruger:
 * Supabase (database + login), Vercel (hosting) og Stripe (betaling). Tages en
 * ny tjeneste i brug, skal den tilføjes her.
 *
 * COOKIES: besøgsstatistik uden cookies (Vercel Analytics) kører altid og
 * kræver ikke samtykke. Google Analytics indlæses FØRST efter et aktivt ja —
 * se src/lib/consent.ts. Ændres det, skal afsnittet herunder følge med, ellers
 * lover politikken noget andet end det, der sker.
 *
 * JURIDISK GENNEMSYN: skrevet ud fra hvordan systemet faktisk virker, ikke af
 * en advokat. Bemærk især, at en databehandleraftale med hver butik er et
 * selvstændigt krav, som denne side ikke erstatter.
 */

const title = "Privatlivspolitik";
const description =
  "Hvordan LoyalSum behandler personoplysninger — for butikker og for deres kunder.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/privatliv" },
};

export default function PrivacyPage() {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          {SITE_NAME} behandler personoplysninger i to forskellige roller. Det
          afgør, hvem du skal henvende dig til, og hvad vi må gøre.
        </p>
        <p className="mt-2 text-sm text-muted">
          Version {POLITIK_VERSION} · gældende fra {POLITIK_DATO}.
        </p>

        <LegalSection id="ansvarlig" title="1. Dataansvarlig">
          <CompanyDetails />
        </LegalSection>

        <LegalSection id="roller" title="2. To roller — og forskellen på dem">
          <p>
            <strong>Er du butiksejer</strong> og har en konto hos os, er vi
            dataansvarlige for dine oplysninger: navn, e-mail,
            virksomhedsoplysninger og betalingshistorik.
          </p>
          <p>
            <strong>Er du kunde i en butik</strong>, der bruger LoyalSum — har
            du fx et digitalt stempelkort — er det{" "}
            <strong>butikken, der er dataansvarlig</strong> for dine
            oplysninger. Vi opbevarer og behandler dem alene på butikkens vegne
            som databehandler. Vil du have indsigt i eller slettet dine data,
            skal du derfor kontakte butikken. Skriver du til os, videresender vi
            din henvendelse.
          </p>
        </LegalSection>

        <LegalSection id="butiksejer" title="3. Oplysninger om butiksejere">
          <p>Vi behandler:</p>
          <ul className="space-y-1">
            <li>Navn og e-mail, så du kan logge ind og få beskeder fra os</li>
            <li>Virksomhedens navn, kontaktoplysninger og logo</li>
            <li>
              Betalingsoplysninger: vi gemmer et kundenummer hos Stripe og din
              betalingshistorik — <strong>aldrig kortnumre</strong>, som
              udelukkende håndteres af Stripe
            </li>
          </ul>
          <p>
            Grundlaget er opfyldelse af aftalen med dig, og for bogføringen en
            retlig forpligtelse. Regnskabsmateriale gemmes i fem år efter
            regnskabsårets udløb, som bogføringsloven kræver.
          </p>
        </LegalSection>

        <LegalSection
          id="venteliste"
          title="4. Hvis du skriver dig op til åbningen"
        >
          <p>
            Salget er ikke åbnet endnu, og du kan i stedet bede om at blive
            kontaktet, når det sker. Vi beder om dit navn, din e-mail og — hvis
            du vil — dit telefonnummer, samt hvilken løsning du er interesseret
            i.
          </p>
          <p>
            <strong>Oplysningerne gemmes ikke i vores system.</strong> De sendes
            som en almindelig mail til {COMPANY.email} og ligger i vores
            mailboks, indtil vi har kontaktet dig, og senest til salget har
            været åbent i tre måneder. Så sletter vi dem.
          </p>
          <p>
            Grundlaget er din egen anmodning, altså samtykke. Du kan når som
            helst skrive til {COMPANY.email} og bede os slette din tilmelding —
            og vi bruger den ikke til andet end det, du bad om.
          </p>
        </LegalSection>

        <LegalSection
          id="slutkunder"
          title="5. Oplysninger om butikkernes kunder"
        >
          <p>
            Tilmelder en kunde sig en butiks stempelkort, behandler vi det, som
            butikken beder om: typisk navn og en kontaktoplysning, samt optjente
            stempler og indløste belønninger.
          </p>
          <p>
            Et stempelkort kan tilgås via en hemmelig adresse uden at oprette
            konto. Kunden kan frivilligt oprette en konto for at samle sine kort
            på tværs af enheder — kortet knyttes kun til en konto fra kortets
            egen adresse, aldrig ud fra et e-mailmatch.
          </p>
          <p>
            Feedback afgivet til butikken er privat og deles ikke offentligt af
            os. Belønninger og stempler bliver aldrig gjort betinget af, at
            kunden skriver en offentlig anmeldelse.
          </p>
        </LegalSection>

        <LegalSection id="opbevaring" title="6. Hvor længe vi gemmer">
          <p>
            Oplysninger, der peger på en person, slettes, når formålet med dem
            er udtømt. Tal, der ikke peger på nogen, bliver liggende, så
            butikken beholder sin historik. Oprydningen kører automatisk{" "}
            {OPRYDNING_KADENCE}.
          </p>
          <div className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[34rem] border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-4 font-medium">Oplysning</th>
                  <th className="py-2 pr-4 font-medium">Slettes</th>
                  <th className="py-2 font-medium">Hvorfor</th>
                </tr>
              </thead>
              <tbody>
                {FRISTER.map((frist) => (
                  <tr key={frist.hvad} className="border-b border-border/60">
                    <td className="py-2 pr-4 align-top">{frist.hvad}</td>
                    <td className="py-2 pr-4 align-top whitespace-nowrap">
                      {frist.naar}
                    </td>
                    <td className="py-2 align-top text-muted">
                      {frist.hvorfor}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            <strong>Manglende betaling sletter ingenting.</strong> Kan et
            abonnement ikke betales, består kundeforholdet i{" "}
            {SUSPENSION_MAANEDER} måneder, hvor alt er urørt — butikkens kunder
            beholder deres stempelkort og deres stempler. Først derefter ophører
            aftalen, og så sletter vi inden for fristen ovenfor.
          </p>
          <p>
            En butik kan når som helst selv sætte sletning af alt i gang under
            Abonnement i dashboardet. Det kræver en bekræftelse på mail og kan
            fortrydes i {SLETNING_ANGREFRIST_DAGE} dage.
          </p>
          <p>
            Fristerne er vores standard. Er du butiksejer og har brug for en
            anden frist for dine egne kunders oplysninger, bestemmer du som
            dataansvarlig — skriv til {COMPANY.email}, så aftaler vi, hvordan
            det kan lade sig gøre.
          </p>
        </LegalSection>

        <LegalSection
          id="underdatabehandlere"
          title="7. Hvem vi deler data med"
        >
          <p>
            Vi sælger aldrig personoplysninger. Vi bruger disse leverandører til
            at drive tjenesten:
          </p>
          <ul className="space-y-1">
            <li>
              <strong>Supabase</strong> — database og login (EU, Irland)
            </li>
            <li>
              <strong>Vercel</strong> — hosting og drift af hjemmesiden (EU,
              Irland)
            </li>
            <li>
              <strong>Resend</strong> — udsendelse af vores e-mails (EU, Irland)
            </li>
            <li>
              <strong>Stripe</strong> — betaling, fakturaer og kundecenter
            </li>
          </ul>
          <p>
            Leverandørerne behandler kun oplysninger efter vores instruks og på
            en databehandleraftale. Vi pålægger dem de samme forpligtelser, som
            gælder for os, og vi hæfter over for dig for, at de overholdes.
          </p>
        </LegalSection>

        <LegalSection id="cookies" title="8. Cookies og statistik">
          <p>
            <strong>Nødvendige:</strong> vi bruger en enkelt cookie, der holder
            dig logget ind. Den kan ikke fravælges, for uden den virker login
            ikke.
          </p>
          <p>
            <strong>Besøgsstatistik uden cookies:</strong> vi tæller
            sidevisninger gennem Vercel Analytics. Det sætter ingenting på din
            enhed og kan ikke bruges til at genkende dig — derfor kræver det
            ikke dit samtykke efter cookiereglerne. Grundlaget er vores legitime
            interesse i at vide, hvilke sider der bliver læst, så vi kan gøre
            dem bedre. Målingen kan ikke henføres til dig.
          </p>
          <p>
            <strong>Statistik (Google Analytics):</strong> bruges kun, hvis du
            siger ja. Den hjælper os med at se, hvilke sider der bliver læst.
          </p>
          {ADS_ID ? (
            <p>
              <strong>Marketing (Google Ads):</strong> bruges kun, hvis du siger
              ja. Den måler, hvilke annoncer der fører til et køb, og lader os
              vise annoncer til folk, der har besøgt siden.
            </p>
          ) : null}
          <div className="overflow-x-auto">
            <table className="mt-2 w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border text-left">
                  <th className="py-2 pr-3 font-semibold">Navn</th>
                  <th className="py-2 pr-3 font-semibold">Formål</th>
                  <th className="py-2 font-semibold">Varighed</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3 align-top font-mono text-xs">
                    sb-…-auth-token
                  </td>
                  <td className="py-2 pr-3 align-top">
                    Nødvendig. Holder dig logget ind.
                  </td>
                  <td className="py-2 align-top">400 dage</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3 align-top font-mono text-xs">
                    sb-…-auth-token-code-verifier
                  </td>
                  <td className="py-2 pr-3 align-top">
                    Nødvendig. Bruges under login og ved nulstilling af
                    adgangskode.
                  </td>
                  <td className="py-2 align-top">Slettes efter login</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3 align-top font-mono text-xs">
                    loyalsum-samtykke
                  </td>
                  <td className="py-2 pr-3 align-top">
                    Nødvendig. Husker dit valg herunder, så du ikke bliver
                    spurgt igen. Gemmes i browserens lager, ikke som en cookie.
                  </td>
                  <td className="py-2 align-top">Til du rydder browseren</td>
                </tr>
                <tr className="border-b border-border/60">
                  <td className="py-2 pr-3 align-top font-mono text-xs">
                    _ga, _ga_…
                  </td>
                  <td className="py-2 pr-3 align-top">
                    Statistik. Google Analytics — kun hvis du siger ja.
                  </td>
                  <td className="py-2 align-top">2 år</td>
                </tr>
                {ADS_ID ? (
                  <tr className="border-b border-border/60">
                    <td className="py-2 pr-3 align-top font-mono text-xs">
                      _gcl_au
                    </td>
                    <td className="py-2 pr-3 align-top">
                      Marketing. Google Ads — kun hvis du siger ja.
                    </td>
                    <td className="py-2 align-top">90 dage</td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>

          <p>
            Når du tager stilling, gemmer vi dit valg hos os sammen med et
            tilfældigt id, tidspunktet og hvilken version du svarede på. Det er
            for at kunne dokumentere samtykket, som loven kræver. Registreringen
            indeholder hverken din IP-adresse eller andet, der peger på dig.
          </p>

          <p>
            {ADS_ID ? "De to kan vælges hver for sig. " : null}Scripterne
            indlæses slet ikke, før du har givet samtykke — siger du nej, sendes
            der ingenting til Google. Du kan altid ombestemme dig via
            “Cookieindstillinger” nederst på siden, og vi spørger igen efter et
            år. Google er databehandler for os, og oplysninger kan blive
            overført til USA på grundlag af EU-U.S. Data Privacy Framework.
          </p>
        </LegalSection>

        <LegalSection id="rettigheder" title="9. Dine rettigheder">
          <p>
            Du har ret til indsigt i dine oplysninger, til at få rettet forkerte
            oplysninger, til at få slettet data, til at begrænse behandlingen,
            til at få dine data udleveret og til at{" "}
            <strong>gøre indsigelse</strong> mod en behandling, vi baserer på
            vores legitime interesse.
          </p>
          <p>
            Har du givet samtykke — det gælder statistik- og marketingcookies —
            kan du <strong>altid trække det tilbage</strong> via
            “Cookieindstillinger” nederst på siden. Det påvirker ikke
            lovligheden af den behandling, der skete, før du trak det tilbage.
          </p>
          <p>
            Vi træffer ingen automatiske afgørelser om dig og laver ingen
            profilering.
          </p>
          <p>
            Du kan klage til Datatilsynet, Carl Jacobsens Vej 35, 2500 Valby.
          </p>
          <p>
            Skriv til{" "}
            <a
              href={`mailto:${COMPANY.email}`}
              className="font-medium text-accent"
            >
              {COMPANY.email}
            </a>
            , så svarer vi inden for en måned. Er du kunde i en butik, skal du
            som nævnt kontakte butikken.
          </p>
        </LegalSection>

        <LegalSection id="sikkerhed" title="10. Sikkerhed">
          <p>
            Data sendes krypteret, adgangskoder gemmes aldrig i klartekst, og
            adgangen til den enkelte butiks data er teknisk afgrænset, så én
            butik ikke kan se en andens.
          </p>
        </LegalSection>

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted">
          Se også vores{" "}
          <Link href="/handelsbetingelser" className="font-medium text-accent">
            handelsbetingelser
          </Link>
          .
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
