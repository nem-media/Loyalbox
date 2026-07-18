import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";

const dotIndex = SITE_NAME.indexOf(".");
const brandBase = dotIndex === -1 ? SITE_NAME : SITE_NAME.slice(0, dotIndex);
const brandTld = dotIndex === -1 ? "" : SITE_NAME.slice(dotIndex);

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
          alt={SITE_NAME}
          width={1450}
          height={340}
          className="h-11 w-auto"
        />
      ) : (
        <>
          <span className="grid h-7 w-7 place-items-center rounded-md bg-accent text-accent-fg text-sm font-bold">
            {brandBase[0]}
          </span>
          <span className="tracking-tight">
            {brandBase}
            <span className="text-accent">{brandTld}</span>
          </span>
        </>
      )}
    </Link>
  );
}
