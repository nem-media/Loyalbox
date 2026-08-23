import { IkonChip } from "./ikon-chip";
import { cn } from "@/lib/utils";

/**
 * Kort.
 *
 * Skyggen skal kunne ANES, ikke ses — bliver den tydelig, ryger den rolige,
 * danske tone. Men den lå før på 4 % oven på en HVID side, og der er 4 % ikke
 * diskret, det er usynligt. Kortet var dermed en hvid firkant med grå kontur.
 * Nu ligger kortet på råhvidt (`--app-bg`), og så gør skyggen sit arbejde:
 * det er kontrasten mellem kort og grund, der bærer, og skyggen, der forsegler.
 *
 * `interactive` er til kort, man kan klikke på. At et helt kort reagerer på
 * musen er den billigste måde at fortælle, at det ER klikbart — derfor løftes
 * det ét trin op ad højdeskalaen ved hover i stedet for bare at skifte kant.
 */
export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "box-shape border border-border bg-card shadow-[var(--hoejde-1)]",
        interactive &&
          "transition-all hover:border-accent/40 hover:shadow-[var(--hoejde-2)]",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5 pb-0", className)} {...props} />;
}

export function CardBody({
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

/**
 * Kortets overskrift.
 *
 * `text-base` og ikke `text-sm`: brødteksten i kortene er selv `text-sm`, så
 * overskriften stod i PRÆCIS samme størrelse som det, den overskrev. Et kort
 * uden indre hierarki læses som en tekstblok, ikke som et afsnit med et navn.
 *
 * NAVY og ikke næsten-sort. `--foreground` er `#0a0a0a`, en neutral uden
 * slægtskab med noget som helst i brandet. Navyen findes kun i menuen, og
 * derfor lignede de to halvdele af panelet to systemer klistret sammen. Nu
 * bærer overskrifterne den samme farve som menuen, brødteksten forbliver
 * neutral — det er dét, der binder indholdet til navigationen.
 *
 * `icon` BRUGES KUN, når kortet er et VINDUE IND I en anden side — altså når
 * der er et "se alle"-link, eller kortet svarer til et punkt i menuen. Så
 * fortæller ikonet, hvor man lander, og genbruger menuens eget ikonsprog.
 * Sættes det på hvert kort, holder det op med at betyde noget og bliver
 * pynt — og så er vi tilbage ved at pynte i stedet for at designe.
 */
export function CardTitle({
  icon,
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement> & {
  icon?: React.ComponentType<{ className?: string }>;
}) {
  return (
    <h3
      className={cn(
        "flex items-center gap-2.5 text-base font-semibold tracking-tight text-dark",
        className,
      )}
      {...props}
    >
      {icon ? <IkonChip icon={icon} /> : null}
      {children}
    </h3>
  );
}
