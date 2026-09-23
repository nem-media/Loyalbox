import { PageHeader } from "@/components/dashboard-shell";
import { Card, CardBody } from "@/components/ui/card";
import { Besked } from "@/components/ui/besked";
import { TERMS_VERSION } from "@/lib/constants";
import { DPA_VERSION } from "@/lib/dpa";
import { VILKAARSVARSEL_DAGE } from "@/lib/abonnement";
import { varselMail, ikrafttraedelse } from "@/lib/vilkaarsvarsel";
import { modtagere } from "@/lib/vilkaarsvarsel-udsendelse";
import { VarselKnap } from "./varsel-knap";

export const metadata = { title: "Varsling om vilkår" };

/**
 * VARSLING OM ÆNDREDE VILKÅR.
 *
 * Handelsbetingelsernes §15 lover, at ændringer varsles på mail senest
 * {VILKAARSVARSEL_DAGE} dage før, de træder i kraft — og databehandleraftalen
 * lover det samme. Indtil denne side fandtes, kunne versionerne hæves, uden
 * at nogen mail blev sendt: et løfte i en aftale, kunden har accepteret, som
 * systemet ikke kunne holde.
 *
 * SIDEN VISER LISTEN FØR DEN SENDER. At maile hver eneste kunde er den mest
 * uigenkaldelige handling i systemet, og den skal kunne ses an: hvem får den,
 * hvilken version står de på, og hvad kommer der til at stå i mailen.
 *
 * DER ER INGEN AUTOMATIK. Et varsel, der udløses af en udrulning, ville
 * betyde, at et commit kan skrive til alle kunder — og versionen hæves ofte
 * som en del af en rettelse. Udsendelsen er en beslutning, et menneske
 * træffer.
 */
export default async function VarslerPage() {
  const [vilkaar, dpa, begge] = await Promise.all([
    modtagere("vilkaar"),
    modtagere("dpa"),
    modtagere("begge"),
  ]);

  const ikraft = ikrafttraedelse();
  const eksempel = varselMail({ slags: "begge", ikrafttraeden: ikraft });

  const grupper = [
    { slags: "vilkaar" as const, navn: "Handelsbetingelser", version: TERMS_VERSION, liste: vilkaar },
    { slags: "dpa" as const, navn: "Databehandleraftale", version: DPA_VERSION, liste: dpa },
    { slags: "begge" as const, navn: "Begge aftaler", version: `${TERMS_VERSION} + ${DPA_VERSION}`, liste: begge },
  ];

  return (
    <>
      <PageHeader
        title="Varsling om vilkår"
        description={`Handelsbetingelsernes §15 lover varsling på mail senest ${VILKAARSVARSEL_DAGE} dage før en ændring træder i kraft. Her sendes den.`}
      />

      <Besked slags="advarsel">
        Knapperne herunder sender en mail til <strong>hver kunde på listen</strong>.
        Der kan ikke sendes to gange: alle, der har fået varslet, noteres i
        admin-loggen og falder af listen.
      </Besked>

      <div className="mt-6 space-y-4">
        {grupper.map((g) => (
          <Card key={g.slags}>
            <CardBody>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="font-bold tracking-tight">{g.navn}</p>
                  <p className="mt-1 text-sm text-muted">
                    Gældende version {g.version}.{" "}
                    {g.liste.length === 0
                      ? "Ingen mangler varslet."
                      : `${g.liste.length} kunde${g.liste.length === 1 ? "" : "r"} mangler varslet.`}
                  </p>
                </div>
                {g.liste.length > 0 ? (
                  <VarselKnap slags={g.slags} antal={g.liste.length} />
                ) : null}
              </div>

              {g.liste.length > 0 ? (
                /* HVEM det er, og HVILKEN version de står på. Uden den anden
                   kolonne er listen et tal, man skal tro på. */
                <ul className="mt-4 divide-y divide-border border-t border-border text-sm">
                  {g.liste.map((m) => (
                    <li
                      key={m.id}
                      className="flex flex-wrap items-baseline justify-between gap-2 py-2"
                    >
                      <span className="font-medium">{m.navn}</span>
                      <span className="text-xs text-muted">
                        står på {m.nuvaerende ?? "ingen version"}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </CardBody>
          </Card>
        ))}
      </div>

      {/* SÅDAN KOMMER DEN TIL AT SE UD. Teksten er den, der faktisk sendes —
          `varselMail()` er den samme funktion. En forhåndsvisning, der bygger
          sin egen tekst, ville før eller siden vise noget andet. */}
      <Card className="mt-6">
        <CardBody>
          <p className="font-bold tracking-tight">Sådan kommer mailen til at se ud</p>
          <p className="mt-1 text-sm text-muted">
            Emne: <span className="font-medium text-foreground">{eksempel.emne}</span>
          </p>
          <pre className="box-shape mt-4 overflow-x-auto border border-border bg-surface-subtle p-4 text-xs leading-relaxed">
            {eksempel.tekst}
          </pre>
        </CardBody>
      </Card>
    </>
  );
}
