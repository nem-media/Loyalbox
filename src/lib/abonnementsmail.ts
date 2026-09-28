import { BRAND_NAVN, COMPANY } from "./constants";
import {
  SLETNING_EFTER_OPHOER_DAGE,
  SUSPENSION_MAANEDER,
} from "./abonnement";
import { TIDSZONE } from "./dansk-dag";

/**
 * MAILS OM ABONNEMENTETS LIV — OPSAGT, FORTRUDT, STOPPET, SKIFTET TIL ÅR.
 *
 * HVORFOR DE FINDES. En kunde, der opsagde i Stripes kundecenter, hørte
 * ingenting bagefter: Stripe har ingen opsigelsesmail (indstillingerne under
 * Billing → Subscriptions and emails dækker kun prøveperiode, fornyelse,
 * kort og fejlede betalinger), og webhooken skrev kun status i basen.
 * Opdaget 28. september 2026, da ejeren selv opsagde og ventede på en
 * bekræftelse, der aldrig kom. En opsigelse uden noget på skrift er dén, man
 * ringer for at få bekræftet — eller opsiger én gang til.
 *
 * TEKSTEN ER KILDEN. `mail-skabelon.ts` bygger HTML'en af præcis denne
 * tekst, så de to udgaver ikke kan sige hver sit.
 *
 * MÅ KUN LOVE DET, SYSTEMET GØR. Hver sætning om, hvad der sker bagefter, er
 * handelsbetingelsernes §6 og §7 sagt til én bestemt kunde med én bestemt
 * dato: adgangen løber den betalte periode ud, dashboardets indsigt lukker,
 * alt ved skranken kører videre, der slettes intet i seks måneder, og derefter
 * inden for 30 dage. Fristerne læses af `abonnement.ts` og skrives aldrig ind
 * som tal.
 *
 * REN FUNKTION UDEN NETVÆRK OG DATABASE, så `abonnementsmail.test.ts` kan
 * kræve, at datoerne og vejen tilbage står i teksten.
 */

/** Dansk dato, som kunden læser den. Tidszonen er butikkens — se `dansk-dag.ts`. */
export function datoTekst(d: Date): string {
  return new Intl.DateTimeFormat("da-DK", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: TIDSZONE,
  }).format(d);
}

function kroner(n: number): string {
  return `${n.toLocaleString("da-DK")} kr.`;
}

/**
 * Hvornår ophører aftalen, hvis kunden ikke kommer tilbage?
 *
 * SAMME REGNESTYKKE SOM `suspensionUdloeber()`: webhooken sætter
 * `suspenderet_siden`, når abonnementet stopper, og de seks måneder løber
 * derfra. Her regnes det ud FØR det sker, så mailen kan nævne datoen.
 */
export function ophoerFra(stop: Date): Date {
  const d = new Date(stop);
  d.setMonth(d.getMonth() + SUSPENSION_MAANEDER);
  return d;
}

/**
 * Det, der sker efter stoppet. Én formulering, brugt af både "opsagt" og
 * "stoppet", så de to mails ikke kan beskrive samme forløb forskelligt.
 */
/*
 * UDEN STANDER ER DER INGEN STANDER AT NÆVNE. LoyalSum Komplet Online har
 * ingen — dens QR-kode og link er det, kunderne møder — og "standeren virker"
 * til en Online-kunde er samme fejlklasse som nullet på produktsiden: en
 * sætning, der var sand, så længe hver vare havde et skilt.
 */
function efterStoppet(stop: Date, digital: boolean): string[] {
  const ophoer = datoTekst(ophoerFra(stop));
  const ting = digital ? "dit LoyalSum-link og din QR-kode" : "standeren";
  return [
    `Når abonnementet er stoppet, lukker dashboardets statistik, feedback-indbakken og muligheden for at ændre logo og links. Alt det, dine kunder mærker, kører videre: ${ting} virker, stempelkort og pointprogrammer kører, og personalet kan stadig give og indløse.`,
    "",
    `Der slettes ingenting med det samme. Dine data bliver liggende i ${SUSPENSION_MAANEDER} måneder, til den ${ophoer}, og alt kommer tilbage, hvis du genoptager inden da. Derefter ophører aftalen, og vi sletter dine data inden for ${SLETNING_EFTER_OPHOER_DAGE} dage. ${digital ? "Linket og QR-koden holder" : "Standeren holder"} op med at virke, når det sker.`,
  ];
}

function hilsen(): string[] {
  return [
    "",
    `Har du spørgsmål, så svar bare på denne mail eller skriv til ${COMPANY.email}.`,
    "",
    "Venlig hilsen",
    BRAND_NAVN,
  ];
}

function hej(firmanavn: string | null): string {
  return firmanavn ? `Hej ${firmanavn}` : "Hej";
}

export interface OpsagtData {
  firmanavn: string | null;
  vare: string;
  /** Den dag abonnementet stopper — slutningen af den betalte periode. */
  stopper: Date;
  /** Varen har ingen fysisk stander (`kunDigital`). */
  digital?: boolean;
}

