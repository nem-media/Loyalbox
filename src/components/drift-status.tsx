import { Card, CardBody, CardHeader, CardTitle } from "@/components/ui/card";
import { senesteKoersel, erForaeldet, type DriftRaekke } from "@/lib/drift";

/**
 * Driftsstatus i admin-panelet.
 *
 * DEN VIGTIGE TILSTAND ER IKKE "FEJLEDE" — DEN ER "HAR IKKE KØRT".
 * En opgave, der fejler, siger selv fra på mail. En opgave, der er holdt op
 * med at køre, siger ingenting, og stilhed ligner succes. Derfor måles der på
 * alderen af den seneste linje og ikke kun på, om den sidste gik godt.
 *
 * Kontrollen sker, når siden åbnes. Det er en bevidst begrænsning: det eneste
 * der kører af sig selv, er netop oprydningen, så den kan ikke overvåge sit
 * eget fravær.
 */

interface Opgave {
  navn: string;
  titel: string;
  /** Hvor gammel den seneste kørsel må være, før noget er galt. */
  graenseTimer: number;
  forventning: string;
}

const OPGAVER: Opgave[] = [
  {
    navn: "oprydning",
    titel: "Natlig oprydning",
    // Kører kl. 3. Halvandet døgn giver plads til en forsinket kørsel uden at
    // en reelt stoppet opgave kan gemme sig bag grænsen.
    graenseTimer: 36,
    forventning: "Kører hver nat kl. 3",
  },
];

export async function DriftStatus() {
  const linjer = await Promise.all(
    OPGAVER.map(async (opgave) => ({
      opgave,
      seneste: await senesteKoersel(opgave.navn),
    })),
  );

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle>Drift</CardTitle>
      </CardHeader>
      <CardBody className="pt-2">
        <ul className="divide-y divide-border">
          {linjer.map(({ opgave, seneste }) => (
            <li
              key={opgave.navn}
              className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 first:pt-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-medium">{opgave.titel}</p>
                <p className="text-xs text-muted">{opgave.forventning}</p>
              </div>
              <Tilstand seneste={seneste} graenseTimer={opgave.graenseTimer} />
            </li>
          ))}
        </ul>
      </CardBody>
    </Card>
  );
}

function Tilstand({
  seneste,
  graenseTimer,
}: {
  seneste: DriftRaekke | null;
  graenseTimer: number;
}) {
  if (!seneste) {
    return <Maerkat farve="advarsel">Har aldrig kørt</Maerkat>;
  }

  if (erForaeldet(seneste, graenseTimer)) {
    return (
      <Maerkat farve="advarsel">
        Har ikke kørt siden {dato(seneste.created_at)}
      </Maerkat>
    );
  }

  if (!seneste.ok) {
    return <Maerkat farve="fejl">Fejlede {siden(seneste.created_at)}</Maerkat>;
  }

  return <Maerkat farve="ok">Kørte {siden(seneste.created_at)}</Maerkat>;
}

function Maerkat({
  farve,
  children,
}: {
  farve: "ok" | "advarsel" | "fejl";
  children: React.ReactNode;
}) {
  const stil = {
    ok: "bg-accent/10 text-accent",
    advarsel: "bg-secondary/20 text-dark",
    fejl: "bg-red-50 text-red-700",
  }[farve];
  return (
    <span className={`box-shape px-2.5 py-1 text-xs font-medium ${stil}`}>
      {children}
    </span>
  );
}

/** "for 4 timer siden" — tal, ikke tidsstempler. Alderen er pointen. */
function siden(tidspunkt: string): string {
  const minutter = Math.floor((Date.now() - new Date(tidspunkt).getTime()) / 60_000);
  if (minutter < 60) return `for ${Math.max(minutter, 1)} min. siden`;
  const timer = Math.floor(minutter / 60);
  if (timer < 24) return `for ${timer} ${timer === 1 ? "time" : "timer"} siden`;
  const dage = Math.floor(timer / 24);
  return `for ${dage} ${dage === 1 ? "dag" : "dage"} siden`;
}

function dato(tidspunkt: string): string {
  return new Date(tidspunkt).toLocaleDateString("da-DK", {
    day: "numeric",
    month: "long",
  });
}
