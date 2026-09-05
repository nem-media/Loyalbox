import type { Database } from "@/lib/types/database";
import { Stars } from "@/components/ui/stars";
import { Badge } from "@/components/ui/badge";
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
        <li key={f.id} className="py-4">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Stars value={f.rating} />
              <span className="text-sm font-medium">
                {f.customer_name || "Anonym"}
              </span>
              {f.is_public_review_clicked ? (
                <Badge tone="success">Klikkede videre</Badge>
              ) : null}
            </div>
            <span className="flex shrink-0 items-center gap-2 text-xs text-muted">
              {f.haandteret_den ? (
                <Badge tone="accent">Fulgt op</Badge>
              ) : null}
              {formatDateTime(f.created_at)}
            </span>
          </div>
          {f.comment ? (
            <p className="mt-2 text-sm text-foreground/80">{f.comment}</p>
          ) : null}
          {f.customer_email ? (
            <p className="mt-1 text-xs text-muted">{f.customer_email}</p>
          ) : null}
          {handling ? <div className="mt-2">{handling(f)}</div> : null}
        </li>
      ))}
    </ul>
  );
}
