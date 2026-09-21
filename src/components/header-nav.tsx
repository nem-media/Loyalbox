"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { type NavLink } from "@/components/mobile-nav";

/**
 * Hovedmenuens punkter.
 *
 * HVORFOR EN EGEN KLIENTKOMPONENT: menuen skal vise, hvor man ER, og det
 * kræver den aktuelle sti. `SiteHeader` selv må IKKE blive `async` eller
 * læse noget fra serveren — det ene `getCurrentUser()`, der engang stod der,
 * gjorde ti marketingsider dynamiske og slog browserens bfcache fra, og
 * `statiske-sider.test.ts` spærrer for, at det sker igen. Et KLIENT-barn har
 * ikke den effekt: `usePathname` læses i browseren, og siden kan stadig være
 * statisk. Samme opdeling som `HeaderKonto`.
 *
 * MARKERINGEN ER EN FLADE OG IKKE EN UNDERSTREGNING. En streg under et
 * menupunkt på en mørk bjælke er 1-2 px, der forsvinder mod den lyse hero
 * nedenunder; en svag hvid flade bag punktet kan ses på en halv meters
 * afstand. Det er også den samme markering som i dashboardets menu — dér er
 * den bare accenttinten, fordi menuen er lys.
 *
 * HOVER ER SAMME FLADE I HALV STYRKE. En neutral grå hover ved siden af en
 * hvid markering ville se ud, som om de to tilstande kom fra hver sit sted.
 *
 * `/#platform` OG `/#loop` ER ANKRE PÅ FORSIDEN, og de må ikke markere sig
 * selv som aktive, bare fordi man står på forsiden: så ville to punkter være
 * tændt på én gang. Kun rene ruter sammenlignes.
 */
export function HeaderNav({ links }: { links: NavLink[] }) {
  const sti = usePathname();

  const erAktiv = (href: string) => {
    if (href.includes("#")) return false;
    if (href === "/") return sti === "/";
    return sti === href || sti.startsWith(href + "/");
  };

  return (
    <nav
      aria-label="Hovedmenu"
      className="hidden items-center gap-1 text-sm lg:flex xl:text-base"
    >
      {links.map((l) => {
        const aktiv = erAktiv(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={aktiv ? "page" : undefined}
            className={cn(
              "btn-shape whitespace-nowrap px-3 py-2 transition-colors xl:px-3.5",
              aktiv
                ? "bg-white/12 font-medium text-white"
                : "text-white/70 hover:bg-white/6 hover:text-white",
            )}
          >
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
