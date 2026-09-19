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
              className="my-1.5 w-px shrink-0 self-stretch bg-border md:hidden"
            />
          ) : null}

          {section.title ? (
            // Overskriften giver kun mening i den lodrette menu. Vandret på
            // mobil ville den stå som et punkt, man kunne tro var et link.
            // `.etiket` er den fælles versalstil. Farven overskrives her,
            // fordi etiketten her står på navy og ikke på råhvidt.
            <p className="etiket mt-7 hidden px-3 pb-2 font-semibold md:block">
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
                /*
                  MENUEN ER LYS, OG DET AKTIVE PUNKT ER DEN ENESTE FLADE.
                  Da menuen var mørk, bar den sin egen kontrast: alt stod på
                  navy, og det aktive punkt var bare lysere. På en lys menu
                  skal markeringen komme fra accenten — tinten som flade,
                  accenten som tekst OG ikon — og alt andet skal være roligt,
                  ellers får man ti punkter, der alle råber.

                  Tinten er `--accent-tint` og ikke `bg-accent/10`: en alfa
                  oven på hvidt og den samme alfa oven på en råhvid grund
                  giver to forskellige farver, og menuen står på begge dele
                  (lodret på hvidt, vandret på mobilens lyse stribe).

                  Hover er den SAMME tint i halv styrke frem for en grå:
                  en neutral hover ved siden af en teal markering ser ud, som
                  om de to tilstande kommer fra hver sit system.
                */
                className={cn(
                  "btn-shape flex items-center gap-2.5 whitespace-nowrap px-3 py-2.5 text-sm transition-colors",
                  aktiv
                    ? "bg-accent-tint font-medium text-accent"
                    : "text-foreground/70 hover:bg-accent-tint/50 hover:text-foreground",
                )}
              >
                {/* `aktiv` tænder ikonets fyldte krop — se `nav-icons.tsx`
                    for hvorfor kun ét punkt ad gangen må have den. */}
                <Ikon
                  aktiv={aktiv}
                  className={cn(
                    "h-[19px] w-[19px] shrink-0",
                    aktiv ? "text-accent" : "text-muted",
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
