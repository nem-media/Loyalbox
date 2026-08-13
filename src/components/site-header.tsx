import Link from "next/link";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { MobileNav, type NavLink } from "@/components/mobile-nav";
import { getCurrentUser } from "@/lib/auth";

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
];

export async function SiteHeader() {
  const user = await getCurrentUser();
  const dashboardHref = user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-dark/90 text-dark-fg backdrop-blur">
      <div className="mx-auto flex h-[90px] max-w-6xl items-center justify-between px-4">
        <Logo image="light" className="-translate-y-[6px]" />

        {/* Skiftet sker ved lg, ikke md: logo + fem links + to knapper kan ikke
            være der på en 768px-tablet uden at brække. */}
        <nav className="hidden items-center gap-7 text-base text-white/70 lg:flex">
          {NAV_LINKS.map((l) => (
            <Link key={l.href} href={l.href} className="hover:text-white">
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <div className="hidden items-center gap-2 lg:flex">
            {user ? (
              <ButtonLink href={dashboardHref} size="md">
                Dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink
                  href="/login"
                  variant="ghost-invert"
                  size="md"
                  className="whitespace-nowrap"
                >
                  Log ind
                </ButtonLink>
                <ButtonLink href="/signup" size="md" className="whitespace-nowrap">
                  Kom i gang
                </ButtonLink>
              </>
            )}
          </div>

          <MobileNav
            links={NAV_LINKS}
            loggedIn={Boolean(user)}
            dashboardHref={dashboardHref}
          />
        </div>
      </div>
    </header>
  );
}
