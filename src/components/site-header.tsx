import Link from "next/link";
import { Logo } from "@/components/brand";
import { HeaderKonto } from "@/components/header-konto";
import { type NavLink } from "@/components/mobile-nav";

/**
 * Platform først: LoyalSum er en samlet platform, og reviewstanderen er ét
 * produkt i den — ikke omvendt. Deles med mobilmenuen, så de to navigationer
 * ikke kan komme ud af trit.
 */
const NAV_LINKS: NavLink[] = [
  { href: "/#platform", label: "Platform" },
  { href: "/stempelkort", label: "Stempelkort" },
  { href: "/reviewstander", label: "Reviewstander" },
  { href: "/produkter", label: "Priser" },
  { href: "/blog", label: "Blog" },
  { href: "/kontakt", label: "Kontakt" },
];

/**
 * HEADEREN LÆSER IKKE LÆNGERE SESSIONEN — og det er derfor, ti
 * marketingsider nu kan være statiske. Det ene `getCurrentUser()`, der stod
 * her, gjorde hver eneste side, der bærer headeren, dynamisk og dermed
 * `no-store`. Begrundelsen og de tre valg bag opdelingen står i
 * `HeaderKonto`; her er kun tilbage, at komponenten IKKE er `async` — bliver
 * den det igen, forsvinder gevinsten uden at nogen opdager det, og
 * `statiske-sider.test.ts` er sat til at fejle netop dér.
 */
export function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-dark/90 text-dark-fg backdrop-blur">
      <div className="mx-auto flex h-[90px] max-w-side items-center justify-between px-4">
        <Logo image="light" className="-translate-y-[6px]" prioritet />

        {/* Skiftet sker ved lg, ikke md: logo + fem links + to knapper kan ikke
            være der på en 768px-tablet uden at brække. */}
        <nav className="hidden items-center gap-7 text-base text-white/70 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>

        <HeaderKonto links={NAV_LINKS} />
      </div>
    </header>
  );
}
