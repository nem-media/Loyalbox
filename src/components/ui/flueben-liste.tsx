/**
 * Flueben-liste: punkter, kunden skal kunne skimme.
 *
 * Ikonet er `aria-hidden` og listen et almindeligt `<ul>` — fluebenet er
 * dekoration, og betydningen ligger i teksten ved siden af. Samme regel som
 * brancheikonerne: et alt-lignende navn ville få skærmlæseren til at sige
 * "flueben" fem gange i træk uden at tilføje noget.
 *
 * Ligger i `ui/`, fordi den bruges både på katalogkortene og på
 * produktsiderne — der stod før en kopi af ikonet i hver fil.
 */

export function FluebenIkon({ className = "" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`mt-0.5 h-4 w-4 shrink-0 text-accent ${className}`}
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M16.7 5.3a1 1 0 0 1 0 1.4l-7.5 7.5a1 1 0 0 1-1.4 0L3.3 9.7a1 1 0 1 1 1.4-1.4l3.3 3.3 6.8-6.8a1 1 0 0 1 1.4 0Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

export function FluebenListe({
  punkter,
  className = "",
  tekstKlasse = "text-sm",
}: {
  punkter: readonly string[];
  className?: string;
  /** `text-sm` på produktsiden, `text-xs` hvor kortet skal kunne skimmes. */
  tekstKlasse?: string;
}) {
  return (
    <ul className={`space-y-2 ${tekstKlasse} ${className}`}>
      {punkter.map((p) => (
        <li key={p} className="flex gap-2">
          <FluebenIkon />
          <span className="leading-relaxed">{p}</span>
        </li>
      ))}
    </ul>
  );
}
