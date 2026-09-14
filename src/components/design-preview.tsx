import { SkiltPreview } from "@/components/skilt-preview";
import { designFrontfarve, type FrontType } from "@/lib/design";
import type { StanderFarve } from "@/lib/stander-tilvalg";

/**
 * Et gemt design vist som DET SKILT, det er — ikke som en farveprøve.
 *
 * HVORFOR DEN FINDES: designet blev tre steder vist som en lille firkant i
 * frontfarven med logoet ovenpå. Det svarer på "hvilken farve" og "hvilket
 * logo", men ikke på det, kunden faktisk står og spørger om: **hvordan så det
 * ud?** Stjernerne, "Scan eller tap", QR-feltet og accentfarven — alt det,
 * der gør et skilt genkendeligt — manglede. En butik med to designs i samme
 * farve kunne slet ikke se forskel på dem.
 *
 * ÉN KOMPONENT TIL ALLE TRE STEDER: listen over gemte designs, genbestillingen
 * og "genbrug et design" på standersiden. Skrevet tre gange ville det ene
 * blive rettet og de to andre stå tilbage — præcis som farveprøven gjorde.
 *
 * DEN OVERSÆTTER KUN EN DESIGNRÆKKE til `SkiltPreview`s sprog. Selve
 * tegningen sker dér, og skiltet hentes fra `/api/skilt` — samme funktion, som
 * laver trykfilen. Previewet kan derfor ikke vise noget andet, end der bliver
 * trykt.
 *
 * ACCENTEN SKAL MED FRA DATABASEN. Udelades `accent_hex`, falder previewet
 * tilbage på LoyalSums egen turkis, og en butik, der har valgt sin egen farve
 * på stjernerne, ville få vist et skilt, der ikke er deres. Derfor er feltet
 * ikke valgfrit i typen her: så kan et kaldested ikke glemme at hente det.
 */
export function DesignPreview({
  design,
  className,
  loading = "lazy",
}: {
  design: {
    stander_farve: StanderFarve;
    front_type: FrontType;
    front_hex: string | null;
    accent_hex: string | null;
    logo_url: string | null;
  };
  className?: string;
  /**
   * `lazy` som standard: skabelonen er over 160 KB, og en liste med seks
   * designs må ikke hente et halvt megabyte, før nogen har rullet ned til dem.
   */
  loading?: "lazy" | "eager";
}) {
  const front = designFrontfarve(design);

  return (
    <SkiltPreview
      standerFarve={design.stander_farve}
      /*
       * `null` betyder "standerens egen farve" — og det er IKKE det samme som
       * at sende `front.hex` med altid. Sendte vi den, ville et design uden
       * egen frontfarve låse baggrunden til den udregnede værdi, og en senere
       * ændring af standerfarvernes hex ville ikke slå igennem.
       */
      baggrund={front.egen ? front.hex : null}
      accent={design.accent_hex}
      logoUrl={design.logo_url}
      loading={loading}
      className={className}
    />
  );
}
