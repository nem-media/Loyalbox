import Link from "next/link";
import { cn } from "@/lib/utils";

export function Logo({
  className,
  href = "/",
  image,
}: {
  className?: string;
  href?: string;
  image?: "light" | "dark";
}) {
  return (
    <Link
      href={href}
      className={cn("inline-flex items-center gap-2 font-semibold", className)}
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={
            image === "dark"
              ? "/reviewstand-logo-dark.png"
              : "/reviewstand-logo.png"
          }
          alt="ReviewStand.dk"
          width={1600}
          height={340}
          className="h-11 w-auto"
        />
      ) : (
        <>
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-fg text-sm font-bold">
            R
          </span>
          <span className="tracking-tight">
            ReviewStand<span className="text-accent">.dk</span>
          </span>
        </>
      )}
    </Link>
  );
}
