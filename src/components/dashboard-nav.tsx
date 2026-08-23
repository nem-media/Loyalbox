"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ICONS, type NavIconKey } from "@/components/nav-icons";

export interface NavItem {
  href: string;
  label: string;
  /** Navn på ikonet — ikke selve komponenten, se NAV_ICONS. */
  icon: NavIconKey;
}

export interface NavSection {
  /** Vises som en lille overskrift. Udelades for den øverste gruppe. */
  title?: string;
  items: NavItem[];
}

/**
 * Dashboardets menu.
 *
 * TO TING DEN LØSER, som den flade liste ikke gjorde:
 *
 * 1. Den viser hvor man ER. Før var der ingen markering overhovedet, så man
 *    kunne ikke se sin egen placering i systemet.
 * 2. Den skiller dagligt arbejde fra indstillinger. Standere bruges hver uge,
 *    Abonnement to gange om året — de skal ikke stå med samme vægt.
 *
 * Klientkomponent, fordi den aktive markering afhænger af den aktuelle sti.
 */
export function DashboardNav({ sections }: { sections: NavSection[] }) {
  const path = usePathname();

  const erAktiv = (href: string) =>
    href === "/dashboard" ? path === href : path.startsWith(href);

  return (
    <nav
      className={cn(
        "flex gap-1 overflow-x-auto px-2 pb-2",
        // Luft i højre ende, så det sidste punkt ikke klistrer til kanten og
        // ser afskåret ud, når man har rullet helt ud.
        "after:block after:w-1 after:shrink-0 after:content-['']",
        "md:flex-col md:gap-0 md:overflow-visible md:px-3 md:pb-0 md:after:hidden",
      )}
    >
      {sections.map((section, i) => (
        <div key={section.title ?? i} className="contents md:block">
          {/* På mobil er striben vandret, og overskriften er skjult — så ville
              dagligt arbejde og indstillinger løbe sammen til én lang række
              uden skel. Stregen markerer grænsen dér, hvor overskriften ellers
              ville stå. Med ti punkter er den forskellen på en menu og en
              opremsning. */}
          {i > 0 ? (
            <span
              aria-hidden="true"
              className="my-1.5 w-px shrink-0 self-stretch bg-white/15 md:hidden"
            />
          ) : null}

          {section.title ? (
            // Overskriften giver kun mening i den lodrette menu. Vandret på
            // mobil ville den stå som et punkt, man kunne tro var et link.
            // `.etiket` er den fælles versalstil. Farven overskrives her,
            // fordi etiketten her står på navy og ikke på råhvidt.
            <p className="etiket mt-5 hidden px-3 pb-1.5 font-semibold text-white/40 md:block">
              {section.title}
            </p>
          ) : null}

          {section.items.map((item) => {
            const aktiv = erAktiv(item.href);
            const Ikon = NAV_ICONS[item.icon];
            return (
              <Link
                key={item.href}
                href={item.href}
                aria-current={aktiv ? "page" : undefined}
                className={cn(
                  "box-shape flex items-center gap-2.5 whitespace-nowrap px-3 py-2 text-sm transition-colors",
                  aktiv
                    ? "bg-white/12 font-medium text-white"
                    : "text-white/70 hover:bg-white/8 hover:text-white",
                )}
              >
                <Ikon
                  className={cn(
                    "h-[18px] w-[18px] shrink-0",
                    aktiv ? "text-accent" : "text-white/50",
                  )}
                />
                {item.label}
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}
