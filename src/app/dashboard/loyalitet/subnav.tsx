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
    <nav className="mb-6 flex flex-wrap gap-1 border-b border-border pb-3">
      {items.map((i) => {
        const active =
          i.href === "/dashboard/loyalitet"
            ? path === i.href
            : path.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            className={
              "box-shape px-3 py-1.5 text-sm " +
              (active
                ? "bg-accent text-accent-fg"
                : "text-muted hover:bg-muted-bg hover:text-foreground")
            }
          >
            {i.label}
          </Link>
        );
      })}
    </nav>
  );
}
