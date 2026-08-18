import { COMPANY, mangler } from "@/lib/constants";

/**
 * Fælles byggeklodser til handelsbetingelser og privatlivspolitik.
 *
 * De to sider er lange og ensartede — uden disse ville hver overskrift og
 * hvert afsnit få sine egne klasser, og de to sider ville langsomt glide fra
 * hinanden i udseende.
 */

export function LegalSection({
  id,
  title,
  children,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="mt-10 scroll-mt-24">
      <h2 className="text-lg font-bold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 leading-relaxed text-muted">{children}</div>
    </section>
  );
}

/**
 * Viser en manglende oplysning som en synlig markering frem for tom plads.
 *
 * Et tomt CVR-felt ligner en designfejl og bliver overset; en gul markering
 * gør det umuligt at sende siden live uden at opdage det.
 */
export function Udfyld({ hvad }: { hvad: string }) {
  return (
    <mark className="rounded bg-secondary/30 px-1.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-foreground">
      udfyld: {hvad}
    </mark>
  );
}

/** Selskabets fulde oplysninger, som de skal fremgå efter e-handelsloven. */
export function CompanyDetails() {
  return (
    <address className="not-italic">
      {COMPANY.legalName}
      <br />
      {mangler(COMPANY.address) ? (
        <Udfyld hvad="adresse" />
      ) : (
        `${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}`
      )}
      <br />
      CVR: {mangler(COMPANY.cvr) ? <Udfyld hvad="CVR-nummer" /> : COMPANY.cvr}
      <br />
      E-mail:{" "}
      <a href={`mailto:${COMPANY.email}`} className="font-medium text-accent">
        {COMPANY.email}
      </a>
      {COMPANY.phone ? (
        <>
          <br />
          Telefon: {COMPANY.phone}
        </>
      ) : null}
    </address>
  );
}
