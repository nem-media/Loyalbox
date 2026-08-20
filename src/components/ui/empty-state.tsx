import { Card, CardBody } from "./card";
import { cn } from "@/lib/utils";

/**
 * Tom tilstand.
 *
 * En tom liste er det STED, hvor en ny bruger oftest står fast — og hvor et
 * produkt oftest ligner noget uafsluttet. Tidligere stod der bare en grå
 * sætning midt i et hvidt felt.
 *
 * Tre ting hver gang: et ikon så feltet ikke er tomt, én sætning der siger
 * hvad man kan gøre, og en vej videre. Uden handlingen er beskeden bare en
 * konstatering af, at der ikke er noget.
 */
export function EmptyState({
  icon: Ikon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ComponentType<{ className?: string }>;
  title: string;
  description?: React.ReactNode;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={className}>
      <CardBody className="flex flex-col items-center py-10 text-center">
        {Ikon ? (
          <span
            aria-hidden="true"
            className="mb-3 grid h-11 w-11 place-items-center rounded-full bg-accent/8 text-accent"
          >
            <Ikon className="h-5 w-5" />
          </span>
        ) : null}

        <p className="font-medium">{title}</p>

        {description ? (
          <div className="mt-1 max-w-md text-sm leading-relaxed text-muted">
            {description}
          </div>
        ) : null}

        {action ? <div className="mt-4">{action}</div> : null}
      </CardBody>
    </Card>
  );
}

/**
 * Den lille udgave — til et felt inde på en side, der ellers har indhold.
 * Fx "ingen kunder er tæt på en belønning lige nu", hvor et helt kort med
 * ikon og knap ville tage opmærksomhed fra det, der faktisk er sket.
 */
export function EmptyLine({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <p className={cn("py-2 text-sm text-muted", className)}>{children}</p>
  );
}
