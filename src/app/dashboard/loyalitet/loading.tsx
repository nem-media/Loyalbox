import { SkeletStatGitter, SkeletKort, Skelet } from "@/components/ui/skelet";

/**
 * Sidens skelet, mens serveren henter.
 *
 * Next viser den her, indtil `page.tsx` er klar. Formen følger sidens
 * FAKTISKE opbygning — sidehoved, periodevælger, nøgletal, indhold — så
 * intet hopper, når tallene lander. Kommer der en række kort mere på siden,
 * skal den med her; et skelet, der ikke passer, flytter siden i det øjeblik,
 * indholdet kommer.
 */
export default function Loading() {
  return (
    <div>
      <div className="mb-7 border-b border-border pb-6">
        <Skelet className="h-7 w-64" />
        <Skelet className="mt-3 h-3.5 w-96 max-w-full" />
      </div>
      <Skelet className="mb-6 h-11 w-72 max-w-full" />
      <SkeletStatGitter />
      <SkeletKort className="mt-6" linjer={4} />
    </div>
  );
}
