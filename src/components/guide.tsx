import Link from "next/link";
import { Card, CardBody } from "@/components/ui/card";
import { ButtonLink } from "@/components/ui/button";
import { getGuide, type Guide, type GuideStep } from "@/lib/guides";

/**
 * Visning af vejledninger.
 *
 * To former, samme kilde: `GuideCard` er den fulde vejledning på hjælpesiden,
 * `GuideHint` er den korte hjælp ude på den enkelte side. Begge henter teksten
 * fra src/lib/guides.ts, så de ikke kan komme til at sige hver sit.
 */

function stepText(step: GuideStep): string {
  return typeof step === "string" ? step : step.text;
}

export function GuideCard({ guide }: { guide: Guide }) {
  return (
    // scroll-mt sørger for, at overskriften ikke gemmer sig under toppen,
    // når man lander via et anker fra en anden side.
    <Card id={guide.id} className="scroll-mt-6">
      <CardBody className="space-y-4">
        <div>
          <h2 className="font-bold tracking-tight">{guide.title}</h2>
          <p className="mt-1 text-sm text-muted">{guide.summary}</p>
        </div>

        <ol className="space-y-2.5">
          {guide.steps.map((step, i) => {
            const text = stepText(step);
            const items = typeof step === "string" ? null : step.items;
            return (
              <li key={text} className="flex gap-3 text-sm leading-relaxed">
                <span
                  aria-hidden="true"
                  className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-accent/10 text-xs font-semibold text-accent"
                >
                  {i + 1}
                </span>
                <div>
                  <span>{text}</span>
                  {items ? (
                    <ul className="mt-1.5 space-y-1">
                      {items.map((item) => (
                        <li key={item} className="text-muted">
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ol>

        {guide.notes?.length ? (
          <div className="box-shape border border-border bg-muted-bg p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted">
              Godt at vide
            </p>
            <ul className="mt-2 space-y-1.5">
              {guide.notes.map((note) => (
                <li key={note} className="text-sm leading-relaxed text-muted">
                  {note}
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        {guide.href ? (
          <ButtonLink href={guide.href} variant="outline" size="sm">
            {guide.hrefLabel ?? "Gå til siden"}
          </ButtonLink>
        ) : null}
      </CardBody>
    </Card>
  );
}

/**
 * Kort hjælp inde på en side, med et link til den fulde vejledning.
 *
 * Den sidder bevidst tæt på handlingen — en vejledning, man skal lede efter,
 * bliver ikke læst af den, der står med problemet lige nu.
 */
export function GuideHint({
  id,
  className,
}: {
  id: string;
  className?: string;
}) {
  const guide = getGuide(id);
  if (!guide) return null;

  return (
    <p className={`text-sm text-muted ${className ?? ""}`}>
      {guide.hint ?? guide.summary}{" "}
      <Link
        href={`/dashboard/hjaelp#${guide.id}`}
        className="font-medium text-accent hover:underline"
      >
        Se vejledningen
      </Link>
    </p>
  );
}
