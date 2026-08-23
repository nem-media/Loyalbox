import { cn } from "@/lib/utils";

/**
 * Tabel.
 *
 * TABELLER ER STØRSTEDELEN AF ET ADMINPANEL, og de var det mindst designede.
 * Hver side skrev sin egen `<table className="w-full text-sm">`, så de to
 * tabeller i panelet opførte sig forskelligt: den ene havde hover, den anden
 * ikke, og beløb stod venstrestillet uden `tabular-nums`, så kolonner med
 * penge ikke flugtede. Det er dét, der får en tabel til at ligne et regneark.
 *
 * MOBIL: en bred tabel i et kort skubbede HELE siden sideværts, fordi der
 * ikke var nogen beholder til at rulle i. `Table` pakker sig selv ind i én —
 * så ruller tabellen, og siden står stille.
 */
export function Table({
  className,
  ...props
}: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    // Beholderen er tabellens eget ansvar. Overlades den til kaldestedet,
    // bliver den glemt på den næste tabel, nogen skriver.
    <div className="-mx-px overflow-x-auto">
      <table
        className={cn("w-full min-w-[34rem] border-collapse text-sm", className)}
        {...props}
      />
    </div>
  );
}

export function THead({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn(
        // `.etiket` frem for at skrive versalstilen af igen — den var
        // defineret her OG i menuen, med hver sin bogstavafstand.
        "etiket border-b border-border bg-muted-bg/40 text-left",
        className,
      )}
      {...props}
    />
  );
}

export function TBody(props: React.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}

/**
 * Række. Hover er standard i `tbody` — en tabel, man kan klikke i, skal vise
 * hvilken linje musen står på, og en tabel, man ikke kan klikke i, tager ikke
 * skade af det.
 */
export function TR({
  className,
  ...props
}: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn(
        "border-b border-border/60 transition-colors last:border-0 hover:bg-accent/5",
        className,
      )}
      {...props}
    />
  );
}

/**
 * `numerisk` højrestiller og bruger `tabular-nums`, så cifrene står i lige
 * kolonner. Det er den ene ting, der gør mest for, om en tabel med tal ser
 * gennemarbejdet ud.
 */
export function TH({
  className,
  numerisk,
  ...props
}: React.ThHTMLAttributes<HTMLTableCellElement> & { numerisk?: boolean }) {
  return (
    <th
      className={cn(
        "px-4 py-3 font-medium",
        numerisk && "text-right",
        className,
      )}
      {...props}
    />
  );
}

export function TD({
  className,
  numerisk,
  ...props
}: React.TdHTMLAttributes<HTMLTableCellElement> & { numerisk?: boolean }) {
  return (
    <td
      className={cn(
        "px-4 py-3 align-middle",
        numerisk && "text-right tabular-nums",
        className,
      )}
      {...props}
    />
  );
}
