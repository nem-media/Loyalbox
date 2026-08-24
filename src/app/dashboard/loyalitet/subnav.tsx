"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LOYALTY_NAV } from "@/lib/loyalty/constants";

// Sektioner der er bygget (udvides fase for fase, så menuen aldrig peger på 404).
const BUILT = new Set<string>([
  "/dashboard/loyalitet",
  "/dashboard/loyalitet/programmer",
  "/dashboard/loyalitet/kunder",
  "/dashboard/loyalitet/rabatter",
]);

export function LoyaltySubnav() {
  const path = usePathname();
  const items = LOYALTY_NAV.filter((i) => BUILT.has(i.href));
  return (
    // Sektionens navn står OVER fanerne, så man kan se hvor man er, uden at
    // skulle udlede det af hvilken fane der lyser. Fanerne er samtidig gjort
    // rolige: de er navigation inde i en sektion, ikke en handling, og skal
    // derfor ikke råbe lige så højt som en grøn knap.
    <div className="mb-6">
      <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted">
        Stempelkort
      </p>
      <nav className="box-shape inline-flex flex-wrap gap-1 border border-border bg-muted-bg p-1">
        {items.map((i) => {
          const active =
            i.href === "/dashboard/loyalitet"
              ? path === i.href
              : path.startsWith(i.href);
          return (
            <Link
              key={i.href}
              href={i.href}
              aria-current={active ? "page" : undefined}
              className={
                "box-shape px-3 py-1.5 text-sm transition-colors " +
                (active
                  ? "bg-card font-medium text-foreground shadow-[0_1px_2px_rgba(30,28,26,0.06)]"
                  : "text-muted hover:text-foreground")
              }
            >
              {i.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
