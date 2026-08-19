import Link from "next/link";
import { PageHeader } from "@/components/dashboard-shell";
import { GuideCard } from "@/components/guide";
import { Card, CardBody } from "@/components/ui/card";
import { GUIDES } from "@/lib/guides";
import { COMPANY } from "@/lib/constants";

export const metadata = { title: "Hjælp" };

/**
 * Samlet hjælpeside.
 *
 * Produktet sælges til lokale forretninger uden teknisk personale — en
 * café-ejer skal kunne sætte et stempelkort op uden at ringe til nogen.
 * Vejledningerne står derfor i panelet, hvor arbejdet foregår, og ikke i en
 * manual et andet sted.
 *
 * Hvert afsnit har sit eget anker, så hjælpen ude på siderne kan linke direkte
 * til lige netop det, brugeren stod og manglede.
 */
export default function HelpPage() {
  return (
    <>
      <PageHeader
        title="Hjælp"
        description="Sådan bruger du LoyalSum — trin for trin."
      />

      <nav aria-label="Genveje" className="mb-6 flex flex-wrap gap-2">
        {GUIDES.map((g) => (
          <Link
            key={g.id}
            href={`#${g.id}`}
            className="box-shape border border-border px-3 py-1.5 text-sm hover:bg-muted-bg"
          >
            {g.title}
          </Link>
        ))}
      </nav>

      <div className="space-y-4">
        {GUIDES.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </div>

      <Card className="mt-6">
        <CardBody>
          <h2 className="font-bold tracking-tight">Står du stadig og mangler noget?</h2>
          <p className="mt-1 text-sm text-muted">
            Skriv til os på{" "}
            <a
              href={`mailto:${COMPANY.email}`}
              className="font-medium text-accent hover:underline"
            >
              {COMPANY.email}
            </a>
            , så hjælper vi dig i gang. Fortæl gerne hvilken side du står på —
            så kan vi svare konkret.
          </p>
        </CardBody>
      </Card>
    </>
  );
}
