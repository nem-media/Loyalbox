import Link from "next/link";
import { Logo } from "@/components/brand";
import { signout } from "@/app/(auth)/actions";
import { Badge } from "@/components/ui/badge";

export interface NavItem {
  href: string;
  label: string;
}

export function DashboardShell({
  nav,
  email,
  roleLabel,
  children,
}: {
  nav: NavItem[];
  email: string;
  roleLabel: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      {/* Sidebar */}
      <aside className="flex shrink-0 flex-col border-b border-white/10 bg-dark text-dark-fg md:w-60 md:border-b-0 md:border-r">
        <div className="flex items-center justify-between p-4">
          <Logo image="light" />
          <Badge tone="accent" className="md:hidden">
            {roleLabel}
          </Badge>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 md:flex-col md:overflow-visible md:px-3 md:pb-0">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="box-shape whitespace-nowrap px-3 py-2 text-sm text-white/70 hover:bg-white/10 hover:text-white"
            >
              {item.label}
            </Link>
          ))}
        </nav>
        <div className="mt-auto hidden border-t border-white/10 p-3 md:block">
          <p className="truncate px-1 text-xs text-white/60">{email}</p>
          <Badge tone="neutral" className="mt-2">
            {roleLabel}
          </Badge>
          <form action={signout} className="mt-3">
            <button className="box-shape w-full px-3 py-2 text-left text-sm text-white/70 hover:bg-white/10 hover:text-white">
              Log ud
            </button>
          </form>
        </div>
      </aside>

      {/* Content */}
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
      {action}
    </div>
  );
}
