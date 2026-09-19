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
    /* SEGMENTERET KONTROL: den ydre flade er en fordybning, det valgte er
       et emne, der ligger OVENPÅ. Den indadgående streg foroven er det,
       der gør ydersiden til en rille — uden den er det to rektangler i to
       grå nuancer. */
    <div className="box-shape mb-6 inline-flex flex-wrap gap-1 border border-border bg-muted-bg p-1 shadow-[inset_0_1px_2px_rgba(30,28,26,0.05)]">
      {PERIODS.map((p) => {
        const aktiv = p === current;
        return (
          <Link
            key={p}
            href={`${basePath}?period=${p}`}
            aria-current={aktiv ? "page" : undefined}
            className={
              "btn-shape px-3.5 py-2 text-sm transition-all duration-200 " +
              (aktiv
                ? "bg-card font-semibold text-dark shadow-[inset_0_1px_0_rgba(255,255,255,0.9),0_1px_2px_rgba(30,28,26,0.1),0_2px_6px_-2px_rgba(30,28,26,0.12)]"
                : "text-muted hover:bg-card/60 hover:text-foreground")
            }
          >
            {PERIOD_LABELS[p]}
          </Link>
        );
      })}
    </div>
  );
}
