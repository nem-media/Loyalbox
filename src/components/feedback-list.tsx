import type { Database } from "@/lib/types/database";
import { Stars } from "@/components/ui/stars";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";

type Feedback = Database["public"]["Tables"]["feedback"]["Row"];

export function FeedbackList({
  items,
  emptyLabel = "Ingen feedback endnu.",
}: {
  items: Feedback[];
  emptyLabel?: string;
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
            <span className="text-xs text-muted">
              {formatDateTime(f.created_at)}
            </span>
          </div>
          {f.comment ? (
            <p className="mt-2 text-sm text-foreground/80">{f.comment}</p>
          ) : null}
          {f.customer_email ? (
            <p className="mt-1 text-xs text-muted">{f.customer_email}</p>
          ) : null}
        </li>
      ))}
    </ul>
  );
}
