import Image from "next/image";
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
 *
 * `next/image` OG IKKE `<img>`, OG MÅLENE ER DE VISTE. Filen er 1450 × 340,
 * men logoet vises 188 × 44 (`h-11`) eller 120 × 28 (`h-7`). Med et rå
 * `<img>` blev hele filen hentet: **35 KB til et mærke, der fylder 44 px** —
 * og begge varianter på hver side, fordi headeren bruger den lyse og
 * footeren den mørke. Målt mod produktion 2026-09-17: 65 KB billeder på
 * forsiden, hvoraf 61 var spildt.
 *
 * VÆRRE END VÆGTEN VAR RÆKKEFØLGEN. Next lægger selv et
 * `<link rel="preload" as="image">` ind for hvert `<img>`, den tegner på
 * serveren — så BEGGE logoer blev hentet med høj prioritet foran CSS og
 * skrifttyper, inklusive footerens, som ingen ser uden at rulle. Med
 * `next/image` er billeder dovne som standard, og kun den, der sætter
 * `prioritet`, kommer foran i køen.
 *
 * MÅLENE SKAL VÆRE DE VISTE og ikke filens: uden `sizes` bygger Next sit
 * `srcset` ud af `width`, så 1450 ville hente 1450 igen. 188 × 44 giver 1x og
 * 2x af netop dét, der skal bruges — og forholdet er det samme som filens
 * (4,265), så der ikke flytter sig noget på skærmen.
 */
export function Logo({
  className,
  href = "/",
  image,
  hoejde = "h-11",
  prioritet = false,
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
  /**
   * Sæt den KUN, hvor logoet står over folden (headeren og dashboardets
   * skal). Den beder browseren hente billedet med det samme; sat i en footer
   * ville den stille sig foran noget, brugeren rent faktisk kigger på.
   */
  prioritet?: boolean;
}) {
  return (
    <Link href={href} className={cn("inline-flex items-center", className)}>
      <Image
        src={image === "dark" ? "/loyalsum-logo-dark.png" : "/loyalsum-logo.png"}
        alt={SITE_NAME}
        width={188}
        height={44}
        priority={prioritet}
        className={cn("w-auto", hoejde)}
      />
    </Link>
  );
}
