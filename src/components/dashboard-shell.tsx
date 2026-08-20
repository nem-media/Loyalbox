import Link from "next/link";
import { Logo } from "@/components/brand";
import { signout } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";
import { SearchIcon } from "@/components/nav-icons";
import { DashboardNav, type NavSection } from "@/components/dashboard-nav";

export type { NavItem, NavSection } from "@/components/dashboard-nav";

export function DashboardShell({
  sections,
  email,
  roleLabel,
  companyName,
  quickAction,
  children,
}: {
  sections: NavSection[];
  email: string;
  roleLabel: string;
  companyName?: string | null;
  /** Den daglige handling. Udelades, hvis virksomheden ikke har stempelkort. */
  quickAction?: { href: string; label: string };
  children: React.ReactNode;
}) {
  const initialer = (companyName ?? email)
    .trim()
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <aside className="flex shrink-0 flex-col border-b border-white/10 bg-dark text-dark-fg md:w-64 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4 md:pb-2">
          <Logo image="light" />
          <Badge tone="accent" className="md:hidden">
            {roleLabel}
          </Badge>
        </div>

        {/* Den hyppigste handling i en travl hverdag: find kunden, giv
            stemplet. Den lå tre klik nede under Stempelkort → Kunder → søg. */}
        {quickAction ? (
          <div className="hidden px-3 pb-1 md:block">
            <Link
              href={quickAction.href}
              className="btn-shape flex items-center justify-center gap-2 bg-accent px-3 py-2.5 text-sm font-medium text-accent-fg transition-colors hover:bg-accent-hover"
            >
              <SearchIcon className="h-[18px] w-[18px]" />
              {quickAction.label}
            </Link>
          </div>
        ) : null}

        <DashboardNav sections={sections} />

        <div className="mt-auto hidden border-t border-white/10 p-3 md:block">
          <div className="flex items-center gap-2.5 px-1">
            <span
              aria-hidden="true"
              className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-white/10 text-xs font-semibold text-white"
            >
              {initialer}
            </span>
            <div className="min-w-0">
              {companyName ? (
                <p className="truncate text-sm font-medium text-white">
                  {companyName}
                </p>
              ) : null}
              <p className="truncate text-xs text-white/50">{email}</p>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <Badge tone="neutral">{roleLabel}</Badge>
            <form action={signout}>
              <button className="box-shape px-2.5 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/10 hover:text-white">
                Log ud
              </button>
            </form>
          </div>
        </div>
      </aside>

      <main className="flex-1 bg-background">
        <div className="mx-auto max-w-5xl p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description ? (
          <p className="mt-1 text-sm text-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
