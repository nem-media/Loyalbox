import { stampProgress } from "@/lib/loyalty/balance";

/**
 * Visuel stempelkort-forhåndsvisning. Bruges i program-wizarden og på kundens
 * eget kort. Viser en stempelrække og fremgang mod belønningen.
 */
export function StampCardPreview({
  name,
  color = "#19375c",
  requiredStamps,
  filled = 0,
  rewardName,
  cardText,
  companyName,
}: {
  name: string;
  color?: string;
  requiredStamps: number;
  filled?: number;
  rewardName?: string | null;
  cardText?: string | null;
  companyName?: string | null;
}) {
  const total = Math.max(1, Math.min(requiredStamps, 30));
  const p = stampProgress(filled, requiredStamps);

  return (
    <div
      className="box-shape overflow-hidden border border-white/10 text-white shadow-sm"
      style={{ backgroundColor: color }}
    >
      <div className="p-5">
        {companyName ? (
          <p className="text-xs font-medium uppercase tracking-wide text-white/60">
            {companyName}
          </p>
        ) : null}
        <h3 className="mt-0.5 text-lg font-bold tracking-tight">{name || "Dit stempelkort"}</h3>
        {cardText ? (
          <p className="mt-1 text-sm text-white/70">{cardText}</p>
        ) : null}

        <div className="mt-4 grid grid-cols-5 gap-2">
          {Array.from({ length: total }).map((_, i) => {
            const isFilled = i < p.have;
            return (
              <div
                key={i}
                className="grid aspect-square place-items-center rounded-full border text-xs font-semibold"
                style={{
                  borderColor: "rgba(255,255,255,0.35)",
                  backgroundColor: isFilled ? "rgba(255,255,255,0.95)" : "transparent",
                  color: isFilled ? color : "rgba(255,255,255,0.6)",
                }}
                aria-hidden="true"
              >
                {isFilled ? "★" : i + 1}
              </div>
            );
          })}
        </div>

        <div className="mt-4 flex items-center justify-between text-sm">
          <span className="text-white/80">
            {p.have} af {p.required} stempler
          </span>
          {rewardName ? (
            <span className="rounded-full bg-white/15 px-2.5 py-1 text-xs font-medium">
              {p.reached ? "🎉 " : ""}
              {rewardName}
            </span>
          ) : null}
        </div>
      </div>
    </div>
  );
}
