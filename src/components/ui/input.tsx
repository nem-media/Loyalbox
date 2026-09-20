import { cn } from "@/lib/utils";

/*
 * FELTET SKAL SE UD SOM NOGET, MAN KAN SKRIVE I.
 *
 * `kontrol-shape` og ikke `box-shape` eller `btn-shape`: et felt er 44 px
 * højt, så kortenes store radius ville æde hele siden af det — og knappens
 * PILLE ville gøre feltet til noget, man trykker på, med markøren klemt inde
 * i en rund ende. Kontrollerne har derfor deres eget trin i formfamilien;
 * se `--radius-kontrol` i globals.css.
 *
 * Den indadgående skygge er en enkelt streg i toppen på 3 %. Den er dét, der
 * gør forskellen på en hvid firkant med en kant om og et felt, der ligger en
 * anelse NED i fladen — og den koster ingenting i kontrast, fordi den ikke
 * rører teksten.
 *
 * FOKUS ER UÆNDRET I STYRKE: to px accentring plus accentkant. Ringen er dér,
 * tastaturbrugeren orienterer sig efter, og den må ikke blive diskret, fordi
 * resten blev det.
 */
const fieldBase =
  "kontrol-shape w-full border border-border bg-background px-3.5 text-sm shadow-[inset_0_1px_2px_rgba(30,28,26,0.03)] transition-colors placeholder:text-muted hover:border-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent";

export function Input({
  className,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn(fieldBase, "h-11", className)} {...props} />;
}

export function Textarea({
  className,
  ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return (
    <textarea className={cn(fieldBase, "min-h-24 py-2.5", className)} {...props} />
  );
}

export function Label({
  className,
  ...props
}: React.LabelHTMLAttributes<HTMLLabelElement>) {
  return (
    <label
      className={cn("mb-1.5 block text-sm font-medium", className)}
      {...props}
    />
  );
}

/**
 * Etiket, felt og en linje nedenunder.
 *
 * `fejl` OG `hint` ER IKKE DET SAMME, og det var de før.
 *
 * Serverens afvisninger blev sendt ind som `hint` og tegnet i `text-muted` —
 * altså nøjagtig samme grå småtekst som hjælpelinjen, der i forvejen stod
 * dér. På e-mailfeltet ERSTATTEDE fejlen endda hjælpeteksten i samme stil og
 * på samme plads. Resultatet: en bestilling, serveren havde afvist, så ud
 * som om der ikke var sket noget. Man trykker "Gå til betaling", siden bliver
 * stående, og der er ingenting at få øje på.
 *
 * `fejl` vinder over `hint`, står i rødt og har `role="alert"`, så en
 * skærmlæser siger den uden at man skal lede efter den.
 *
 * ETIKETTEN OMSLUTTER FELTET — DEN STOD FØR VED SIDEN AF DET.
 *
 * `<Label>` og feltet var søskende, uden `htmlFor` og uden omslutning. Visuelt
 * så det rigtigt ud, og derfor kunne det stå: etiketten stod jo lige over.
 * Programmatisk var de ikke forbundet, og det koster to ting.
 *
 * MÅLT PÅ TILMELDINGSSIDEN 2026-09-16 — den formular, hver eneste slutkunde
 * møder: `name` og `email` havde kun en `placeholder` at give en skærmlæser,
 * og **`phone` havde ingenting overhovedet**. Feltet blev annonceret uden
 * navn. En pladsholder er heller ikke en etiket: den forsvinder, så snart der
 * skrives i feltet, og den er netop væk, når man vil kontrollere, hvad man
 * udfyldte.
 *
 * Og det rammer alle: et klik på etiketten satte ikke markøren i feltet.
 * Etiketten er et større trykmål end feltet på en telefon, og det er dér
 * kunderne er.
 *
 * DER ER 90 `Field` i tyve filer, og hver eneste har præcis ÉN kontrol
 * indeni — efterprøvet — så en omsluttende etiket er sikker hele vejen rundt
 * og kræver ingen id'er, der kan komme i utakt.
 *
 * TILBAGE STÅR: `hint` og `fejl` er ikke bundet til feltet med
 * `aria-describedby`, og feltet får ikke `aria-invalid` ved en fejl. Det ville
 * kræve, at `Field` klonede sit barn for at sætte attributter på det, og dét
 * er skrøbeligt med vilkårlige børn. Fejlen siges i forvejen af sig selv via
 * `role="alert"`.
 */
export function Field({
  label,
  hint,
  fejl,
  children,
}: {
  label: string;
  hint?: string;
  /** Serverens afvisning. Vises i stedet for `hint` og i rødt. */
  fejl?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      {/* Teksten bærer etikettens udseende; selve <label> er nu beholderen. */}
      <span className="mb-1.5 block text-sm font-medium">{label}</span>
      {children}
      {fejl ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {fejl}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </label>
  );
}
