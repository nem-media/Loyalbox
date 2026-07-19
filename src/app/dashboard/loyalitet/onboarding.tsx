import { ButtonLink } from "@/components/ui/button";
import { Card, CardBody } from "@/components/ui/card";
import { PROGRAM_TEMPLATES } from "@/lib/loyalty/constants";

const STEPS = [
  "Opret dit stempelkort",
  "Vælg belønning",
  "Del QR-kode eller brug din stander",
  "Giv stempler",
  "Følg resultaterne",
];

/** Vises første gang, før der findes et stempelkort (spec §21). */
export function LoyaltyOnboarding() {
  return (
    <Card>
      <CardBody className="py-8">
        <div className="mx-auto max-w-xl text-center">
          <h2 className="text-xl font-bold tracking-tight">
            Sådan virker LoyalBox Stempelkort
          </h2>
          <p className="mt-2 text-sm text-muted">
            Kom i gang på få minutter. Giv dine kunder en grund til at komme igen.
          </p>

          <ol className="mx-auto mt-6 max-w-sm space-y-2 text-left">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-center gap-3">
                <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-accent text-sm font-semibold text-accent-fg">
                  {i + 1}
                </span>
                <span className="text-sm">{s}</span>
              </li>
            ))}
          </ol>

          <div className="mt-6">
            <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted">
              Skabeloner
            </p>
            <div className="flex flex-wrap justify-center gap-2">
              {PROGRAM_TEMPLATES.map((t) => (
                <span
                  key={t.key}
                  className="box-shape border border-border bg-muted-bg/40 px-3 py-1.5 text-xs"
                  title={t.hint}
                >
                  {t.label}: {t.hint}
                </span>
              ))}
            </div>
          </div>

          <div className="mt-8">
            <ButtonLink href="/dashboard/loyalitet/programmer/nyt" size="lg">
              Opret dit første stempelkort
            </ButtonLink>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
