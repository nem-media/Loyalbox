/**
 * Brancheikoner.
 *
 * Ligger for sig, fordi brancherne nævnes tre steder — forsiden, stempelkortet
 * og reviewstanderen — og de SKAL se ens ud. Lå tegningerne i den ene side og
 * blev kopieret til de to andre, ville de før eller siden komme til at afvige,
 * og en café ville have to forskellige kopper på samme website.
 *
 * Tegnet i sidernes egen stregstil (24 px-net, stregtykkelse 1,8) frem for
 * hentet fra et bibliotek. Et blandet ikonsæt — nogle fyldte, andre streger,
 * forskellig optisk vægt — er dét, der får et website til at ligne noget, der
 * er klippet sammen.
 *
 * Ikonerne er DEKORATION. Betydningen står i overskriften ved siden af, og
 * derfor er de `aria-hidden`: en skærmlæser skal ikke læse "café" to gange.
 */

export type Branche =
  | "cafe"
  | "restaurant"
  | "takeaway"
  | "frisoer"
  | "skoenhed"
  | "klinik"
  | "butik"
  | "vaerksted"
  | "fitness";

const TEGNINGER: Record<Branche, React.ReactNode> = {
  cafe: (
    <>
      <path d="M4 8h11v6a4 4 0 0 1-4 4H8a4 4 0 0 1-4-4V8Z" />
      <path d="M15 9.5h2a2.5 2.5 0 0 1 0 5h-2" />
      <path d="M7.5 2.5v2M11 2.5v2" />
    </>
  ),
  restaurant: (
    <>
      <path d="M6 3v5a2 2 0 0 0 4 0V3" />
      <path d="M8 3v18" />
      <path d="M20 13.5h-2.2a2 2 0 0 1-2-2V7.8A4.8 4.8 0 0 1 20 3v10.5Z" />
      <path d="M20 13.5V21" />
    </>
  ),
  takeaway: (
    <>
      <path d="M5 8h14l-1.1 11.9a1.2 1.2 0 0 1-1.2 1.1H7.3a1.2 1.2 0 0 1-1.2-1.1L5 8Z" />
      <path d="M9 8V6a3 3 0 0 1 6 0v2" />
    </>
  ),
  frisoer: (
    <>
      <circle cx="6.5" cy="17.5" r="2.6" />
      <circle cx="17.5" cy="17.5" r="2.6" />
      <path d="M8.3 15.7 19 4M15.7 15.7 5 4" />
    </>
  ),
  skoenhed: (
    <>
      <path d="M11 3.5 12.7 8.3 17.5 10 12.7 11.7 11 16.5 9.3 11.7 4.5 10 9.3 8.3 11 3.5Z" />
      <path d="M17.5 15.5 18.4 17.6 20.5 18.5 18.4 19.4 17.5 21.5 16.6 19.4 14.5 18.5 16.6 17.6 17.5 15.5Z" />
    </>
  ),
  klinik: <path d="M9.5 3h5v6.5H21v5h-6.5V21h-5v-6.5H3v-5h6.5V3Z" />,
  butik: (
    <>
      <path d="M4.5 9.5h15V20a1 1 0 0 1-1 1h-13a1 1 0 0 1-1-1V9.5Z" />
      <path d="M3 9.5 4.6 4h14.8L21 9.5" />
      <path d="M9.8 21v-6h4.4v6" />
    </>
  ),
  vaerksted: (
    <path d="M15.2 3a5.6 5.6 0 0 0-5 8.1L3.6 17.7a2 2 0 0 0 2.8 2.8l6.6-6.6a5.6 5.6 0 0 0 7.2-6.7l-3.1 3.1-2.9-.8-.8-2.9 3.1-3.1A5.6 5.6 0 0 0 15.2 3Z" />
  ),
  fitness: <path d="M4 8.5v7M7.5 5v14M16.5 5v14M20 8.5v7M7.5 12h9" />,
};

export function IndustryIcon({
  branche,
  className = "h-[1.15rem] w-[1.15rem]",
}: {
  branche: Branche;
  className?: string;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden="true"
    >
      {TEGNINGER[branche]}
    </svg>
  );
}

/**
 * Ikonet i sit felt. Samlet ét sted, så afstand, størrelse og farve er ens på
 * tværs af de tre sider — det er dét, der gør, at de ligner samme system.
 */
export function IndustryBadge({
  branche,
  size = "sm",
}: {
  branche: Branche;
  size?: "sm" | "md";
}) {
  const felt = size === "md" ? "h-9 w-9" : "h-7 w-7";
  const ikon = size === "md" ? "h-5 w-5" : "h-[1.15rem] w-[1.15rem]";
  return (
    <span
      className={`grid ${felt} shrink-0 place-items-center rounded-lg bg-accent/10 text-accent`}
    >
      <IndustryIcon branche={branche} className={ikon} />
    </span>
  );
}
