import type { Database } from "@/lib/types/database";
import { Stars } from "@/components/ui/stars";
import { Badge } from "@/components/ui/badge";
import { KundeAvatar } from "@/components/ui/avatar";
import { formatDateTime } from "@/lib/utils";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export function FeedbackList({
  items,
  emptyLabel = "Ingen feedback endnu.",
  handling,
}: {
  items: Feedback[];
  emptyLabel?: string;
  /**
   * Valgfri handling pr. række — fx "markér som fulgt op".
   *
   * SOM EN RENDER-PROP OG IKKE ET FLAG. Listen bruges tre steder: to i admin
   * og ét i butikkens eget dashboard. Handlingen hører kun til det sidste, og
   * dens server-action spørger `getCompanyAccess()`, som en admin ikke har.
   * Et flag ville lægge en knap i admin, der fejlede ved tryk.
   */
  handling?: (f: Feedback) => React.ReactNode;
}) {
  if (!items.length) {
    return <p className="py-8 text-center text-sm text-muted">{emptyLabel}</p>;
  }

  return (
    <ul className="divide-y divide-border">
      {items.map((f) => (
        <li key={f.id} className="flex gap-3 py-4">
          {/*
            AVATAREN ER INITIALER ELLER ET TEGN — ALDRIG ET ANSIGT.
            Vi har intet billede af butikkens kunder, og et lånt foto ville
            være en påstand om et menneske. Er tilbagemeldingen anonym, er
            `customer_name` tom, og avataren falder af sig selv tilbage på
            persontegnet; der sendes BEVIDST ikke en e-mail ind i stedet, for
            adressen er ikke noget, kunden har valgt at vise.
          */}
          <KundeAvatar navn={f.customer_name} size="sm" className="mt-0.5" />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                  <span className="text-sm font-medium">
                    {f.customer_name || "Anonym"}
                  </span>
                  {f.is_public_review_clicked ? (
                    <Badge tone="success">Klikkede videre</Badge>
                  ) : null}
                  {f.haandteret_den ? <Badge tone="accent">Fulgt op</Badge> : null}
                </div>
                <div className="mt-1.5">
                  <Stars value={f.rating} />
                </div>
              </div>
              <span className="shrink-0 text-xs text-muted">
                {formatDateTime(f.created_at)}
              </span>
            </div>
            {f.comment ? (
              /* Citatet er dét, butikken læser. Den lyse flade med en
                 accentkant til venstre gør det til en udtalelse frem for en
                 linje brødtekst — samme greb som et blockquote, uden at
                 påstå at teksten er redigeret. */
              <p className="btn-shape mt-2.5 border-l-2 border-accent/30 bg-surface-subtle px-3 py-2 text-sm leading-relaxed text-foreground/85">
                {f.comment}
              </p>
            ) : null}
            {f.customer_email ? (
              <p className="mt-1.5 text-xs text-muted">{f.customer_email}</p>
            ) : null}
            {handling ? <div className="mt-2.5">{handling(f)}</div> : null}
          </div>
        </li>
      ))}
    </ul>
  );
}
