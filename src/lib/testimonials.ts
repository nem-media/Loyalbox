/**
 * UDTALELSER — OG DEN ENE REGEL, DER GØR SEKTIONEN LOVLIG.
 *
 * En kundeudtalelse på et website er en anprisning. Er den opdigtet, er den
 * vildledende markedsføring efter markedsføringslovens § 5-6, og den rammer
 * samme sted som review gating: troværdigheden i, at anmeldelser hos os
 * betyder noget. Vi må altså gerne BYGGE sektionen, før vi har udtalelser —
 * vi må bare ikke vise noget, der ikke er sagt.
 *
 * Derfor bærer hver udtalelse `isPlaceholder`. Det er ikke en note til
 * udvikleren, men en SPÆRRE: `synligeUdtalelser()` filtrerer dem fra i
 * produktion, så en pladsholder ikke kan glide med i en udrulning, fordi
 * nogen glemte at rydde op. Listen er tom for godkendte udtalelser i dag, og
 * sektionen tegner derfor ingenting i produktion — det er den rigtige
 * tilstand, ikke en fejl.
 *
 * SÅDAN TAGES EN RIGTIG IND: skriv den ind herunder UDEN `isPlaceholder`, og
 * kun når butikken har sagt ja til at blive citeret ved navn. Ingen anden
 * kode skal røres.
 *
 * BILLEDER: feltet findes ikke med vilje. Vi har ingen godkendte
 * kundebilleder, og et AI-ansigt eller et stockfoto ved siden af et citat er
 * en påstand om et menneske. `KundeAvatar` tegner initialer af navnet eller
 * et neutralt tegn — se begrundelsen dér.
 */
export interface Udtalelse {
  id: string;
  /** Personens eget navn. Bruges til initialer i avataren. */
  navn: string;
  /** Butikken, personen taler på vegne af. */
  virksomhed: string;
  /** Citatet, som det er sagt. Redigér ikke meningen. */
  citat: string;
  /**
   * SAND = må kun ses under udvikling. Udelades feltet, er udtalelsen
   * godkendt og rigtig, og så vises den alle steder.
   */
  isPlaceholder?: true;
}

export const UDTALELSER: Udtalelse[] = [
  /*
   * Tre pladsholdere, så sektionen kan tegnes og vurderes. Teksterne er
   * bevidst almindelige danske sætninger uden tal og uden løfter: skulle en
   * af dem alligevel slippe ud, ville den hverken påstå et resultat eller
   * ligne en måling. De erstattes én for én af rigtige citater.
   */
  {
    id: "ph-1",
    navn: "Fornavn Efternavn",
    virksomhed: "Butikkens navn",
    citat:
      "Skiltet står ved kassen, og gæsterne scanner det selv. Vi skulle ikke lære personalet noget nyt.",
    isPlaceholder: true,
  },
  {
    id: "ph-2",
    navn: "Fornavn Efternavn",
    virksomhed: "Butikkens navn",
    citat:
      "Vi kan se, hvad folk skriver, inden det bliver til en offentlig anmeldelse. Det har vi kunnet bruge til noget.",
    isPlaceholder: true,
  },
  {
    id: "ph-3",
    navn: "Fornavn Efternavn",
    virksomhed: "Butikkens navn",
    citat:
      "Stempelkortet ligger på kundens telefon, så der er ikke noget papkort at holde styr på ved disken.",
    isPlaceholder: true,
  },
];

/**
 * Dem, der må vises her og nu.
 *
 * Grenen er `NODE_ENV` og ikke et eget miljøflag: en ny indstilling kan
 * MANGLE i produktionen, og virkningen ville være tavs — præcis den fælde, en
 * signeret gendan-nøgle undgår ved at bruge en nøgle, der altid er der.
 * `NODE_ENV` er `production` i hver eneste Vercel-bygning og kan ikke glemmes.
 */
export function synligeUdtalelser(): Udtalelse[] {
  const godkendte = UDTALELSER.filter((u) => !u.isPlaceholder);
  if (process.env.NODE_ENV === "production") return godkendte;
  return UDTALELSER;
}
