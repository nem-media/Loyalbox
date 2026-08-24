import Link from "next/link";
import { cn } from "@/lib/utils";
import { SITE_NAME } from "@/lib/constants";

/**
 * Logoet.
 *
 * TILBAGE TIL BILLEDFILER, fordi ordmærket nu findes i den rigtige skrift og
 * i den nye palet. Den levende tekst var en nødløsning, mens paletten blev
 * afgjort — den brugte sitets Geist og ramte derfor ikke navnetrækket.
 *
 * `image="light"` er det LYSE logo, altså det til MØRK baggrund. Navnet
 * følger logoet og ikke baggrunden; det er nemt at bytte om.
 *
 * STJERNEN ER BEIGE i begge filer, og det er rigtigt: på mørk bund ville
 * accentfarven petroleum kun give 2,44 i kontrast, mens beige giver 6,79.
 * Logoet følger dermed samme regel som knapperne — beige på mørkt.
 *
 * `image` er PÅKRÆVET. Der lå før en tekstbaseret reserveudgave for det
 * tilfælde, at den blev udeladt, men alle ti kaldesteder sender den. En gren,
 * ingen når, er en gren, ingen opdager er gået i stykker.
 */
export function Logo({
  className,
  href = "/",
  image,
  hoejde = "h-11",
}: {
  /** Margener og lignende. Sættes på LINKET. */
  className?: string;
  href?: string;
  image: "light" | "dark";
  /**
   * Højden som en Tailwind-klasse. Egen prop, fordi `className` lander på
   * linket og derfor ikke kan krympe billedet indeni — og `cn()` er en
   * simpel sammenføjer, så `h-11 h-7` ville lade rækkefølgen i den
   * genererede CSS afgøre, hvilken der vandt.
   */
  hoejde?: string;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={image === "dark" ? "/loyalsum-logo-dark.png" : "/loyalsum-logo.png"}
        alt={SITE_NAME}
        width={1450}
        height={340}
        className={cn("w-auto", hoejde)}
      />
    </Link>
  );
}