/** Bekræftelsen på en opsigelse — fra kundecentret eller fra admin. */
export function opsagtMail(d: OpsagtData): { emne: string; tekst: string } {
  const dato = datoTekst(d.stopper);
  const linjer = [
    hej(d.firmanavn),
    "",
    `Vi har registreret din opsigelse af ${d.vare}.`,
    "",
    `Abonnementet stopper den ${dato}. Indtil da har du fuld adgang som nu, og der trækkes ikke flere betalinger.`,
    "",
    ...efterStoppet(d.stopper, Boolean(d.digital)),
    "",
    /* VEJEN TILBAGE STÅR I MAILEN. En opsigelse sker ofte ved et uheld eller
       i en travl stund, og en kunde, der ikke kan se, hvordan den fortrydes,
       tegner et nyt abonnement — og betaler for en stander, hun allerede har. */
    `Fortryder du, kan du forny abonnementet før den ${dato} under Betaling og kvitteringer i dit dashboard. Så fortsætter alt, som om intet var sket.`,
    "",
    "Vil du have dine data slettet før tid, kan du bestille det under Abonnement i dashboardet.",
    ...hilsen(),
  ];

  return {
    emne: `Din opsigelse er registreret — ${d.vare} stopper ${dato}`,
    tekst: linjer.join("\n"),
  };
}

export interface FortrudtData {
  firmanavn: string | null;
  vare: string;
  /** Næste træk, hvis Stripe kender den. */
  naesteBetaling: Date | null;
}

/** Opsigelsen er trukket tilbage — abonnementet fortsætter. */
export function fortrudtMail(d: FortrudtData): { emne: string; tekst: string } {
  const linjer = [
    hej(d.firmanavn),
    "",
    `Din opsigelse af ${d.vare} er annulleret, og abonnementet fortsætter som før.`,
    "",
    d.naesteBetaling
      ? `Næste betaling trækkes den ${datoTekst(d.naesteBetaling)}.`
      : "Abonnementet fornyes automatisk som hidtil.",
    ...hilsen(),
  ];

  return {
    emne: `Dit abonnement fortsætter — ${d.vare}`,
    tekst: linjer.join("\n"),
  };
}

export interface StoppetData {
  firmanavn: string | null;
  vare: string;
  /** Den dag abonnementet faktisk stoppede. */
  stoppet: Date;
  /**
   * Stoppede det, fordi betalingen ikke kunne gennemføres? Stripe kan være
   * sat til at lukke abonnementet efter de sidste forsøg, og så er "din
   * opsigelse" det forkerte ord — kunden har ikke opsagt noget.
   */
  betalingFejlede: boolean;
  /** Varen har ingen fysisk stander (`kunDigital`). */
  digital?: boolean;
}

/** Abonnementet er stoppet i dag. */
export function stoppetMail(d: StoppetData): { emne: string; tekst: string } {
  const linjer = [
    hej(d.firmanavn),
    "",
    d.betalingFejlede
      ? `Dit abonnement på ${d.vare} er stoppet den ${datoTekst(d.stoppet)}, fordi betalingen ikke kunne gennemføres.`
      : `Dit abonnement på ${d.vare} er stoppet den ${datoTekst(d.stoppet)}, som du bad om.`,
    "",
    ...efterStoppet(d.stoppet, Boolean(d.digital)),
    "",
    /* KUN MÅNEDSPRISEN — standeren er købt og betalt, og det er dét, der
       gør vejen tilbage billig. Se `genoptagVej()`. */
    d.digital
      ? "Vil du genoptage, så log ind på dit dashboard. Der står en knap øverst på siden, og dit link og din QR-kode er de samme som før."
      : "Vil du genoptage, så log ind på dit dashboard. Der står en knap øverst på siden, og du betaler kun for abonnementet — standeren har du allerede.",
    ...hilsen(),
  ];

  return {
    emne: `Dit abonnement er stoppet — ${d.vare}`,
    tekst: linjer.join("\n"),
  };
}

export interface AarsskifteData {
  firmanavn: string | null;
  vare: string;
  /** Årsprisen ex moms pr. QR-adresse. */
  aarPris: number;
  /** Antal QR-adresser på abonnementet. */
  antal: number;
  /** Næste træk — om et år. */
  naesteBetaling: Date | null;
}

/**
 * Bekræftelsen på skiftet til årsbetaling.
 *
 * Stripes kvittering viser beløbet, men ikke hvad det dækker, og beløbet er
 * årsprisen MINUS den ubrugte del af måneden — et tal, der ikke står nogen
 * andre steder. Uden denne mail er det første, kunden ser, et træk på flere
 * tusinde kroner med en linje, der hedder "Remaining time".
 */
