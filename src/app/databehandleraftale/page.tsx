import type { Metadata } from "next";
import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { LegalSection, CompanyDetails, Udfyld } from "@/components/legal";
import { getCurrentUser } from "@/lib/auth";
import { COMPANY, SITE_NAME } from "@/lib/constants";
import {
  DPA_SECTIONS,
  DPA_VERSION,
  DPA_DATE,
  DPA_UDFYLD,
  SUBPROCESSORS,
} from "@/lib/dpa";
import { formatDate } from "@/lib/utils";

const title = "Databehandleraftale";
const description =
  "Aftale om LoyalSums behandling af personoplysninger på vegne af butikken — roller, sikkerhed, underdatabehandlere og sletning.";

export const metadata: Metadata = {
  title,
  description,
  alternates: { canonical: "/databehandleraftale" },
};

/**
 * Databehandleraftalen som en side frem for et vedhæftet dokument.
 *
 * Den skal kunne læses før købet, findes igen bagefter, og altid være den
 * gældende version. Et dokument sendt på mail ville ligge i én indbakke i én
 * udgave, og ingen ville vide, om det stadig var det rigtige.
 *
 * Er butiksejeren logget ind, udfyldes deres virksomhed som dataansvarlig, og
 * accepten vises med dato og version.
 */
export default async function DpaPage() {
  const user = await getCurrentUser();
  const company = user?.company ?? null;

  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-4 py-12 sm:py-16">
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
          {title}
        </h1>
        <p className="mt-3 leading-relaxed text-muted">
          Version {DPA_VERSION} · gældende fra {DPA_DATE}. Aftalen indgås
          automatisk, når du køber et produkt, hvor {SITE_NAME} behandler
          oplysninger om dine kunder.
        </p>

        <div className="box-shape mt-6 border border-border bg-muted-bg p-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">
            Parterne
          </h2>
          <div className="mt-3 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-sm font-medium">Dataansvarlig</p>
              <p className="mt-1 text-sm text-muted">
                {company ? (
                  <>
                    {company.name}
                    {company.contact_email ? (
                      <>
                        <br />
                        {company.contact_email}
                      </>
                    ) : null}
                  </>
                ) : (
                  "Din virksomhed — log ind for at se aftalen med dine egne oplysninger."
                )}
              </p>
            </div>
            <div>
              <p className="text-sm font-medium">Databehandler</p>
              <div className="mt-1 text-sm text-muted">
                <CompanyDetails />
              </div>
            </div>
          </div>

          {company?.dpa_accepted_at ? (
            <p className="mt-4 border-t border-border pt-3 text-sm text-accent">
              Accepteret {formatDate(company.dpa_accepted_at)}
              {company.dpa_version ? ` (version ${company.dpa_version})` : null}.
            </p>
          ) : null}
        </div>

        {DPA_SECTIONS.map((s) => (
          <LegalSection key={s.id} id={s.id} title={s.title}>
            {s.paragraphs.map((p) => (
              <p key={p}>{p}</p>
            ))}
            {s.list ? (
              <ul className="space-y-1.5">
                {s.list.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            ) : null}

            {s.id === "underdatabehandlere" ? (
              <div className="overflow-x-auto">
                <table className="mt-2 w-full border-collapse text-sm">
                  <thead>
                    <tr className="border-b border-border text-left">
                      <th className="py-2 pr-3 font-semibold">Leverandør</th>
                      <th className="py-2 pr-3 font-semibold">Formål</th>
                      <th className="py-2 font-semibold">Behandles i</th>
                    </tr>
                  </thead>
                  <tbody>
                    {SUBPROCESSORS.map((sp) => (
                      <tr key={sp.name} className="border-b border-border/60">
                        <td className="py-2 pr-3 align-top font-medium text-foreground">
                          {sp.name}
                        </td>
                        <td className="py-2 pr-3 align-top">{sp.purpose}</td>
                        <td className="py-2 align-top">
                          {sp.location === DPA_UDFYLD ? (
                            <Udfyld hvad="region" />
                          ) : (
                            sp.location
                          )}
                          {sp.note ? (
                            <span className="mt-1 block text-xs">{sp.note}</span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </LegalSection>
        ))}

        <div className="mt-12 border-t border-border pt-6 text-sm text-muted">
          Se også{" "}
          <Link href="/handelsbetingelser" className="font-medium text-accent">
            handelsbetingelserne
          </Link>{" "}
          og{" "}
          <Link href="/privatliv" className="font-medium text-accent">
            privatlivspolitikken
          </Link>
          . Spørgsmål sendes til{" "}
          <a
            href={`mailto:${COMPANY.email}`}
            className="font-medium text-accent"
          >
            {COMPANY.email}
          </a>
          .
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
