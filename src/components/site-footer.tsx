import Link from "next/link";
import { Logo } from "@/components/brand";
import { cn } from "@/lib/utils";
import { ButtonLink } from "@/components/ui/button";
import { ConsentSettingsLink } from "@/components/analytics";
import {
  SITE_NAME,
  SITE_TAGLINE,
  KATALOG,
  COMPANY,
  mangler,
} from "@/lib/constants";

interface FooterLink {
  href: string;
  label: string;
}

const COLUMNS: { title: string; links: FooterLink[] }[] = [
  {
    title: "Produkter",
    links: [
      ...KATALOG.map((p) => ({ href: `/produkter/${p.slug}`, label: p.name })),
      { href: "/produkter", label: "Alle produkter" },
    ],
  },
  {
    title: "Platform",
    links: [
      { href: "/#platform", label: "Alt i LoyalSum" },
      { href: "/stempelkort", label: "Digitalt stempelkort" },
      { href: "/loyalitetsprogram", label: "Loyalitetsprogram" },
      { href: "/loyalsum-komplet-online", label: "LoyalSum uden stander" },
      { href: "/reviewstander", label: "Reviewstander" },
      { href: "/#saadan", label: "Sådan virker det" },
    ],
  },
  {
    title: "Ressourcer",
    links: [
      { href: "/blog", label: "Blog" },
      { href: "/produkter", label: "Priser" },
      { href: "/bestil", label: "Bestil stander" },
      { href: "/kontakt", label: "Kontakt os" },
    ],
  },
];

/*
  KONTO ER IKKE LÆNGERE EN KOLONNE.
  Den havde TO links ved siden af tre kolonner med fire til seks, så gitteret
  stod ragget, og den sidste femtedel af footeren var tom — målt ved 1440 lå
  der godt 300 px ubrugt til højre for "Opret virksomhed".

  De to links er ikke fjernet; de er blevet til dét, de ER: de to handlinger,
  en besøgende kan tage her. Som knapper i brandspalten giver de footeren en
  afslutning frem for en liste, der ebber ud — og gitteret går op.
*/

export function SiteFooter({
  /**
   * Står footeren under en MØRK sektion?
   *
   * DEN MÅ IKKE VÆRE EN GÆTTET STANDARD. Løftet med afrundede hjørner er
   * samme greb som produktstriben over heroen: en lys flade, der rejser sig
   * op over en mørk. Men footeren følger kun en mørk sektion på TRE af ni
   * offentlige sider — målt, ikke antaget. På de øvrige seks er fladen over
   * den hvid, og så ville de afrundede hjørner vise to hvide hak i stedet
   * for en overgang.
   *
   * Derfor siger siden det selv, og `.qa/redesign-qa.mjs` MÅLER den
   * faktiske baggrund over footeren og fejler, hvis flaget og virkeligheden
   * ikke passer. Uden den måling ville flaget være en note, der holder op
   * med at være sand, første gang nogen skifter sidens sidste sektion.
   */
  overMoerk = false,
}: { overMoerk?: boolean } = {}) {
  return (
    /*
      FOOTEREN ER SIDENS SIDSTE INDTRYK, og den var en flad grå liste.
      `sektion-skaer` giver den samme lys som sitets øvrige lyse sektioner,
      så den hører til huset frem for at være en bundplade. Luften er øget
      fra py-14 til py-16, fordi en footer, der klemmer sig sammen, læses
      som noget, der er sat på til sidst.
    */
    <footer
      className={cn(
        "sektion-skaer border-t border-border bg-muted-bg",
        overMoerk &&
          "relative z-10 -mt-8 rounded-t-[var(--radius-stor)] border-t-0",
      )}
    >
      <div className="mx-auto max-w-side px-4 py-16">
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-[1.5fr_repeat(3,1fr)] lg:gap-12">
          {/* Brand */}
          <div>
            <Logo image="dark" />
            <p className="mt-4 max-w-xs text-sm leading-relaxed text-muted">
              {SITE_TAGLINE}
            </p>

            {/*
              DE TO HANDLINGER, footeren kan bære. `outline` og ikke to
              primære: footeren må ikke konkurrere med sidens egen
              afsluttende opfordring lige ovenover — den skal samle op efter
              den, ikke råbe over den.
            */}
            <div className="mt-6 flex flex-wrap gap-3">
              <ButtonLink href="/signup" variant="primary" size="sm">
                Opret virksomhed
              </ButtonLink>
              <ButtonLink href="/login" variant="outline" size="sm">
                Log ind
              </ButtonLink>
            </div>

            {/* HER STOD MAILADRESSEN OGSÅ. Den er nu væk: den står i
                selskabslinjen forneden, hvor den er et lovkrav, og
                "Kontakt os" står i Ressourcer. Tre veje til det samme i én
                footer er ikke tre tilbud, det er støj. */}
          </div>

          {/* Link-kolonner */}
          {COLUMNS.map((col) => (
            <nav key={col.title} aria-label={col.title}>
              {/* `.etiket` er husets fælles versalstil — den samme, der
                  bærer sektionsnavnene i dashboardet. Footeren skrev sin
                  egen udgave af den, og to udgaver af samme stil driver fra
                  hinanden. */}
              <h3 className="etiket">{col.title}</h3>
              <ul className="mt-4 space-y-2.5 text-sm">
                {col.links.map((l) => (
                  <li key={l.href + l.label}>
                    <Link
                      href={l.href}
                      className="inline-block text-foreground/75 transition-colors hover:text-accent"
                    >
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        {/* Selskabsoplysninger er et lovkrav (e-handelsloven) og noget Stripe
            kontrollerer ved godkendelse — derfor i footeren på hver side. */}
        <div className="mt-12 flex flex-col gap-4 border-t border-border pt-6 text-sm text-muted sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p>
              © {new Date().getFullYear()} {SITE_NAME} · Flere nye kunder og
              flere genbesøg for lokale forretninger.
            </p>
            <p className="mt-2">
              {COMPANY.legalName}
              {mangler(COMPANY.cvr) ? null : ` · CVR ${COMPANY.cvr}`}
              {mangler(COMPANY.address)
                ? null
                : ` · ${COMPANY.address}, ${COMPANY.postalCode} ${COMPANY.city}`}
              {" · "}
              <a href={`mailto:${COMPANY.email}`} className="hover:text-accent">
                {COMPANY.email}
              </a>
            </p>
          </div>
          {/* `flex-wrap` OG intet `shrink-0`.
              Fire lange danske ord — Handelsbetingelser, Privatlivspolitik,
              Databehandleraftale og cookielinket — stod på én linje, der ikke
              måtte ombryde OG ikke måtte krympe. Tilsammen godt 500 px i en
              footer på en telefon, der er 375 px bred. Resultatet var, at HELE
              siden kunne rulles til højre, ikke bare footeren. */}
          <nav
            aria-label="Juridisk"
            className="flex flex-wrap gap-x-4 gap-y-2 sm:justify-end"
          >
            <Link href="/handelsbetingelser" className="hover:text-accent">
              Handelsbetingelser
            </Link>
            <Link href="/privatliv" className="hover:text-accent">
              Privatlivspolitik
            </Link>
            <Link href="/databehandleraftale" className="hover:text-accent">
              Databehandleraftale
            </Link>
            <ConsentSettingsLink />
          </nav>
        </div>
      </div>
    </footer>
  );
}