export function aarsskifteMail(d: AarsskifteData): {
  emne: string;
  tekst: string;
} {
  const pris = d.aarPris * d.antal;
  /* Bredden REGNES af den længste etiket — se `vilkaarsvarsel.ts` for
     fælden med et fast tal. Værdierne skal begynde i samme kolonne, ellers
     læser `mail-blokke.ts` det som løse sætninger og ikke som en opstilling. */
  const raekker: [string, string][] = [
    [
      "Årspris:",
      `${kroner(pris)} ex moms${d.antal > 1 ? ` (${d.antal} QR-adresser)` : ""}`,
    ],
    ...(d.naesteBetaling
      ? [["Næste træk:", datoTekst(d.naesteBetaling)] as [string, string]]
      : []),
  ];
  const bredde = Math.max(...raekker.map(([e]) => e.length)) + 2;
  const linjer = [
    hej(d.firmanavn),
    "",
    `Du betaler nu for et år ad gangen for ${d.vare}.`,
    "",
    ...raekker.map(([etiket, vaerdi]) => `${etiket.padEnd(bredde)}${vaerdi}`),
    "",
    "Den ubrugte del af din nuværende måned er trukket fra i dagens betaling. Kvitteringen med moms kommer fra Stripe i en separat mail.",
    "",
    /* INGEN BINDING, OG DET SKAL STÅ. §6 siger det, og en årspris læses let
       som en årskontrakt. */
    "Der er ingen binding. Du kan opsige når som helst under Betaling og kvitteringer i dit dashboard og beholder adgangen resten af det år, du har betalt for.",
    ...hilsen(),
  ];

  return {
    emne: `Du betaler nu årligt — ${d.vare}`,
    tekst: linjer.join("\n"),
  };
}

// ---------------------------------------------------------------------------
// HVAD SKETE DER? — læst af Stripes hændelse
// ---------------------------------------------------------------------------

/** Det, afgørelsen har brug for at vide om et abonnement. */
export interface AbonnementsUddrag {
  status: string;
  cancel_at?: number | null;
  cancel_at_period_end?: boolean | null;
}

/**
 * Er abonnementet sat til at stoppe?
 *
 * TO FELTER OG IKKE ÉT. Kundecentret sætter `cancel_at_period_end`, men
 * Stripe udfylder også `cancel_at`, og en opsigelse på en valgt dato
 * (dashboardet, API'et) sætter KUN `cancel_at`. Spurgte vi kun om det ene,
 * ville den anden slags opsigelse passere uden bekræftelse — og uden at admin
 * så den.
 */
export function erOpsagt(sub: AbonnementsUddrag): boolean {
  return Boolean(sub.cancel_at_period_end) || typeof sub.cancel_at === "number";
}

export type Livshaendelse = "opsagt" | "fortrudt" | "stoppet";

/**
 * Hvilken mail — om nogen — skal denne hændelse give?
 *
 * TO KILDER, OG BEGGE SKAL VÆRE ENIGE:
 *
 *   `foer` er `previous_attributes`: KUN de felter, der ændrede sig, med
 *   deres gamle værdi. Et felt, der ikke står der, var det samme før som i
 *   hændelsen — derfor falder vi tilbage på hændelsens eget øjebliksbillede.
 *   Det er dét, der skiller "blev opsagt nu" fra "var opsagt i forvejen og
 *   fik en ny faktura", som også er en `subscription.updated`.
 *
 *   `nu` er abonnementet hentet FRISKT hos Stripe. Hændelser kan komme i
 *   forkert rækkefølge: opsiger kunden og fortryder et minut efter, kan
 *   opsigelsen lande sidst. Uden den friske udgave ville kunden få "din
 *   opsigelse er registreret" om et abonnement, der kører videre.
 */
export function livshaendelse(opts: {
  type: string;
  haendelse: AbonnementsUddrag;
  foer: Partial<AbonnementsUddrag> | null | undefined;
  nu: AbonnementsUddrag;
}): Livshaendelse | null {
  const { type, haendelse, nu } = opts;
  const foer = opts.foer ?? {};

  if (type === "customer.subscription.deleted") {
    return nu.status === "canceled" ? "stoppet" : null;
  }
  if (type !== "customer.subscription.updated") return null;
  if (!("cancel_at_period_end" in foer) && !("cancel_at" in foer)) return null;

  const varOpsagt = erOpsagt({
    status: haendelse.status,
    cancel_at:
      "cancel_at" in foer ? (foer.cancel_at ?? null) : haendelse.cancel_at,
    cancel_at_period_end:
      "cancel_at_period_end" in foer
        ? foer.cancel_at_period_end
        : haendelse.cancel_at_period_end,
  });
  const blevOpsagt = erOpsagt(haendelse);

  if (!varOpsagt && blevOpsagt && erOpsagt(nu) && nu.status !== "canceled") {
    return "opsagt";
  }
  if (varOpsagt && !blevOpsagt && !erOpsagt(nu) && nu.status !== "canceled") {
    return "fortrudt";
  }
  return null;
}
