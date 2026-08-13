"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ButtonLink } from "@/components/ui/button";

export interface NavLink {
  href: string;
  label: string;
}

function IconMenu() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M4 7h16M4 12h16M4 17h16" />
    </svg>
  );
}

function IconClose() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className="h-6 w-6"
      aria-hidden="true"
    >
      <path d="M6 6l12 12M18 6L6 18" />
    </svg>
  );
}

/**
 * Mobilnavigation (under lg, hvor headerens desktop-nav er skjult).
 *
 * Bygget som et almindeligt disclosure-mønster: knap + panel bundet sammen med
 * aria-expanded/aria-controls. Panelet ligger absolut under headerbjælken —
 * headeren er `sticky`, altså et positioneret element, så den er panelets
 * udgangspunkt.
 *
 * Menuen lukkes ved klik på et link, på Escape og ved klik uden for panelet.
 * Der er bevidst ingen effekt der lytter på ruten: setState i en useEffect
 * udløser lint-fejl i dette projekt (React Compiler), og et onClick på hvert
 * link gør samme nytte.
 */
export function MobileNav({
  links,
  loggedIn,
  dashboardHref,
}: {
  links: NavLink[];
  loggedIn: boolean;
  dashboardHref: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open]);

  return (
    <>
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobil-menu"
        aria-label={open ? "Luk menu" : "Åbn menu"}
        onClick={() => setOpen((v) => !v)}
        className="btn-shape -mr-1 grid h-11 w-11 place-items-center text-white transition-colors hover:bg-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 lg:hidden"
      >
        {open ? <IconClose /> : <IconMenu />}
      </button>

      {open ? (
        <>
          {/* Starter under headerbjælken, så luk-knappen forbliver klikbar.

              Bevidst `absolute` og ikke `fixed`: headeren har backdrop-blur, og
              backdrop-filter gør et element til containing block for fixed
              efterkommere. En fixed backdrop ville derfor blive målt mod
              headerens 90px — top:90px + bottom:0 gav højde 0. */}
          <div
            aria-hidden="true"
            onClick={() => setOpen(false)}
            className="absolute inset-x-0 top-full h-screen bg-dark/60 lg:hidden"
          />
          <div
            id="mobil-menu"
            className="absolute left-0 right-0 top-full border-b border-white/10 bg-dark lg:hidden"
          >
            <nav aria-label="Hovedmenu" className="mx-auto max-w-6xl px-4 py-4">
              <ul className="space-y-1">
                {links.map((l) => (
                  <li key={l.href}>
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className="btn-shape block px-3 py-3 text-base text-white/80 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>

              <div className="mt-4 flex flex-col gap-2 border-t border-white/10 pt-4">
                {loggedIn ? (
                  <ButtonLink
                    href={dashboardHref}
                    size="lg"
                    onClick={() => setOpen(false)}
                  >
                    Dashboard
                  </ButtonLink>
                ) : (
                  <>
                    <ButtonLink
                      href="/login"
                      variant="outline-invert"
                      size="lg"
                      onClick={() => setOpen(false)}
                    >
                      Log ind
                    </ButtonLink>
                    <ButtonLink
                      href="/signup"
                      size="lg"
                      onClick={() => setOpen(false)}
                    >
                      Kom i gang
                    </ButtonLink>
                  </>
                )}
              </div>
            </nav>
          </div>
        </>
      ) : null}
    </>
  );
}
