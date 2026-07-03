import { cn } from "@/lib/utils";

function StarIcon({ filled, className }: { filled: boolean; className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill={filled ? "currentColor" : "none"}
      stroke="currentColor"
      strokeWidth={1.5}
      aria-hidden="true"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M11.48 3.5a.56.56 0 0 1 1.04 0l2.12 5.11 5.52.44c.5.04.7.66.32.99l-4.2 3.6 1.28 5.39a.56.56 0 0 1-.84.6L12 16.98l-4.72 3.25a.56.56 0 0 1-.84-.6l1.28-5.39-4.2-3.6a.56.56 0 0 1 .32-.99l5.52-.44 2.12-5.11Z"
      />
    </svg>
  );
}

/** Read-only star display used in dashboards. */
export function Stars({
  value,
  size = 16,
  className,
}: {
  value: number;
  size?: number;
  className?: string;
}) {
  return (
    <span className={cn("inline-flex text-star", className)}>
      {[1, 2, 3, 4, 5].map((n) => (
        <StarIcon
          key={n}
          filled={n <= Math.round(value)}
          className=""
          // inline size to keep it simple across contexts
          {...{ style: { width: size, height: size } }}
        />
      ))}
    </span>
  );
}

export { StarIcon };
