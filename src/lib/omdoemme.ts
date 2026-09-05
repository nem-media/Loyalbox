/**
 * LoyalSum Reputation Score — beregningen ét sted.
 *
 * REN FUNKTION UDEN DATABASE OG UDEN `server-only`. Scoren må ikke regnes to
 * steder: hvis dashboardkortet og omdømmesiden hver havde sin formel, ville de
 * før eller siden vise forskellige tal for samme virksomhed, og det er den
 * slags fejl, der koster tillid til hele tallet. Alt herinde tager tal ind og
 * giver tal ud, så det kan prøves uden et netværk.
 *
 * DEN ER VORES EGEN, OG DET SKAL SIGES. Scoren er ikke en officiel vurdering
 * fra Google, Trustpilot eller nogen anden — den er LoyalSums egen indikator,
 * beregnet på de kundeoplevelser, der er samlet gennem os, plus de eksterne
 * ratings virksomheden selv har oplyst.
 *
 * VERSIONERET. `OMDOEMME_VERSION` gemmes sammen med hvert snapshot. Den dag
 * formlen ændres, kan gamle tal stadig forklares — uden versionen ville
 * historikken være en kurve, hvor et spring lige så godt kunne være en
 * ændring i vores egen kode som i virkeligheden, og ingen kunne se forskel.
 */

/** Formlens version. Hæv den, når vægte eller normalisering ændres. */
export const OMDOEMME_VERSION = "v1";

/**
 * Forbeholdene, der SKAL stå, hvor scoren og de eksterne tal vises.
 *
 * Ét sted hver, fordi en score, der ligner en officiel rating, er værre end
 * ingen score. Ændres ordlyden, ændres den alle steder på én gang.
 */
export const OMDOEMME_FORBEHOLD =
  "LoyalSums egen beregnede indikator — ikke en officiel vurdering fra Google, Trustpilot eller andre.";

export const EKSTERNE_FORBEHOLD =
  "Eksterne ratings er oplyst af virksomheden og verificeres ikke automatisk af LoyalSum.";

/* ------------------------------------------------------------- vægtningen */

/**
 * Vægtene.
 *
 * KUNDETILFREDSHED VEJER TUNGEST med vilje. Det er det eneste tal, vi selv har
 * målt: kunden har sat stjerner i vores eget flow. De eksterne ratings er
 * oplyst af virksomheden og kan ikke efterprøves, og derfor må de ikke kunne
 * bære scoren alene — 15 er nok til at tælle med og for lidt til at overdøve.
 */
export const VAEGTE = {
  kundetilfredshed: 50,
  positiveOplevelser: 20,
  feedbackhaandtering: 15,
  eksterneRatings: 15,
} as const;

export type Delnavn = keyof typeof VAEGTE;

/** Danske navne til delene. Bruges i breakdown og i "sådan beregnes scoren". */
export const DEL_NAVNE: Record<Delnavn, string> = {
  kundetilfredshed: "Kundetilfredshed",
  positiveOplevelser: "Positive oplevelser",
  feedbackhaandtering: "Feedbackhåndtering",
  eksterneRatings: "Eksterne ratings",
};

/** En del af scoren. `vaerdi: null` betyder "der er ikke data til den her". */
export interface Del {
  vaegt: number;
  vaerdi: number | null;
}

/**
 * Vejet gennemsnit, hvor manglende dele fordeler deres vægt på resten.
 *
 * DET ER HELE POINTEN MED FUNKTIONEN. En virksomhed uden eksterne profiler må
 * ikke få 0 for den del og dermed en straf for noget, den ikke har gjort
 * forkert. I stedet regnes scoren af de dele, der ER data til: mangler
 * eksterne ratings, fordeles deres 15 forholdsmæssigt på de øvrige.
 *
 * Returnerer null, hvis der slet ikke er noget at regne på. En score på 0
 * ville se ud som en meget dårlig virksomhed frem for en ny en.
 */
