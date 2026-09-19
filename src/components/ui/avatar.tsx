import { cn } from "@/lib/utils";

/**
 * AVATAREN ER ÉN KOMPONENT, FORDI REGLEN SKAL VÆRE ÉN.
 *
 * Et ansigt ved siden af en anmeldelse er det stærkeste signal om, at der
 * står et menneske bag — og derfor er det også det farligste sted at fylde
 * ud. Vi har INGEN profilbilleder af butikkernes kunder: hverken
 * `loyalty_members` eller `feedback` har et billedfelt, og et lånt foto ville
 * være en påstand om en person, der ikke har sagt ja til noget.
 *
 * Rækkefølgen er derfor fast, og den er den samme hvert sted:
 *
 *   1. et RIGTIGT billede, hvis der en dag kommer et felt at hente det fra
 *   2. ellers initialer af det navn, kunden selv har skrevet
 *   3. ellers et neutralt persontegn
 *
 * Der er ingen fjerde gren. Et tilfældigt menneskefoto, et genereret ansigt
 * eller et stockbillede må aldrig kunne komme ind ad en femte dør, og det er
 * grunden til, at avataren ikke tager en vilkårlig `children`.
 *
 * ANONYMITET BÆRES AF KALDEREN. Er en tilbagemelding anonym i systemet, har
 * den intet navn, og så falder avataren af sig selv tilbage på tegnet — der
 * skal ikke sættes et flag for det. Send aldrig en e-mail som `navn` for at
 * få bogstaver ud af den: adressen er ikke noget, kunden har valgt at vise.
 */

function bogstaver(navn: string): string | null {
  /*
   * TO BOGSTAVER FRA TO ORD, ellers ét. "Maria Jensen" → MJ, "Maria" → M.
   *
   * Der tages fra FØRSTE og SIDSTE ord og ikke fra de to første: et
   * mellemnavn ville ellers skubbe efternavnet ud, og "Anne Marie Nielsen"
   * blev til AM hos os og AN alle andre steder. Tegn, der ikke er bogstaver
   * (emoji, tal, tankestreger), springes over — et kort med "·" i cirklen
   * ligner en fejl.
   */
  const ord = navn
    .split(/\s+/)
    .map((o) => [...o].find((t) => /\p{L}/u.test(t)))
    .filter((t): t is string => Boolean(t));
  if (ord.length === 0) return null;
  const foerste = ord[0];
  const sidste = ord.length > 1 ? ord[ord.length - 1] : "";
  return (foerste + sidste).toLocaleUpperCase("da-DK");
}

function PersonIkon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={className}
    >
      <circle cx="12" cy="8.5" r="3.5" />
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" />
    </svg>
  );
}

const maal = {
  sm: "h-9 w-9 text-[11px]",
  md: "h-11 w-11 text-sm",
  lg: "h-14 w-14 text-base",
} as const;

const ikonMaal = { sm: "h-4 w-4", md: "h-5 w-5", lg: "h-6 w-6" } as const;

export function KundeAvatar({
  navn,
  billedeUrl,
  size = "md",
  className,
}: {
  /** Det navn, kunden selv har oplyst. Tomt eller ukendt → neutralt tegn. */
  navn?: string | null;
  /**
   * KUN et rigtigt billede fra vores egne data. Feltet findes ikke i dag og
   * står her, så den dag det gør, er der ét sted at koble det på — og så
   * ingen finder på at sende en vilkårlig adresse ind i mellemtiden.
   */
  billedeUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const initialer = navn?.trim() ? bogstaver(navn.trim()) : null;

  /*
   * `ikon-felt` giver den lyse teal-gradient, inderkanten og den lave skygge
   * — samme flade som ikonchippen, så en avatar og et ikonfelt ved siden af
   * hinanden ligner to ting fra samme system. Udseendet er DETERMINISTISK:
   * ingen farve udledt af navnet, for en kunde, der skifter navn, skal ikke
   * skifte farve, og en tilfældig farve pr. person er præcis den slags, der
   * ender med at ligne et kategoriseringssystem, der ikke findes.
   */
  const flade = cn(
    "ikon-felt grid shrink-0 place-items-center rounded-full font-semibold text-accent",
    maal[size],
    className,
  );

  if (billedeUrl) {
    return (
      /* eslint-disable-next-line @next/next/no-img-element --
         adressen er ukendt på byggetidspunktet og kan ligge uden for vores
         egne domæner; `next/image` kræver en hvidliste, og et billede, der
         IKKE kan vises, er værre end et, der ikke optimeres. */
      <img
        src={billedeUrl}
        alt=""
        className={cn(
          "shrink-0 rounded-full border border-border object-cover",
          maal[size],
          className,
        )}
      />
    );
  }

  return (
    <span aria-hidden="true" className={flade}>
      {initialer ?? <PersonIkon className={ikonMaal[size]} />}
    </span>
  );
}
