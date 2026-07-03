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

const base =
  "btn-shape inline-flex items-center justify-center gap-2 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 disabled:opacity-50 disabled:pointer-events-none";

const variants: Record<Variant, string> = {
  primary: "bg-accent text-accent-fg hover:bg-accent-hover",
  secondary: "bg-secondary text-secondary-fg hover:opacity-90",
  outline: "border border-border bg-transparent hover:bg-muted-bg",
  "outline-invert":
    "border border-white/30 bg-transparent text-white hover:bg-white/10",
  ghost: "bg-transparent hover:bg-muted-bg",
  "ghost-invert": "bg-transparent text-white hover:bg-white/10",
  danger: "bg-danger text-white hover:opacity-90",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-7 text-base",
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
