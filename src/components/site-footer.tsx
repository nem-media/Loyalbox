import { Logo } from "@/components/brand";
import { SITE_TAGLINE } from "@/lib/constants";

export function SiteFooter() {
  return (
    <footer className="border-t border-border">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 px-4 py-10 text-sm text-muted sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-2">
          <Logo image="dark" />
          <p className="max-w-xs">{SITE_TAGLINE}</p>
        </div>
        <p>© {new Date().getFullYear()} ReviewStand.dk</p>
      </div>
    </footer>
  );
}
