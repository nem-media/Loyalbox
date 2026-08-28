import { cn } from "@/lib/utils";

const fieldBase =
  "box-shape w-full border border-border bg-background px-3 text-sm placeholder:text-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:border-accent";

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
    <div>
      <Label>{label}</Label>
      {children}
      {fejl ? (
        <p role="alert" className="mt-1 text-xs font-medium text-danger">
          {fejl}
        </p>
      ) : hint ? (
        <p className="mt-1 text-xs text-muted">{hint}</p>
      ) : null}
    </div>
  );
}
