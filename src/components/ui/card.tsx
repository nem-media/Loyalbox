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
 */
export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-base font-semibold tracking-tight", className)}
      {...props}
    />
  );
}
