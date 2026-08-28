import { IkonChip } from "@/components/ui/ikon-chip";

/**
 * Et navngivet felt i en lang formular.
 *
 * HVORFOR DEN FINDES: bestillingen var otte ens hvide kasser i en stak. Hver
 * havde en overskrift i samme størrelse og vægt som feltnavnene inde i den,
 * så der var ingen forskel på "her begynder noget nyt" og "her er endnu et
 * felt". Siden så ud som ét langt spørgeskema, og man kunne ikke se, hvor
 * langt man var.
 *
 * IKONET ER DET SAMME GREB SOM I PANELET (se `IkonChip`): en tonet cirkel,
 * der giver overskriften noget at hvile på og genbruger menuens ikonsprog.
 * Det er `aria-hidden` — betydningen står i overskriften ved siden af.
 *
 * BRUG DET KUN PÅ RIGTIGE SEKTIONER. Sættes et ikon på hvert felt, holder
 * det op med at betyde noget; det er samme regel som `CardTitle icon=` i
 * dashboardet.
 */
export function FormSektion({
  titel,
  beskrivelse,
  icon,
  children,
  fodnote,
}: {
  titel: string;
  /** Én linje under overskriften. Udelad, hvis felterne taler for sig selv. */
  beskrivelse?: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  /** Det med småt, der hører til hele sektionen — står under indholdet. */
  fodnote?: React.ReactNode;
}) {
  return (
    <section className="box-shape border border-border bg-card">
      <header className="flex items-start gap-3 border-b border-border px-5 py-4">
        <IkonChip icon={icon} />
        <div className="min-w-0">
          <h2 className="text-base font-semibold tracking-tight">{titel}</h2>
          {beskrivelse ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted">
              {beskrivelse}
            </p>
          ) : null}
        </div>
      </header>

      <div className="px-5 py-4">{children}</div>

      {fodnote ? (
        <p className="border-t border-border bg-muted-bg px-5 py-3 text-xs leading-relaxed text-muted">
          {fodnote}
        </p>
      ) : null}
    </section>
  );
}

/**
 * En række inde i en sektion — til et tilvalg, der før havde sin egen kasse.
 *
 * De to farvetilvalg lå som hver sin hvide boks i stakken og fyldte lige så
 * meget som "Din virksomhed" med tre felter i. Som rækker med en hårfin
 * streg imellem får de den vægt, de har: to afkrydsninger.
 */
export function TilvalgRaekke({
  id,
  checked,
  onChange,
  navn,
  pris,
  gratis = false,
  forklaring,
  /** Vises til højre, når tilvalget er slået fra — så farven kan ses uden at folde ud. */
  proeve,
  children,
  name,
}: {
  id: string;
  checked: boolean;
  onChange: (v: boolean) => void;
  navn: string;
  pris: string;
  /**
   * Er tilvalget uden beregning?
   *
   * PRISEN FÅR KUN ACCENTFARVE, NÅR DER ER EN PRIS. "uden beregning" i
   * petroleum læste som et beløb — eller et link — og trak øjet hen til det
   * ene af de to tilvalg, der IKKE koster noget.
   */
  gratis?: boolean;
  forklaring: string;
  proeve?: string;
  children?: React.ReactNode;
  /** Sættes kun, når serveren skal læse afkrydsningen. */
  name?: string;
}) {
  return (
    <div className="py-4 first:pt-0 last:pb-0">
      <div className="flex items-start gap-3">
        <input
          id={id}
          type="checkbox"
          name={name}
          value="1"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 accent-accent"
        />
        <label htmlFor={id} className="min-w-0 flex-1 text-sm leading-relaxed">
          <span className="font-medium">{navn}</span>{" "}
          <span className={gratis ? "text-muted" : "font-medium text-accent"}>
            {pris}
          </span>
          <span className="mt-0.5 block text-xs leading-relaxed text-muted">
            {forklaring}
          </span>
        </label>
        {proeve && !checked ? (
          <span
            aria-hidden="true"
            className="mt-0.5 h-6 w-6 shrink-0 rounded-full border border-border"
            style={{ background: proeve }}
          />
        ) : null}
      </div>
      {checked ? children : null}
    </div>
  );
}
