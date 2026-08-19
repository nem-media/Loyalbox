import Link from "next/link";
import { Logo } from "@/components/brand";
import { ConsentSettingsLink } from "@/components/analytics";
import { SITE_NAME, SITE_TAGLINE, PRODUCTS, COMPANY, mangler } from "@/lib/constants";

interface FooterLink {
  href: string;
  label: string;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Produkter",
    links: [
      ...PRODUCTS.map((p) => ({ href: `/produkter/${p.slug}`, label: p.name })),
      { href: "/produkter", label: "Alle produkter" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/#platform", label: "Alt i LoyalSum" },
      { href: "/stempelkort", label: "Digitalt stempelkort" },
      { href: "/reviewstander", label: "Reviewstander" },
      { href: "/#saadan", label: "Sådan virker det" },
    ],
  },
  {
    title: "Ressourcer",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/produkter", label: "Priser" },
      { href: "/bestil", label: "Bestil stander" },
    ],
  },
  {
    title: "Konto",
    links: [
      { href: "/login", label: "Log ind" },
      { href: "/signup", label: "Opret virksomhed" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted-bg">
      <div className="mx-auto max-w-6xl px-4 py-14">
        <div className="grid gap-10 md:grid-cols-[1.4fr_repeat(4,1fr)]">
          {/* Brand */}
          <div className="space-y-3">
            <Logo image="dark" />
            <p className="max-w-xs text-sm text-muted">{SITE_TAGLINE}</p>
          </div>

          {/* Link-kolonner */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              <h3 className="text-xs font-semibold uppercase tracking-wide text-muted">
                {col.title}
              </h3>
              <ul className="mt-3 space-y-2 text-sm">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link href={l.href} className="text-foreground/80 hover:text-accent">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Selskabsoplysninger er et lovkrav (e-handelsloven) og noget Stripe
            kontrollerer ved godkendelse — derfor i footeren på hver side. */}
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p>
              © {new Date().getFullYear()} {SITE_NAME} · Flere nye kunder og
              flere genbesøg for lokale forretninger.
            </p>
            <p className="mt-2">
              {COMPANY.legalName}
              {mangler(COMPANY.cvr) ? null : ` · CVR ${COMPANY.cvr}`}
              {mangler(COMPANY.address)
                ? null
                : ` · ${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}`}
              {" · "}
              <a href={`mailto:${COMPANY.email}`} className="hover:text-accent">
                {COMPANY.email}
              </a>
            </p>
          </div>
          <nav aria-label="Juridisk" className="flex gap-4 sm:shrink-0">
            <Link href="/handelsbetingelser" className="hover:text-accent">
              Handelsbetingelser
            </Link>
            <Link href="/privatliv" className="hover:text-accent">
              Privatlivspolitik
            </Link>
            <Link href="/databehandleraftale" className="hover:text-accent">
              Databehandleraftale
            </Link>
            <ConsentSettingsLink />
          </nav>
        </div>
      </div>
    </footer>
  );
}
