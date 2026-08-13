const STEPS = [
  {
    label: "Bliv fundet",
    body: "Flere anmeldelser og løbende synlighed hjælper nye kunder med at opdage og vælge din forretning.",
  },
  {
    label: "Forstå oplevelsen",
    body: "Kunderne deler nemt deres oplevelse — offentligt eller privat til dig, så du kan følge op.",
  },
  {
    label: "Få dem tilbage",
    body: "Digitale stempelkort, belønninger og tilbud giver kunderne en grund til at komme igen.",
  },
  {
    label: "Voks videre",
    body: "Opslag og indsigt holder dig synlig og viser dig, hvad der rent faktisk virker.",
  },
];

function Arrow({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

/**
 * LoyalSum-loopet: fire trin der hænger sammen i en cyklus, ikke fire løsrevne
 * features. Sidste trin peger visuelt tilbage til det første — det er hele
 * pointen med sektionen.
 */
export function LoyalsumLoop() {
  return (
    <div>
      <ol className="grid gap-5 md:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.label} className="relative">
            <div className="box-shape h-full border border-border bg-card p-6">
              <div className="flex items-center gap-2">
                <span className="grid h-8 w-8 place-items-center rounded-full bg-accent text-sm font-bold text-accent-fg">
                  {i + 1}
                </span>
                <h3 className="text-base font-bold tracking-tight">{s.label}</h3>
              </div>
              <p className="mt-3 text-sm text-muted">{s.body}</p>
            </div>

            {/* Pil til næste trin — vandret på desktop, lodret på mobil */}
            {i < STEPS.length - 1 ? (
              <>
                <Arrow className="absolute -right-4 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-accent/50 md:block" />
                <Arrow className="mx-auto mt-3 h-5 w-5 rotate-90 text-accent/50 md:hidden" />
              </>
            ) : null}
          </li>
        ))}
      </ol>

      {/* Loop-tilbagemelding: trin 4 fører tilbage til trin 1 */}
      <div className="mt-6 flex items-center gap-3 rounded-full border border-accent/25 bg-accent/5 px-5 py-3">
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          className="h-5 w-5 shrink-0 text-accent"
          aria-hidden="true"
        >
          <path d="M3 12a9 9 0 0 1 15.3-6.4L21 8" />
          <path d="M21 3v5h-5" />
          <path d="M21 12a9 9 0 0 1-15.3 6.4L3 16" />
          <path d="M3 21v-5h5" />
        </svg>
        <p className="text-sm text-foreground/80">
          <span className="font-semibold">Og så forfra:</span> flere gode
          oplevelser giver flere anmeldelser og mere synlighed — som sender nye
          kunder ind ad døren igen.
        </p>
      </div>
    </div>
  );
}
