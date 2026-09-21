import { cn } from "@/lib/utils";

/**
 * PLADSHOLDERE, MENS DER HENTES.
 *
 * HVORFOR SKELETTER OG IKKE EN SPINNER. En spinner midt på en tom side siger
 * "vent", og intet andet; et skelet siger OGSÅ hvad der er på vej og hvor det
 * lander, så siden ikke hopper, når tallene kommer. Forskellen mærkes mest
 * dér, hvor der er mange kort: fire felter, der bliver til fire kort, føles
 * hurtigere end en cirkel, der bliver til fire kort — selv når ventetiden er
 * præcis den samme.
 *
 * MÅLENE SKAL VÆRE DE RIGTIGE. Et skelet, der ikke har samme højde som det,
 * der kommer, flytter siden i det øjeblik, indholdet lander — og så har det
 * gjort skade frem for gavn. Komponenterne her er derfor bygget af de SAMME
 * mål som `Stat` og `Card`.
 *
 * Skelettet er `aria-hidden` og beholderen `aria-busy`: en skærmlæser skal
 * ikke læse en række tomme felter op, men gerne vide, at der arbejdes.
 */
export function Skelet({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      aria-hidden="true"
      className={cn("skelet btn-shape", className)}
      {...props}
    />
  );
}

/**
 * Et nøgletalskort under indlæsning — samme polstring og højde som `Stat`.
 *
 * `.etiket` PÅ EN TOM BEHOLDER er ikke en fejl: den reserverer etikettens to
 * linjer i etikettens EGNE mål, og `.etiket` er 12 px på en telefon og 11 på
 * desktop. Et fast rem-tal ville passe det ene sted og ikke det andet.
 *
 * MÅLT efter at `Stat` begyndte at reservere den anden etiketlinje: kortet
 * er 167 px, skelettet var 150. Siden hoppede altså 17 px pr. kort, i det
 * øjeblik tallene kom — præcis dét, et skelet findes for at undgå.
 *
 * `sm:` SKAL FØLGE `Stat`S EGEN GRÆNSE. Reserverer det ene sin linje på en
 * telefon og det andet ikke, er hoppet tilbage — bare kun på mobil.
 */
export function SkeletStat() {
  return (
    <div className="box-shape border border-border bg-card p-5 shadow-[var(--hoejde-1)]">
      <div className="etiket sm:min-h-[2.8em]">
        <Skelet className="h-3 w-24" />
      </div>
      <Skelet className="mt-2 h-10 w-20" />
      <Skelet className="mt-3 h-3 w-16" />
      <Skelet className="mt-2.5 h-3 w-32" />
    </div>
  );
}

/** Rækken af nøgletal. `antal` skal matche sidens faktiske antal kort. */
export function SkeletStatGitter({ antal = 4 }: { antal?: number }) {
  return (
    <div
      aria-busy="true"
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
    >
      {Array.from({ length: antal }, (_, i) => (
        <SkeletStat key={i} />
      ))}
    </div>
  );
}

/** Et almindeligt kort med nogle tekstlinjer. */
export function SkeletKort({
  linjer = 3,
  className,
}: {
  linjer?: number;
  className?: string;
}) {
  return (
    <div
      aria-busy="true"
      className={cn(
        "box-shape border border-border bg-card p-5 shadow-[var(--hoejde-1)]",
        className,
      )}
    >
      <Skelet className="h-4 w-40" />
      {Array.from({ length: linjer }, (_, i) => (
        <Skelet
          key={i}
          className="mt-3 h-3"
          style={{ width: `${88 - i * 14}%` }}
        />
      ))}
    </div>
  );
}
