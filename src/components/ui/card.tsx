import { cn } from "@/lib/utils";

/**
 * Kort.
 *
 * Den ganske svage skygge er bevidst: uden den flyder kortene sammen med
 * baggrunden, og siden kommer til at ligne en skitse. Den skal kunne ANES, ikke
 * ses — bliver den tydelig, ryger den rolige, danske tone.
 *
 * `interactive` er til kort, man kan klikke på. At et helt kort reagerer på
 * musen er den billigste måde at fortælle, at det ER klikbart.
 */
export function Card({
  className,
  interactive,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & { interactive?: boolean }) {
  return (
    <div
      className={cn(
        "box-shape border border-border bg-card shadow-[0_1px_2px_rgba(25,55,92,0.04)]",
        interactive &&
          "transition-all hover:border-accent/40 hover:shadow-[0_2px_10px_rgba(25,55,92,0.08)]",
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

export function CardTitle({
  className,
  ...props
}: React.HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn("text-sm font-semibold tracking-tight", className)}
      {...props}
    />
  );
}