export function vejetScore(dele: Del[]): number | null {
  const brugbare = dele.filter(
    (d): d is { vaegt: number; vaerdi: number } =>
      d.vaerdi !== null && Number.isFinite(d.vaerdi) && d.vaegt > 0,
  );
  const samletVaegt = brugbare.reduce((s, d) => s + d.vaegt, 0);
  if (samletVaegt <= 0) return null;

  const sum = brugbare.reduce((s, d) => s + klem(d.vaerdi) * d.vaegt, 0);
  return afrund(sum / samletVaegt);
}

/**
 * Holder en værdi inden for 0-100.
 *
 * Findes, fordi et enkelt urimeligt tal ellers kan trække hele scoren uden for
 * skalaen — fx en ekstern rating, hvor nogen har skrevet 9 ud af 5.
 * Valideringen fanger det ved indtastning, men beregningen skal også kunne
 * holde til data, der er kommet ind ad en anden vej.
 */
export function klem(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, n));
}

/** Ét sted at afrunde, så to visninger af samme tal ikke kan blive uenige. */
export function afrund(n: number): number {
  return Math.round(klem(n));
}

/* ------------------------------------------------------- kundeoplevelserne */

/** Antal oplevelser pr. stjerne, 1-5. */
export interface Stjernefordeling {
  1: number;
  2: number;
  3: number;
  4: number;
  5: number;
}

export const TOM_FORDELING: Stjernefordeling = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };

/** Summen af alle oplevelser. */
export function antalOplevelser(f: Stjernefordeling): number {
  return f[1] + f[2] + f[3] + f[4] + f[5];
}

/**
 * Stjernegennemsnittet. Null uden oplevelser — ikke 0, som ville betyde
 * "elendig" frem for "ved det ikke endnu".
 */
export function gennemsnit(f: Stjernefordeling): number | null {
  const antal = antalOplevelser(f);
  if (antal === 0) return null;
  return (f[1] + f[2] * 2 + f[3] * 3 + f[4] * 4 + f[5] * 5) / antal;
}

/**
 * Et gennemsnit på en skala omsat til 0-100.
 *
 * BUNDEN AF SKALAEN ER 0 OG IKKE 20. Et gennemsnit på 1,0 er den dårligst
 * mulige vurdering og skal give 0 — ikke 20, som en simpel division med 5
 * ville give. Derfor `(snit - min) / (maks - min)`. Et snit på 4,7 giver 92,
 * hvilket også er det, tallet intuitivt bør være: tæt på toppen, ikke i den.
 *
 * Samme funktion bruges til eksterne ratings, så en Google-rating og vores
 * egen stjernescore aldrig kan blive omregnet efter hver sin regel.
 */
export function ratingTilScore(snit: number, maks = 5, min = 1): number | null {
  if (!Number.isFinite(snit) || !Number.isFinite(maks)) return null;
  if (maks <= min) return null;
  return afrund(((snit - min) / (maks - min)) * 100);
}

/**
 * Fordelingen som procenter.
 *
 * POSITIV ER 4-5, NEUTRAL ER 3, NEGATIV ER 1-2.
 *
 * De tre rettes til, så de altid summer til 100. Uden det ville tre
 * uafhængige afrundinger give 91 + 6 + 4 = 101 på skærmen, og nogen tæller
 * efter. Neutral og positiv afrundes hver for sig, og negativ får resten —
 * den er mindst og tåler afvigelsen bedst.
 */
export function andele(f: Stjernefordeling): {
  positiv: number;
  neutral: number;
  negativ: number;
} | null {
  const antal = antalOplevelser(f);
  if (antal === 0) return null;
  const positiv = Math.round(((f[4] + f[5]) / antal) * 100);
  const neutral = Math.round((f[3] / antal) * 100);
  return { positiv, neutral, negativ: 100 - positiv - neutral };
}

/**
 * Feedbackhåndtering: hvor stor en del af de utilfredse kunder, der er fulgt
 * op på.
 *
 * NULL NÅR DER IKKE ER NOGEN UTILFREDSE, og det er ikke det samme som 0. En
 * virksomhed uden en eneste negativ oplevelse har ikke undladt at følge op —
 * der var intet at følge op på, og delen udgår derfor, så vægten fordeles på
 * resten. Gav vi 0, ville den mest tilfredse kundekreds i landet få den
 * dårligste score, hvilket er det stik modsatte af, hvad tallet skal måle.
 */
