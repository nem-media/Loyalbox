import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Liste af rækker.
 *
 * HVORFOR IKKE `Table`: intet i dashboardet er tabulært. Kunder, rabatter,
 * historik og personale er rækker med et navn og en uddybning — ingen
 * kolonner af tal, der skal flugte. En tabel ville påføre dem en
 * minimumsbredde og vandret scroll på telefoner, hvilket er præcis den fejl,
 * der lige blev fjernet i admin.
 *
 * `Table` er til flere kolonner af sammenlignelige værdier. `Liste` er til
 * rækker, man læser én ad gangen. De to skal ikke smelte sammen.
 *
 * HVAD DEN LØSER: admin brugte `hover:bg-accent/5`, dashboardet
 * `hover:bg-muted-bg/40`, og en liste uden links så ud præcis som en med.
 * Musen sagde altså noget forskelligt i de to halvdele af det samme produkt,
 * og en række, der ikke kunne klikkes, inviterede alligevel til det.
 */
export function Liste({
  className,
  ...props
}: React.HTMLAttributes<HTMLUListElement>) {
  return (
    <ul
      className={cn("divide-y divide-border", className)}
      {...props}
    />
  );
}

/**
 * En række.
 *
 * `href` gør HELE rækken klikbar og tilføjer pilen — den billigste måde at
 * fortælle, at der er mere at se. Uden `href` er rækken ren visning og
 * reagerer ikke på musen, så affordancen aldrig lyver.
 *
 * `handling` er til en knap i højre side. Den ligger uden for linket, fordi
 * et link i et link ikke er gyldigt, og fordi en knap, der udfører noget
 * andet end rækken, ikke må kunne rammes ved et uheld.
 */
export function ListeRaekke({
  href,
  handling,
  className,
  children,
}: {
  href?: string;
  handling?: React.ReactNode;
  className?: string;
  children: React.ReactNode;
}) {
  const indhold = (
    <>
      <span className="min-w-0 flex-1">{children}</span>
      {href ? (
        <span aria-hidden="true" className="shrink-0 text-sm text-accent">
          →
        </span>
      ) : null}
    </>
  );

  return (
    <li className={cn("flex items-center gap-3", className)}>
      {href ? (
        <Link
          href={href}
          // Negativ margen, så baggrunden ved hover strækker sig ud til
          // listens kant i stedet for at stoppe i en usynlig indrykning.
          className="-mx-2 flex flex-1 items-center gap-3 rounded px-2 py-3 transition-colors hover:bg-accent/5"
        >
          {indhold}
        </Link>
      ) : (
        <span className="flex flex-1 items-center gap-3 py-3">{indhold}</span>
      )}

      {handling ? <span className="shrink-0">{handling}</span> : null}
    </li>
  );
}

/**
 * Rækkens overskrift og uddybning.
 *
 * Findes som komponent, fordi de to linjer ellers blev skrevet med fire
 * forskellige tekststørrelser rundt om i panelet.
 */
export function ListeTekst({
  titel,
  under,
}: {
  titel: React.ReactNode;
  under?: React.ReactNode;
}) {
  return (
    <span className="block min-w-0">
      <span className="block truncate font-medium">{titel}</span>
      {under ? (
        <span className="mt-0.5 block truncate text-sm text-muted">{under}</span>
      ) : null}
    </span>
  );
}
