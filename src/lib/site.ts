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
