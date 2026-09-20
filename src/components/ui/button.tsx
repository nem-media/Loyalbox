import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant =
  | "primary"
  | "secondary"
  | "outline"
  | "outline-invert"
  | "ghost"
  | "ghost-invert"
  | "danger";
type Size = "sm" | "md" | "lg";

/*
 * KNAPPEN ER ET EMNE, IKKE ET FARVET REKTANGEL.
 *
 * `transition-colors` blev til `transition-all`, fordi knappen nu også
 * flytter sig og skifter skygge — uden det skiftede farven blødt, mens
 * løftet sprang. 180 ms er dér, hvor et tryk føles besvaret uden at føles
 * langsomt; `prefers-reduced-motion` slår hele bevægelsen fra i globals.css.
 *
 * `active:translate-y-px` er ikke pynt: en knap, der giver efter under
 * fingeren, er den billigste feedback der findes, og den virker også på en
 * telefon, hvor der ingen hover er.
 *
 * Fokusringen har `ring-offset-background`, fordi offsettet ellers tegnes i
 * browserens standardhvide — på en råhvid grund gav det en hvid streg rundt
 * om ringen.
 */
const base =
  "btn-shape inline-flex items-center justify-center gap-2 font-medium transition-all duration-200 active:translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  /* `knap-flade` giver gradienten, den lyse inderkant og det lave skær —
     se globals.css. Hover hæver knappen 1 px og gør skæret dybere. */
  primary:
    "knap-flade text-accent-fg hover:-translate-y-px hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.16),0_2px_4px_rgba(30,28,26,0.14),0_10px_22px_-8px_color-mix(in_srgb,var(--accent)_55%,transparent)]",
  /*
    SEKUNDÆR ER DEN LYSE PILLE PÅ EN MØRK FLADE.
    Den var `bg-secondary`, altså husets beige — og da sekundærfarven blev
    blødt guld med paletten, ville hver eneste "Kom i gang" på en mørk hero
    være blevet en gul knap. Guld er en ILLUSTRATIONSFARVE (pointmønter,
    stjerner) og aldrig en handling.

    I designreferencerne er den anden knap på en mørk flade hvid med mørk
    tekst — den højeste kontrast, der findes, og derfor dén, der skal bære
    det primære valg, når baggrunden allerede er mørk. Teksten er `--dark`
    på hvidt: 15:1.
  */
  secondary:
    "bg-white text-dark shadow-[var(--hoejde-1)] hover:-translate-y-px hover:bg-white/92 hover:shadow-[var(--hoejde-2)]",
  outline:
    "border border-border bg-card text-foreground shadow-[var(--hoejde-1)] hover:-translate-y-px hover:border-accent/35 hover:bg-surface-subtle hover:shadow-[var(--hoejde-2)]",
  "outline-invert":
    "border border-white/25 bg-white/5 text-white backdrop-blur-sm hover:border-white/40 hover:bg-white/12",
  ghost: "bg-transparent hover:bg-accent-tint hover:text-accent",
  "ghost-invert": "bg-transparent text-white hover:bg-white/10",
  danger:
    "bg-danger text-white shadow-[var(--hoejde-1)] hover:-translate-y-px hover:brightness-110 hover:shadow-[var(--hoejde-2)]",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-[52px] px-8 text-base",
};

interface CommonProps {
  variant?: Variant;
  size?: Size;
  className?: string;
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...props
}: CommonProps & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  return (
    <button
      className={cn(base, variants[variant], sizes[size], className)}
      {...props}
    />
  );
}

export function ButtonLink({
  variant = "primary",
  size = "md",
  className,
  href,
  ...props
}: CommonProps &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & { href: string }) {
  const classes = cn(base, variants[variant], sizes[size], className);
  const isExternal = /^https?:\/\//.test(href);
  if (isExternal) {
    return <a href={href} className={classes} {...props} />;
  }
  return <Link href={href} className={classes} {...props} />;
}
