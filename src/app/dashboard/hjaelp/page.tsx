import Link from "next/link";
import { PageHeader } from "@/components/dashboard-shell";
import { GuideCard } from "@/components/guide";
import { Card, CardBody } from "@/components/ui/card";
import { GUIDES } from "@/lib/guides";
import { COMPANY, getProduct, hasLoyaltyAccess } from "@/lib/constants";
import { getCurrentUser } from "@/lib/auth";
import { harAbonnement } from "@/lib/abonnement";

/** Navnet hentes fra kataloget, så mærkatet ikke kan drive fra varen. */
const KOMPLET_NAVN = getProduct("loyalsum-komplet")?.name ?? "Komplet";

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
export default async function HelpPage() {
  const user = await getCurrentUser();
  const company = user?.company ?? null;
  const abonnement = harAbonnement(company);
  const komplet = hasLoyaltyAccess(company?.product_slug);

  /*
   * DELT I "DINE" OG "FØLGER MED", ikke filtreret.
   *
   * Siden viste alle vejledninger til alle. En konto uden abonnement mødte
   * en liste over ting, den ikke kunne gøre — og den første bad om at
   * "oprette din første stander under Standere", som er spærret.
   *
   * At skjule dem ville efterlade en næsten tom side og fjerne det eneste
   * sted, man kan se, hvad et abonnement egentlig giver. De står derfor
   * stadig, men i en gruppe der siger hvad de kræver. Det er samme valg som
   * i menuen, hvor Stempelkort og Opslag bliver stående med et opsalg.
   */
  const kan = (g: (typeof GUIDES)[number]) =>
    g.kraever === "komplet" ? komplet : g.kraever ? abonnement : true;

  const mine = GUIDES.filter(kan);
  const laaste = GUIDES.filter((g) => !kan(g));

  return (
    <>
      <PageHeader
        title="Hjælp"
        description="Sådan bruger du LoyalSum — trin for trin."
      />

      <nav aria-label="Genveje" className="mb-6 flex flex-wrap gap-2">
        {mine.map((g) => (
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
        {mine.map((g) => (
          <GuideCard key={g.id} guide={g} />
        ))}
      </div>

      {laaste.length ? (
        <div className="mt-10">
          <h2 className="text-lg font-bold tracking-tight">
            Følger med et abonnement
          </h2>
          <p className="mt-1 max-w-2xl text-sm leading-relaxed text-muted">
            Vejledningerne står her, så du kan se, hvad der venter. Du kan ikke
            følge dem endnu.
          </p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {laaste.map((g) => (
              <li
                key={g.id}
                className="box-shape border border-border bg-card p-4"
              >
                <div className="flex items-baseline justify-between gap-3">
                  <p className="font-semibold tracking-tight">{g.title}</p>
                  <span className="etiket shrink-0">
                    {g.kraever === "komplet" ? KOMPLET_NAVN : "Abonnement"}
                  </span>
                </div>
                <p className="mt-1 text-sm leading-relaxed text-muted">
                  {g.summary}
                </p>
              </li>
            ))}
          </ul>
          <p className="mt-4 text-sm">
            <Link
              href="/dashboard/abonnement"
              className="font-medium text-accent hover:underline"
            >
              Se dit abonnement →
            </Link>
          </p>
        </div>
      ) : null}

      <Card className="mt-6">
        <CardBody>
          <h2 className="font-bold tracking-tight">
            Står du stadig og mangler noget?
          </h2>
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