export function haandteringsScore(
  negativeIAlt: number,
  haandterede: number,
): number | null {
  if (!Number.isFinite(negativeIAlt) || negativeIAlt <= 0) return null;
  const andel = Math.min(Math.max(haandterede, 0), negativeIAlt) / negativeIAlt;
  return afrund(andel * 100);
}

/* ---------------------------------------------------------- eksterne tal */

/** En ekstern profil, som beregningen har brug for at kende den. */
export interface EksternProfil {
  platform: string;
  /** Ratingen, fx 4,6. Null hvis platformen kun har en anbefalingsprocent. */
  rating: number | null;
  /** Skalaens top, fx 5. */
  ratingSkala: number | null;
  antalAnmeldelser: number;
  /** Facebook o.l.: "94 % anbefaler". Bruges når `rating` er null. */
  anbefalingProcent: number | null;
}

/**
 * Loft over hvor meget én profil kan veje.
 *
 * UDEN DET AFGØR DEN STØRSTE PROFIL ALT. En Google-profil med 12.000
 * anmeldelser ville drukne en Trustpilot-profil med 80, og så var det reelt
 * kun Google, der talte. Loftet gør, at flere profiler stadig trækker i hver
 * sin retning, uden at et lille antal anmeldelser vejer lige så tungt som et
 * stort.
 */
export const ANMELDELSER_LOFT = 500;

/**
 * De eksterne ratings vejet sammen til én score på 0-100.
 *
 * Profiler UDEN et normaliserbart tal springes over — se `EksternProfil`. En
 * profil, virksomheden har oprettet uden rating, skal kunne stå på siden uden
 * at flytte scoren; ellers ville en tom profil kunne bruges til at pynte.
 *
 * En profil uden anmeldelser vejer 1 og ikke 0, så den tæller lidt frem for
 * slet ikke — antallet er oplyst af virksomheden og kan mangle uden at
 * ratingen er forkert.
 */
export function eksternScore(profiler: EksternProfil[]): number | null {
  let sum = 0;
  let vaegt = 0;

  for (const p of profiler) {
    let vaerdi: number | null = null;

    if (p.rating !== null && p.ratingSkala !== null && p.ratingSkala > 0) {
      /*
       * BUNDEN AF SKALAEN AFHÆNGER AF SKALAEN. En stjerneskala går fra 1 til 5
       * — man kan ikke give nul stjerner — så 1 er bunden, præcis som i vores
       * egen kundescore. En selvvalgt skala (fx 0-10) starter derimod i 0.
       * Uden den skelnen ville "0 ud af 10" give 0, mens "1 ud af 5" også gav
       * 0, og de to betyder ikke det samme.
       */
      const bund = p.ratingSkala === 5 ? 1 : 0;
      vaerdi = ratingTilScore(p.rating, p.ratingSkala, bund);
    } else if (p.anbefalingProcent !== null) {
      // En anbefalingsprocent ER allerede 0-100 og skal ikke omregnes.
      vaerdi = afrund(p.anbefalingProcent);
    }

    if (vaerdi === null || !Number.isFinite(vaerdi)) continue;

    const w = Math.max(1, Math.min(p.antalAnmeldelser || 0, ANMELDELSER_LOFT));
    sum += vaerdi * w;
    vaegt += w;
  }

  if (vaegt <= 0) return null;
  return afrund(sum / vaegt);
}

/* ------------------------------------------------------------ datagrundlag */

export type Datagrundlag = "begraenset" | "foreloebig" | "godt" | "kun-eksternt";

/** Teksten, virksomheden ser. Ingen tal — de står ved siden af. */
export const DATAGRUNDLAG_TEKST: Record<Datagrundlag, string> = {
  begraenset: "Begrænset datagrundlag",
  foreloebig: "Foreløbig score",
  godt: "Godt datagrundlag",
  "kun-eksternt": "Baseret primært på virksomhedens registrerede eksterne ratings",
};

