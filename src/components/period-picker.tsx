import Link from "next/link";
import { PERIODS, PERIOD_LABELS, type Period } from "@/lib/period";

/**
 * Valg af periode.
 *
 * Ligger som én komponent, fordi den bruges både på forsiden og på
 * stempelkortet. To kopier ville før eller siden komme til at se forskellige
 * ud — og en bruger, der ser to forskellige kontroller til samme valg, tror
 * de gør noget forskelligt.
 *
 * Den er bevidst rolig: et valg af udsnit er ikke en handling og skal ikke
 * konkurrere med sidens grønne knap.
 */
export function PeriodPicker({
  basePath,
  current,
}: {
  basePath: string;
  current: Period;
}) {
  return (
    <div className="box-shape mb-6 inline-flex flex-wrap gap-1 border border-border bg-muted-bg p-1">
      {PERIODS.map((p) => {
        const aktiv = p === current;
        return (
          <Link
            key={p}
            href={`${basePath}?period=${p}`}
            aria-current={aktiv ? "page" : undefined}
            className={
              "box-shape px-3 py-1.5 text-sm transition-colors " +
              (aktiv
                ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(30,28,26,0.06)]"
                : "text-muted hover:text-foreground")
            }
          >
            {PERIOD_LABELS[p]}
          </Link>
        );
      })}
    </div>
  );
}
