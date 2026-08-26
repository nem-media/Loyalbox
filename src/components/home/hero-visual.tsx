import { Stars } from "@/components/ui/stars";
import { cn } from "@/lib/utils";

/**
 * Kundens stempelkort, tegnet.
 *
 * EGEN KOMPONENT, fordi den bruges to steder: i forsidens hero med
 * notifikationerne omkring, og på `/stempelkort` uden dem. Kopieret ind ét
 * sted mere ville betyde, at et rettet kort kun blev rettet det ene sted —
 * samme regel som brancheikonerne.
 *
 * Den er DEKORATION og `aria-hidden`: overskriften ved siden af bærer
 * betydningen, og en skærmlæser skal ikke læse ti tal op.
 *
 * Bemærk `text-foreground`: begge brugssteder er mørke sektioner, der sætter
 * hvid tekst, og uden den arves hvid ned i det hvide kort.
 */
export function StempelkortVisual({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "box-shape select-none border border-white/10 bg-white p-6 text-foreground shadow-[0_40px_80px_-30px_rgba(0,0,0,0.65)]",
        className,
      )}
    >
      <div className="flex items-center gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-xl bg-dark text-sm font-bold text-white">
          CA
        </span>
        <div>
          <p className="text-sm font-bold tracking-tight">Café Aurora</p>
          <p className="text-xs text-muted">Dit stempelkort</p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-5 gap-2">
        {Array.from({ length: 10 }).map((_, i) => {
          const filled = i < 7;
          return (
            <div
              key={i}
              className={
                filled
                  ? "grid aspect-square place-items-center rounded-full bg-accent text-[11px] font-bold text-accent-fg"
                  : "grid aspect-square place-items-center rounded-full border border-border text-[11px] font-medium text-muted"
              }
            >
              {filled ? "★" : i + 1}
            </div>
          );
        })}
      </div>

      <div className="mt-5 flex items-center justify-between">
        <span className="text-xs text-muted">7 af 10 stempler</span>
        <span className="rounded-full bg-accent/10 px-2.5 py-1 text-xs font-medium text-accent">
          Gratis kaffe
        </span>
      </div>
    </div>
  );
}

/**
 * Hero-visualisering af HELE platformen — ikke af standeren.
 *
 * Kompositionen er bevidst holdt til ét hovedelement (kundens kort) med to
 * små notifikationer omkring. Det skal aflæses på et sekund som "anmeldelser
 * + loyalitet i ét system", uden at blive et rodet collage.
 */
export function HeroVisual() {
  return (
    <div
      className="relative mx-auto w-full max-w-[22rem] select-none"
      aria-hidden="true"
    >
      <StempelkortVisual />

      {/* Notifikation: ny anmeldelse */}
      <div className="absolute -right-3 -top-5 sm:-right-8">
        {/* text-foreground er nødvendig: heroen sætter text-dark-fg (hvid),
            som ellers arves ned i den hvide chip og gør teksten usynlig. */}
        <div className="btn-shape flex items-center gap-2 bg-white px-3 py-2 text-foreground shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)]">
          <Stars value={5} size={13} />
          <span className="text-xs font-semibold tracking-tight">
            Ny anmeldelse
          </span>
        </div>
      </div>

      {/* Notifikation: feedback fanget internt */}
      <div className="absolute -bottom-6 -left-3 sm:-left-10">
        <div className="btn-shape flex items-center gap-2 bg-dark px-3 py-2 text-white ring-1 ring-white/15 shadow-[0_16px_32px_-16px_rgba(0,0,0,0.6)]">
          <span className="grid h-5 w-5 place-items-center rounded-full bg-secondary text-[11px] font-bold text-secondary-fg">
            !
          </span>
          <span className="text-xs font-medium">Feedback besvaret</span>
        </div>
      </div>
    </div>
  );
}