/**
 * Hvor meget kan tallet bære?
 *
 * FORKLARINGEN ER LIGE SÅ VIGTIG SOM SCOREN. "96 / 100" på baggrund af én
 * enkelt kundevurdering er ikke forkert regnet, men det er misvisende at vise
 * uden et ord om, hvor tyndt grundlaget er. Grænserne er sat, hvor et
 * gennemsnit holder op med at svinge voldsomt ved den næste besvarelse.
 */
export function datagrundlag(
  antalOplevelser: number,
  harEksterne: boolean,
): Datagrundlag {
  if (antalOplevelser === 0 && harEksterne) return "kun-eksternt";
  if (antalOplevelser < 5) return "begraenset";
  if (antalOplevelser < 20) return "foreloebig";
  return "godt";
}

/* ---------------------------------------------------------------- etiketter */

/**
 * Den korte menneskelige forklaring ved tallet.
 *
 * INGEN ALARMFARVER OG INGEN LAVE UDRÅB. Under 60 hedder det "mulighed for
 * forbedring" og ikke "dårligt omdømme": scoren skal få nogen til at gøre
 * noget, og en, der føler sig hængt ud af sit eget dashboard, lukker fanen.
 */
export function scoreEtiket(score: number): string {
  if (score >= 90) return "Meget stærkt omdømme";
  if (score >= 80) return "Stærkt omdømme";
  if (score >= 70) return "Godt omdømme";
  if (score >= 60) return "Stabilt omdømme";
  return "Mulighed for forbedring";
}

/** Tonen til badgen. `accent` frem for `danger` i bunden — se `scoreEtiket`. */
export function scoreTone(score: number): "success" | "accent" | "neutral" {
  if (score >= 80) return "success";
  if (score >= 60) return "accent";
  return "neutral";
}

/* ------------------------------------------------------------- beregningen */

export interface OmdoemmeInput {
  fordeling: Stjernefordeling;
  /** Antal negative oplevelser (1-2 stjerner), der er fulgt op på. */
  haandteredeNegative: number;
  profiler: EksternProfil[];
}

export interface Omdoemme {
  /** Den samlede score, 0-100. Null når der slet ikke er data. */
  score: number | null;
  etiket: string | null;
  /** Delscorerne. Null pr. del betyder "ingen data" — den udgår af beregningen. */
  dele: Record<Delnavn, number | null>;
  /** Hvad hver del faktisk vejede EFTER omfordeling, i procent. */
  faktiskeVaegte: Record<Delnavn, number>;
  /** Stjernegennemsnittet, fx 4,7. Null uden oplevelser. */
  kundescore: number | null;
  antalOplevelser: number;
  andele: { positiv: number; neutral: number; negativ: number } | null;
  negativeIAlt: number;
  uhaandteredeNegative: number;
  datagrundlag: Datagrundlag;
  version: string;
}

/**
 * Hele beregningen. Ét kald, ét resultat — og alt, en skærm skal bruge.
 *
 * Returnerer også `faktiskeVaegte`, så "sådan beregnes scoren" kan vise, hvad
 * vægtene blev til, efter manglende dele fordelte deres. Uden det ville
 * forklaringen sige 50/20/15/15, mens tallet var regnet på noget andet.
 */
export function beregnOmdoemme(input: OmdoemmeInput): Omdoemme {
  const antal = antalOplevelser(input.fordeling);
  const snit = gennemsnit(input.fordeling);
  const fordelt = andele(input.fordeling);
  const negativeIAlt = input.fordeling[1] + input.fordeling[2];
  const haandterede = Math.min(
    Math.max(input.haandteredeNegative, 0),
    negativeIAlt,
  );

  const dele: Record<Delnavn, number | null> = {
    kundetilfredshed: snit === null ? null : ratingTilScore(snit),
    positiveOplevelser: fordelt === null ? null : fordelt.positiv,
    feedbackhaandtering: haandteringsScore(negativeIAlt, haandterede),
    eksterneRatings: eksternScore(input.profiler),
  };

  const score = vejetScore(
    (Object.keys(VAEGTE) as Delnavn[]).map((k) => ({
      vaegt: VAEGTE[k],
      vaerdi: dele[k],
    })),
  );

  // Vægtene som de faktisk faldt ud, så forklaringen kan vise sandheden.
  const aktive = (Object.keys(VAEGTE) as Delnavn[]).filter(
    (k) => dele[k] !== null,
  );
  const samlet = aktive.reduce((s, k) => s + VAEGTE[k], 0);
  const faktiskeVaegte = (Object.keys(VAEGTE) as Delnavn[]).reduce(
    (acc, k) => {
      acc[k] = samlet > 0 && dele[k] !== null
        ? Math.round((VAEGTE[k] / samlet) * 100)
        : 0;
      return acc;
    },
    {} as Record<Delnavn, number>,
  );

  return {
    score,
    etiket: score === null ? null : scoreEtiket(score),
    dele,
    faktiskeVaegte,
    kundescore: snit === null ? null : Math.round(snit * 10) / 10,
    antalOplevelser: antal,
    andele: fordelt,
    negativeIAlt,
    uhaandteredeNegative: negativeIAlt - haandterede,
    datagrundlag: datagrundlag(antal, input.profiler.length > 0),
    version: OMDOEMME_VERSION,
  };
}

