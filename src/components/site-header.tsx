import Link from "next/link";
import { Logo } from "@/components/brand";
import { ButtonLink } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/auth";

export async function SiteHeader() {
  const user = await getCurrentUser();
  const dashboardHref = user?.role === "admin" ? "/admin" : "/dashboard";

  return (
    <header className="sticky top-0 z-40 border-b border-white/10 bg-dark/90 text-dark-fg backdrop-blur">
      <div className="mx-auto flex h-[90px] max-w-6xl items-center justify-between px-4">
        <Logo image="light" className="-translate-y-[6px]" />
        {/* Platform først: LoyalSum er en samlet platform, og reviewstanderen
            er ét produkt i den — ikke omvendt. */}
        <nav className="hidden items-center gap-7 text-base text-white/70 md:flex">
          <Link href="/#platform" className="hover:text-white">
            Platform
          </Link>
          <Link href="/stempelkort" className="hover:text-white">
            Stempelkort
          </Link>
          <Link href="/reviewstander" className="hover:text-white">
            Reviewstander
          </Link>
          <Link href="/produkter" className="hover:text-white">
            Priser
          </Link>
          <Link href="/blog" className="hover:text-white">
            Blog
          </Link>
        </nav>
        <div className="flex items-center gap-2">
          {user ? (
            <ButtonLink href={dashboardHref} size="md">
              Dashboard
            </ButtonLink>
          ) : (
            <>
              {/* På de smalleste skærme fylder logoet næsten hele bredden, så
                  begge knapper brækker midt over. Log ind viger — Kom i gang
                  er den primære handling.

                  Synligheden ligger på wrapperen med vilje: cn() i lib/utils er
                  en ren sammenkædning uden tailwind-merge, så et "hidden" sendt
                  via className ville kollidere med knappens egen "inline-flex"
                  og tabe på kilderækkefølgen. */}
              <span className="hidden sm:block">
                <ButtonLink
                  href="/login"
                  variant="ghost-invert"
                  size="md"
                  className="whitespace-nowrap"
                >
                  Log ind
                </ButtonLink>
              </span>
              <ButtonLink href="/signup" size="md" className="whitespace-nowrap">
                Kom i gang
              </ButtonLink>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
