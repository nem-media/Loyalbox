import {
  frontFarve,
  type Frontvalg,
  type StanderFarve,
} from "@/lib/stander-tilvalg";

/**
 * Et DESIGN er de trykvalg, en butik har gjort én gang: standerens farve,
 * frontens farve og logoet. Det er ikke det samme som en stander — standeren
 * er QR-adressen og siden bag den. Samme design kan trykkes på flere standere,
 * og samme stander kan få et nyt design.
 *
 * HVORFOR DET ER SIN EGEN TING: kunden skal kunne bestille flere af noget, de
 * allerede har fået lavet, uden at betale for opsætningen igen. Lå valgene kun
 * på ordren, ville en genbestilling være en ny ordre med de samme valg — og
 * så ville tillægget for egen frontfarve blive opkrævet forfra.
 *
 * DERFOR ER `frontfarve_betalt` PÅ DESIGNET og ikke på ordren. Tillægget er en
 * opsætning i trykket: den laves én gang for et design og genbruges derefter.
 * "139 kr. pr. ordre" var den rigtige regel, så længe der kun fandtes én ordre
 * pr. design; med genbestillinger er den rigtige regel "pr. design".
 */

export type FrontType = "matcher" | "egen";

export interface DesignValg {
  stander_farve: StanderFarve;
  front_type: FrontType;
  front_hex: string | null;
  /** Er tillægget for egen frontfarve allerede betalt for DETTE design? */
  frontfarve_betalt: boolean;
}

/**
 * Skal der betales for frontfarven ved denne bestilling?
 *
 * To betingelser, begge nødvendige: der SKAL være valgt en egen farve, og den
 * må ikke være betalt før. Et design, der følger standerens farve, koster
 * aldrig noget — heller ikke første gang.
 */
export function skalBetaleFrontfarve(design: DesignValg): boolean {
  return design.front_type === "egen" && !design.frontfarve_betalt;
}

/**
 * Den farve, fronten faktisk trykkes i.
 *
 * Tager kun de tre felter, den faktisk bruger. Betalingsflaget hører ikke til
 * her — en visning af hvad der trykkes, skal ikke kræve at vide, om der er
 * betalt for det, og et kaldested skal ikke hente et felt for at få lov.
 *
 * Går gennem `frontFarve()`, så et design med `front_type: "egen"` men en
 * manglende eller ugyldig hex falder tilbage til standerens farve i stedet for
 * at trykke sort på sort. Den slags opstår, hvis nogen redigerer databasen i
 * hånden — og et tryk må ikke afhænge af, at det aldrig sker.
 */
export function designFrontfarve(
  design: Pick<DesignValg, "stander_farve" | "front_type" | "front_hex">,
): Frontvalg {
  return frontFarve(
    design.stander_farve,
    design.front_type === "egen" ? design.front_hex : null,
  );
}

/**
 * Er designet i en tilstand, der kan trykkes?
 *
 * Et logo er ikke et krav — en butik kan bestille et skilt uden. Men et design,
 * der påstår at have en egen frontfarve uden at have en, er i stykker, og det
 * skal opdages her frem for i trykkeriet.
 */
export function kanTrykkes(
  design: Pick<DesignValg, "stander_farve" | "front_type" | "front_hex">,
): boolean {
  if (design.front_type !== "egen") return true;
  return designFrontfarve(design).egen;
}

/**
 * Skabelonversionen gemmes på hvert design.
 *
 * Den savner ingen, før den dag skabelonen laves om, og en kunde vil have et
 * skilt magen til det, de fik sidste år. Uden versionen kan vi ikke svare på,
 * hvordan deres gamle så ud.
 */
export const PRINT_SKABELON_VERSION = "v1";