/* --------------------------------------------------------------- validering */

export const PLATFORME = [
  { vaerdi: "google", navn: "Google", skala: 5 },
  { vaerdi: "trustpilot", navn: "Trustpilot", skala: 5 },
  { vaerdi: "tripadvisor", navn: "Tripadvisor", skala: 5 },
  { vaerdi: "facebook", navn: "Facebook", skala: null },
  { vaerdi: "anden", navn: "Anden", skala: null },
] as const;

export type Platform = (typeof PLATFORME)[number]["vaerdi"];

export function platformNavn(vaerdi: string): string {
  return PLATFORME.find((p) => p.vaerdi === vaerdi)?.navn ?? vaerdi;
}

/**
 * Validerer en ekstern profil, før den gemmes.
 *
 * SKREVET SOM EN LISTE AF FEJL og ikke som et ja/nej, så formularen kan vise
 * hvad der er galt frem for bare at afvise. Alle grænser er dem, der ville
 * give NaN, Infinity eller en score uden for skalaen længere nede.
 */
export function valider(input: {
  platform: string;
  rating: number | null;
  ratingSkala: number | null;
  antalAnmeldelser: number;
  anbefalingProcent: number | null;
  profilUrl: string | null;
  visningsnavn: string | null;
}): string[] {
  const fejl: string[] = [];

  if (!PLATFORME.some((p) => p.vaerdi === input.platform)) {
    fejl.push("Vælg en platform.");
  }
  if (input.platform === "anden" && !input.visningsnavn?.trim()) {
    fejl.push("Giv platformen et navn.");
  }

  const harRating = input.rating !== null;
  const harProcent = input.anbefalingProcent !== null;
  if (!harRating && !harProcent) {
    fejl.push("Angiv enten en rating eller en anbefalingsprocent.");
  }

  if (harRating) {
    if (!Number.isFinite(input.rating!)) fejl.push("Ratingen skal være et tal.");
    if (input.ratingSkala === null || !Number.isFinite(input.ratingSkala) || input.ratingSkala <= 0) {
      fejl.push("Skalaen skal være større end 0.");
    } else {
      if (input.rating! < 0) fejl.push("Ratingen kan ikke være negativ.");
      if (input.rating! > input.ratingSkala) {
        fejl.push(`Ratingen kan ikke være højere end ${input.ratingSkala}.`);
      }
    }
  }

  if (harProcent) {
    const p = input.anbefalingProcent!;
    if (!Number.isFinite(p) || p < 0 || p > 100) {
      fejl.push("Anbefalingsprocenten skal være mellem 0 og 100.");
    }
  }

  if (!Number.isFinite(input.antalAnmeldelser) || input.antalAnmeldelser < 0) {
    fejl.push("Antal anmeldelser kan ikke være negativt.");
  }

  const url = input.profilUrl?.trim();
  if (url) {
    try {
      const u = new URL(url);
      if (u.protocol !== "https:" && u.protocol !== "http:") {
        fejl.push("Linket skal starte med https://");
      }
    } catch {
      fejl.push("Linket er ikke en gyldig adresse.");
    }
  }

  return fejl;
}
