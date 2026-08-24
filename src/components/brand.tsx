import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";

const dotIndex = SITE_NAME.indexOf(".");
const brandBase = dotIndex === -1 ? SITE_NAME : SITE_NAME.slice(0, dotIndex);

/**
 * Stjernen i logoet.
 *
 * HVORFOR SVG OG IKKE PNG: logoet lå som to PNG-filer med den grønne bagt
 * ind i pixlerne. Skiftede paletten, blev stjernen stående i den gamle farve
 * — og det var den eneste rest, man kunne se på hele sitet. Som SVG arver
 * den `currentColor` og følger dermed accentfarven af sig selv.
 *
 * DEN INDRE STJERNE ER EN UDSKÆRING og ikke en hvid form. `fill-rule
 * evenodd` gør hullet gennemsigtigt, så baggrunden skinner igennem: mørk i
 * headeren, lys på hvide flader. En hvid indre stjerne ville se rigtig ud
 * ét sted og forkert det andet.
 *
 * Punkterne er REGNET ud (fem spidser, ydre radius 11,4, indre 4,5) og ikke
 * tegnet på øjemål — en stjerne, hvor spidserne ikke sidder præcist, er
 * netop dét, man ser uden at kunne sige hvorfor.
 */
function BrandStar({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={cn("h-[0.72em] w-[0.72em] shrink-0", className)}
      fill="currentColor"
      fillRule="evenodd"
      aria-hidden="true"
    >
      <path d="M12 1.2L14.65 8.96L22.84 9.08L16.28 13.99L18.7 21.82L12 17.1L5.3 21.82L7.72 13.99L1.16 9.08L9.35 8.96Z" />
      <path d="M12 6L13.09 9.1L16.37 9.18L13.76 11.17L14.7 14.32L12 12.45L9.3 14.32L10.24 11.17L7.63 9.18L10.91 9.1Z" />
    </svg>
  );
}

/**
 * Ordmærket.
 *
 * Sat som LEVENDE TEKST i sitets egen skrift frem for som optegnede
 * bogstaver. To grunde: teksten kan læses af skærmlæsere og af Google uden
 * en alt-tekst, der kan komme i utakt med billedet — og skriften følger
 * resten af sitet, så logoet ikke er det ene sted, der bruger noget andet.
 *
 * `image` er beholdt som prop, fordi kaldestederne sender den: "light" er
 * til mørk baggrund (hvid tekst), "dark" til lys (koks). Den styrer nu kun
 * tekstfarven — der er ingen billedfil mere.
 */
export function Logo({
  className,
  href = "/",
  image,
}: {
  className?: string;
  href?: string;
  image?: "light" | "dark";
}) {
  const paaMoerk = image === "light";

  return (
    <Link
      href={href}
      aria-label={SITE_NAME}
      className={cn(
        "inline-flex items-center text-[1.75rem] font-bold leading-none tracking-tight",
        paaMoerk ? "text-dark-fg" : "text-dark",
        className,
      )}
    >
      {/* Ordmærket er "LoyalSum" UDEN toplevel-domænet — sådan er det også i
          det oprindelige logo. `SITE_NAME` indeholder ".dk", fordi den bruges
          i sidetitler, men et logo med et domæne hængende bagpå er en anden
          ting end et navnetræk. */}
      <span aria-hidden="true">{brandBase[0]}</span>
      {/* Stjernen står, hvor "o" ellers ville stå, og er derfor sat til
          bredden af et "o" i denne vægt (~0,72em). Var den bredere, ville der
          komme et hul på hver side, og ordet ville falde fra hinanden. */}
      <BrandStar className="mx-[0.02em] text-accent" />
      <span aria-hidden="true">{brandBase.slice(2)}</span>
    </Link>
  );
}
