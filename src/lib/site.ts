export function getSiteUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") ||
    "http://localhost:3000"
  );
}

export function reviewUrl(slug: string): string {
  return `${getSiteUrl()}/r/${slug}`;
}

/**
 * Metadata til sider, der aldrig må stå i et søgeresultat.
 *
 * TO SLAGS SIDER BRUGER DEN, og af to forskellige grunde:
 *
 * 1. LOGIN OG OPRETTELSE har ingen søgeværdi. De kan ikke besvare noget,
 *    nogen søger på, og de bruger crawl-budget, der hører til artiklerne.
 *    `/login` og `/signup` var faktisk indekseret.
 *
 * 2. KORT, MINE KORT OG PERSONALE viser personoplysninger. `/kort/<token>`
 *    er en hemmelig adresse med en kundes navn og stempelsaldo, og den var
 *    hverken i robots.txt eller markeret her. Slap adressen ud — i en
 *    henvisning, et delt skærmbillede, en mail — kunne den indekseres.
 *
 * BEVIDST IKKE I robots.txt: en side, der er spærret for crawl, kan Google
 * ikke læse en noindex på. De to allerede indekserede sider ville derfor
 * BLIVE i indekset. Crawl skal være tilladt, præcis så robotten kan se,
 * at den ikke må indeksere.
 */
export const PRIVAT_SIDE = {
  robots: { index: false, follow: false },
} as const;

/**
 * Logoet til `Organization.logo` i strukturdata.
 *
 * EGEN FIL OG IKKE HEADERENS LOGO. Google beskærer et logo til noget nær
 * kvadratisk, og det brede ordmærke (1450×340) ville miste enderne. Denne er
 * 1250×1250 med stjernen over navnet, så den tåler beskæringen.
 *
 * Stien står HER og ikke i de to sider, der bruger den. Da den var skrevet af
 * to steder, kunne den ene blive opdateret og den anden blive stående — og en
 * strukturdatafejl ses ikke på siden, kun i Search Console uger senere.
 */
export function organisationsLogo() {
  return {
    "@type": "ImageObject" as const,
    url: `${getSiteUrl()}/loyalsum-organization.png`,
    width: 1250,
    height: 1250,
  };
}

/**
 * En dato som `2026-07-29` bliver til et tidspunkt MED tidszone.
 *
 * HVORFOR: Rich Results Test kalder en ren dato "ugyldig datetime-værdi" og
 * savner en tidszone i både `datePublished` og `dateModified`. Ikke-kritisk,
 * men det er fire af de fem problemer, testen fandt på artiklerne — og en
 * dato uden zone lader Google gætte, hvilket døgn artiklen hører til.
 *
 * KLOKKEN 9 OG IKKE MIDNAT, og det er den eneste rigtigt vigtige detalje her:
 * midnat dansk sommertid er 22.00 UTC DAGEN FØR. Læses tidspunktet i UTC —
 * og det gør flere værktøjer — ville artiklen fremstå udgivet et døgn for
 * tidligt, og rækkefølgen mellem to artikler med en dags mellemrum kunne
 * bytte plads. Klokken 9 lokal tid er 7.00 UTC samme dag, uanset årstid.
 *
 * Offsettet REGNES og hardkodes ikke: Danmark er +01.00 om vinteren og
 * +02.00 om sommeren, og artiklerne ligger på begge sider af skiftet.
 */
export function isoTidspunkt(dato: string): string {
  // Midt på dagen i UTC, så opslaget lander på den rigtige dato uanset zone.
  const d = new Date(`${dato}T12:00:00Z`);
  const zone = new Intl.DateTimeFormat("en-US", {
    timeZone: "Europe/Copenhagen",
    timeZoneName: "longOffset",
  })
    .formatToParts(d)
    .find((p) => p.type === "timeZoneName")?.value;

  // "GMT+02:00" → "+02:00". Falder tilbage til normaltid, hvis formatet
  // skulle se anderledes ud i en anden runtime.
  const offset = zone?.replace("GMT", "") || "+01:00";
  return `${dato}T09:00:00${offset}`;
}
