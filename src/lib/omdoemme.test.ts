import { describe, it, expect } from "vitest";
import {
  ANMELDELSER_LOFT,
  OMDOEMME_VERSION,
  VAEGTE,
  afrund,
  andele,
  beregnOmdoemme,
  datagrundlag,
  eksternScore,
  gennemsnit,
  haandteringsScore,
  ratingTilScore,
  scoreEtiket,
  valider,
  vejetScore,
  offentligKundescore,
  klarTilOffentligVisning,
  OFFENTLIG_MINIMUM,
  OFFENTLIG_PERIODE_MAANEDER,
  offentligPeriodeStart,
  boerForeslaaOffentlig,
  OFFENTLIG_TEKST,
  FORBUDTE_ORD,
  type EksternProfil,
  type Stjernefordeling,
} from "./omdoemme";

/**
 * Reputation Score er et tal, en virksomhedsejer træffer beslutninger ud fra —
 * og som vi sælger abonnementet på. Det, der kan gå galt, er ikke, at
 * beregningen kaster, men at den er STILLE FORKERT: at en virksomhed straffes
 * for data, den ikke har, eller at to skærme viser hvert sit tal for samme
 * kunde. Prøverne her handler derfor mest om grænserne og om det, der mangler.
 */

function fordeling(over: Partial<Stjernefordeling> = {}): Stjernefordeling {
  return { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0, ...over };
}

function profil(over: Partial<EksternProfil> = {}): EksternProfil {
  return {
    platform: "google",
    rating: 4.6,
    ratingSkala: 5,
    antalAnmeldelser: 281,
    anbefalingProcent: null,
    ...over,
  };
}

describe("stjerner omsat til score", () => {
  /**
   * BUNDEN ER 0 OG IKKE 20. Et gennemsnit på 1,0 er den dårligst mulige
   * vurdering. En simpel division med 5 ville give 20 og dermed antyde, at
   * der stadig var noget at komme efter.
   */
  it("lægger bunden af skalaen i 0", () => {
    expect(ratingTilScore(1)).toBe(0);
    expect(ratingTilScore(5)).toBe(100);
    expect(ratingTilScore(3)).toBe(50);
  });

  /**
   * 4,7 giver 93 og ikke 92. (4,7 - 1) / 4 = 92,5, som runder OP. Tallet står
   * her, fordi det er den slags, nogen senere retter til 92 for at få det til
   * at passe med et eksempel i en gammel note — og så er afrundingen pludselig
   * et andet sted end i resten af huset.
   */
  it("giver 93 for et snit på 4,7", () => {
    expect(ratingTilScore(4.7)).toBe(93);
  });

  /** En selvvalgt skala skal kunne bruges — fx 0-10. */
  it("kan regne på en anden skala", () => {
    expect(ratingTilScore(8, 10, 0)).toBe(80);
    expect(ratingTilScore(0, 10, 0)).toBe(0);
  });

  it("siger fra ved en umulig skala frem for at dividere med nul", () => {
    expect(ratingTilScore(4, 1, 1)).toBeNull();
    expect(ratingTilScore(Number.NaN)).toBeNull();
    expect(ratingTilScore(4, Number.POSITIVE_INFINITY)).toBeNull();
  });
});

describe("kundeoplevelserne", () => {
  it("regner gennemsnittet af fordelingen", () => {
    expect(gennemsnit(fordeling({ 5: 3, 4: 1 }))).toBeCloseTo(4.75, 5);
  });

  /** Null og ikke 0: forskellen på "ingen data" og "elendig". */
  it("giver null uden oplevelser", () => {
    expect(gennemsnit(fordeling())).toBeNull();
    expect(andele(fordeling())).toBeNull();
  });

  it("deler i positiv, neutral og negativ ved 4 og 3", () => {
    const a = andele(fordeling({ 5: 80, 4: 11, 3: 6, 2: 2, 1: 1 }))!;
    expect(a.positiv).toBe(91);
    expect(a.neutral).toBe(6);
    expect(a.negativ).toBe(3);
  });

  /**
   * DE TRE SKAL SUMME TIL 100. Tre uafhængige afrundinger giver ellers 101
   * på skærmen, og det er den slags, en bruger tæller efter.
   */
  it("lader altid de tre andele summe til 100", () => {
    for (const f of [
      fordeling({ 5: 1, 4: 1, 3: 1 }),
      fordeling({ 5: 7, 3: 7, 1: 7 }),
      fordeling({ 4: 1, 3: 1, 2: 1, 1: 1 }),
      fordeling({ 5: 333, 3: 333, 1: 333 }),
    ]) {
      const a = andele(f)!;
      expect(a.positiv + a.neutral + a.negativ, JSON.stringify(f)).toBe(100);
    }
  });
});

describe("feedbackhåndtering", () => {
  it("regner andelen af utilfredse, der er fulgt op på", () => {
    expect(haandteringsScore(10, 8)).toBe(80);
    expect(haandteringsScore(4, 4)).toBe(100);
  });

  /**
   * DEN VIGTIGSTE AF DEM ALLE. Uden negative sager er der intet at følge op
   * på, og delen skal UDGÅ — ikke give 0. Gav den 0, ville den mest tilfredse
   * kundekreds i landet få den dårligste score.
   */
  it("udgår helt, når der ikke er nogen utilfredse", () => {
    expect(haandteringsScore(0, 0)).toBeNull();
  });

  it("kan ikke overstige 100, selv hvis tallene er i utakt", () => {
    expect(haandteringsScore(3, 9)).toBe(100);
    expect(haandteringsScore(3, -2)).toBe(0);
  });
});

describe("eksterne ratings", () => {
  it("normaliserer en enkelt profil", () => {
    expect(eksternScore([profil({ rating: 5, antalAnmeldelser: 10 })])).toBe(100);
    expect(eksternScore([profil({ rating: 3, antalAnmeldelser: 10 })])).toBe(50);
  });

  it("vejer profilerne efter antal anmeldelser", () => {
    const kun5 = eksternScore([profil({ rating: 5, antalAnmeldelser: 400 })])!;
    const blandet = eksternScore([
      profil({ rating: 5, antalAnmeldelser: 400 }),
      profil({ platform: "trustpilot", rating: 3, antalAnmeldelser: 10 }),
    ])!;
    // Den store profil skal trække mest, men den lille skal kunne mærkes.
    expect(blandet).toBeLessThan(kun5);
    expect(blandet).toBeGreaterThan(90);
  });

  /**
   * LOFTET FINDES, FOR AT DEN STØRSTE PROFIL IKKE AFGØR ALT. Uden det ville
   * en Google-profil med 12.000 anmeldelser drukne en Trustpilot-profil med
   * 80, og så var det reelt kun Google, der talte.
   */
  it("lofter hvor meget én profil kan veje", () => {
    const uden = eksternScore([
      profil({ rating: 5, antalAnmeldelser: ANMELDELSER_LOFT }),
      profil({ platform: "trustpilot", rating: 1, antalAnmeldelser: ANMELDELSER_LOFT }),
    ]);
    const med = eksternScore([
      profil({ rating: 5, antalAnmeldelser: 100000 }),
      profil({ platform: "trustpilot", rating: 1, antalAnmeldelser: ANMELDELSER_LOFT }),
    ]);
    // Med loftet vejer de to lige tungt, uanset at den ene har 100.000.
    expect(med).toBe(uden);
    expect(med).toBe(50);
  });

  /** Facebook har ikke stjerner. En anbefalingsprocent ER allerede 0-100. */
  it("bruger anbefalingsprocenten, når der ikke er en rating", () => {
    expect(
      eksternScore([
        profil({
          platform: "facebook",
          rating: null,
          ratingSkala: null,
          anbefalingProcent: 94,
          antalAnmeldelser: 50,
        }),
      ]),
    ).toBe(94);
  });

  /**
   * En profil uden noget normaliserbart tal må ikke flytte scoren — ellers
   * kunne en tom profil bruges til at pynte.
   */
  it("springer profiler uden tal over", () => {
    expect(
      eksternScore([
        profil({ rating: null, ratingSkala: null, anbefalingProcent: null }),
      ]),
    ).toBeNull();
    expect(eksternScore([])).toBeNull();
  });

  it("regner en selvvalgt skala om til 0-100", () => {
    expect(
      eksternScore([
        profil({ platform: "anden", rating: 8, ratingSkala: 10, antalAnmeldelser: 20 }),
      ]),
    ).toBe(80);
  });
});

describe("vægtningen", () => {
  it("regner et almindeligt vejet gennemsnit", () => {
    expect(vejetScore([{ vaegt: 50, vaerdi: 100 }, { vaegt: 50, vaerdi: 0 }])).toBe(50);
  });

  /**
   * OMFORDELINGEN ER HELE POINTEN. Mangler en del, fordeles dens vægt
   * forholdsmæssigt på resten — virksomheden straffes ikke for data, den ikke
   * har. Eksemplet fra specifikationen: 50 og 20 tilbage af 70.
   */
  it("fordeler vægten fra manglende dele på resten", () => {
    const medAlle = vejetScore([
      { vaegt: 50, vaerdi: 90 },
      { vaegt: 20, vaerdi: 60 },
    ]);
    const medHul = vejetScore([
      { vaegt: 50, vaerdi: 90 },
      { vaegt: 20, vaerdi: 60 },
      { vaegt: 30, vaerdi: null },
    ]);
    // Hullet må ikke ændre resultatet — kun fordelingen af det, der er.
    expect(medHul).toBe(medAlle);
    expect(medHul).toBe(Math.round((90 * 50 + 60 * 20) / 70));
  });

  it("giver null, når der slet ikke er noget at regne på", () => {
    expect(vejetScore([])).toBeNull();
    expect(vejetScore([{ vaegt: 50, vaerdi: null }])).toBeNull();
  });

  /** Et urimeligt tal må ikke kunne trække scoren uden for skalaen. */
  it("holder sig inden for 0-100, også med vanvittige input", () => {
    expect(vejetScore([{ vaegt: 1, vaerdi: 5000 }])).toBe(100);
    expect(vejetScore([{ vaegt: 1, vaerdi: -900 }])).toBe(0);
    expect(vejetScore([{ vaegt: 1, vaerdi: Number.NaN }])).toBeNull();
  });

  it("vægtene er dem, forklaringen lover", () => {
    expect(VAEGTE.kundetilfredshed).toBe(50);
    expect(VAEGTE.positiveOplevelser).toBe(20);
    expect(VAEGTE.feedbackhaandtering).toBe(15);
    expect(VAEGTE.eksterneRatings).toBe(15);
    const sum = Object.values(VAEGTE).reduce((a, b) => a + b, 0);
    expect(sum).toBe(100);
  });
});

describe("den samlede beregning", () => {
  const typisk = beregnOmdoemme({
    fordeling: fordeling({ 5: 140, 4: 27, 3: 11, 2: 4, 1: 2 }),
    haandteredeNegative: 5,
    profiler: [profil(), profil({ platform: "trustpilot", rating: 4.5, antalAnmeldelser: 83 })],
  });

  it("giver en score inden for skalaen med en etiket", () => {
    expect(typisk.score).not.toBeNull();
    expect(typisk.score!).toBeGreaterThanOrEqual(0);
    expect(typisk.score!).toBeLessThanOrEqual(100);
    expect(typisk.etiket).toBe(scoreEtiket(typisk.score!));
  });

  it("regner kundescoren med én decimal", () => {
    expect(typisk.kundescore).toBeCloseTo(4.6, 1);
    expect(typisk.antalOplevelser).toBe(184);
  });

  it("tæller de utilfredse og hvor mange der mangler opfølgning", () => {
    expect(typisk.negativeIAlt).toBe(6);
    expect(typisk.uhaandteredeNegative).toBe(1);
  });

  /** Versionen SKAL følge med ud, ellers kan et gemt tal ikke forklares. */
  it("stempler resultatet med formlens version", () => {
    expect(typisk.version).toBe(OMDOEMME_VERSION);
    expect(OMDOEMME_VERSION).toBe("v1");
  });

  /**
   * EN NY VIRKSOMHED HAR IKKE EN DÅRLIG SCORE — den har ingen. Et 0 på en
   * tom konto ville se ud som en meget dårlig virksomhed frem for en ny.
   */
  it("giver ingen score uden data overhovedet", () => {
    const tom = beregnOmdoemme({
      fordeling: fordeling(),
      haandteredeNegative: 0,
      profiler: [],
    });
    expect(tom.score).toBeNull();
    expect(tom.etiket).toBeNull();
    expect(tom.kundescore).toBeNull();
  });

  /**
   * Uden negative sager og uden eksterne profiler skal scoren regnes af de to
   * dele, der ER — og de skal veje 50/20 omregnet til 71/29.
   */
  it("omfordeler vægten, når kun de interne dele findes", () => {
    const r = beregnOmdoemme({
      fordeling: fordeling({ 5: 10 }),
      haandteredeNegative: 0,
      profiler: [],
    });
    expect(r.dele.feedbackhaandtering).toBeNull();
    expect(r.dele.eksterneRatings).toBeNull();
    expect(r.faktiskeVaegte.kundetilfredshed).toBe(71);
    expect(r.faktiskeVaegte.positiveOplevelser).toBe(29);
    expect(r.faktiskeVaegte.feedbackhaandtering).toBe(0);
    // Fem stjerner hele vejen: begge dele er 100, altså 100.
    expect(r.score).toBe(100);
  });

  /**
   * INGEN NEGATIVE SAGER MÅ IKKE STRAFFE. To ellers ens virksomheder, hvor
   * den ene aldrig har haft en utilfreds kunde, må ikke få den laveste score.
   */
  it("straffer ikke en virksomhed uden negative sager", () => {
    const udenNegative = beregnOmdoemme({
      fordeling: fordeling({ 5: 50, 4: 50 }),
      haandteredeNegative: 0,
      profiler: [],
    });
    const medUhaandterede = beregnOmdoemme({
      fordeling: fordeling({ 5: 50, 4: 48, 1: 2 }),
      haandteredeNegative: 0,
      profiler: [],
    });
    expect(udenNegative.score!).toBeGreaterThan(medUhaandterede.score!);
  });

  it("kan ikke give under 0 eller over 100, uanset input", () => {
    for (const f of [
      fordeling({ 1: 100 }),
      fordeling({ 5: 100 }),
      fordeling({ 1: 1, 5: 1 }),
    ]) {
      const r = beregnOmdoemme({
        fordeling: f,
        haandteredeNegative: 999,
        profiler: [profil({ rating: 99, ratingSkala: 5 })],
      });
      expect(r.score!).toBeGreaterThanOrEqual(0);
      expect(r.score!).toBeLessThanOrEqual(100);
    }
  });

  it("bunder i 0 ved lutter ét-stjerner uden opfølgning", () => {
    const r = beregnOmdoemme({
      fordeling: fordeling({ 1: 20 }),
      haandteredeNegative: 0,
      profiler: [],
    });
    expect(r.score).toBe(0);
    expect(r.etiket).toBe("Mulighed for forbedring");
  });
});

describe("datagrundlag og etiketter", () => {
  it("siger fra, når grundlaget er tyndt", () => {
    expect(datagrundlag(0, false)).toBe("begraenset");
    expect(datagrundlag(4, false)).toBe("begraenset");
    expect(datagrundlag(5, false)).toBe("foreloebig");
    expect(datagrundlag(19, false)).toBe("foreloebig");
    expect(datagrundlag(20, false)).toBe("godt");
  });

  /** Kun eksterne tal: scoren vises, men det skal fremgå hvad den hviler på. */
  it("kender tilfældet med kun eksterne ratings", () => {
    expect(datagrundlag(0, true)).toBe("kun-eksternt");
    expect(datagrundlag(3, true)).toBe("begraenset");
  });

  it("giver en etiket i hele skalaen uden alarmsprog", () => {
    expect(scoreEtiket(100)).toBe("Meget stærkt omdømme");
    expect(scoreEtiket(90)).toBe("Meget stærkt omdømme");
    expect(scoreEtiket(89)).toBe("Stærkt omdømme");
    expect(scoreEtiket(80)).toBe("Stærkt omdømme");
    expect(scoreEtiket(79)).toBe("Godt omdømme");
    expect(scoreEtiket(70)).toBe("Godt omdømme");
    expect(scoreEtiket(69)).toBe("Stabilt omdømme");
    expect(scoreEtiket(60)).toBe("Stabilt omdømme");
    expect(scoreEtiket(0)).toBe("Mulighed for forbedring");
    // Ingen af dem må lyde alarmerende.
    for (const n of [0, 10, 30, 59]) {
      expect(scoreEtiket(n)).toBe("Mulighed for forbedring");
    }
  });
});

describe("afrunding", () => {
  /** Ét sted at afrunde, så to visninger af samme tal ikke bliver uenige. */
  it("runder ens og holder sig inden for skalaen", () => {
    expect(afrund(88.5)).toBe(89);
    expect(afrund(88.4)).toBe(88);
    expect(afrund(-3)).toBe(0);
    expect(afrund(140)).toBe(100);
    expect(afrund(Number.NaN)).toBe(0);
  });
});

describe("validering af eksterne profiler", () => {
  const gyldig = {
    platform: "google",
    rating: 4.6,
    ratingSkala: 5,
    antalAnmeldelser: 281,
    anbefalingProcent: null,
    profilUrl: "https://maps.google.com/butik",
    visningsnavn: null,
  };

  it("godtager en almindelig profil", () => {
    expect(valider(gyldig)).toEqual([]);
  });

  it("afviser en rating over skalaen", () => {
    expect(valider({ ...gyldig, rating: 9 })).toHaveLength(1);
    expect(valider({ ...gyldig, rating: -1 })).toHaveLength(1);
  });

  it("afviser en skala på nul", () => {
    expect(valider({ ...gyldig, ratingSkala: 0 }).length).toBeGreaterThan(0);
  });

  it("afviser negativt antal anmeldelser", () => {
    expect(valider({ ...gyldig, antalAnmeldelser: -5 })).toHaveLength(1);
  });

  it("afviser en anbefalingsprocent uden for 0-100", () => {
    const fb = {
      ...gyldig,
      platform: "facebook",
      rating: null,
      ratingSkala: null,
    };
    expect(valider({ ...fb, anbefalingProcent: 140 })).toHaveLength(1);
    expect(valider({ ...fb, anbefalingProcent: 94 })).toEqual([]);
  });

  it("kræver enten en rating eller en anbefalingsprocent", () => {
    expect(
      valider({ ...gyldig, rating: null, ratingSkala: null }).length,
    ).toBeGreaterThan(0);
  });

  it("afviser et ugyldigt link", () => {
    expect(valider({ ...gyldig, profilUrl: "ikke en adresse" })).toHaveLength(1);
    // Tomt link er i orden — det er valgfrit.
    expect(valider({ ...gyldig, profilUrl: "" })).toEqual([]);
  });

  it("kræver et navn, når platformen er 'anden'", () => {
    expect(
      valider({ ...gyldig, platform: "anden", visningsnavn: null }),
    ).toHaveLength(1);
    expect(
      valider({ ...gyldig, platform: "anden", visningsnavn: "Booking.com" }),
    ).toEqual([]);
  });

  it("afviser en ukendt platform", () => {
    expect(valider({ ...gyldig, platform: "myspace" })).toHaveLength(1);
  });

  /** NaN og Infinity må aldrig nå beregningen. */
  it("afviser tal, der ikke er tal", () => {
    expect(valider({ ...gyldig, rating: Number.NaN }).length).toBeGreaterThan(0);
    expect(
      valider({ ...gyldig, antalAnmeldelser: Number.POSITIVE_INFINITY }).length,
    ).toBeGreaterThan(0);
  });
});

describe("den offentlige kundescore", () => {
  /**
   * SLÅET FRA ER SLÅET FRA. Funktionen kan ikke vise noget, den ikke får
   * besked på at vise — uanset hvor god scoren er. Det er samme greb som
   * `reviewChoices()`, der ikke tager bedømmelsen som argument: en funktion,
   * der ikke kender oplysningen, kan ikke komme til at bruge den.
   */
  it("viser ingenting, når virksomheden ikke har slået det til", () => {
    expect(offentligKundescore(fordeling({ 5: 500 }), false)).toBeNull();
  });

  /**
   * MINIMUMSGRÆNSEN. Under fem oplevelser kan én utilfreds kunde flytte
   * gennemsnittet et helt point. Et tal, vi selv kalder for tyndt internt, må
   * ikke stå ude hos kunderne som en vurdering af butikken.
   */
  it("viser ingenting under minimumsgrænsen", () => {
    expect(offentligKundescore(fordeling({ 5: 4 }), true)).toBeNull();
    expect(offentligKundescore(fordeling({ 5: OFFENTLIG_MINIMUM }), true)).not.toBeNull();
  });

  it("markerer scoren som foreløbig mellem minimum og godt datagrundlag", () => {
    expect(offentligKundescore(fordeling({ 5: 5 }), true)!.foreloebig).toBe(true);
    expect(offentligKundescore(fordeling({ 5: 19 }), true)!.foreloebig).toBe(true);
    expect(offentligKundescore(fordeling({ 5: 20 }), true)!.foreloebig).toBe(false);
  });

  it("giver gennemsnittet med én decimal og antallet med", () => {
    const r = offentligKundescore(fordeling({ 5: 80, 4: 11, 3: 6, 2: 2, 1: 1 }), true)!;
    expect(r.score).toBeCloseTo(4.7, 1);
    expect(r.antal).toBe(100);
  });

  /**
   * DEN VIGTIGSTE. Den offentlige score er kundernes egne stjerner gennem
   * LoyalSum — intet andet. Funktionen tager slet ikke eksterne profiler ind,
   * så et tal, butikken selv har indtastet, kan ikke havne i det, der står
   * offentligt. En offentlig score med selvoplyste tal ville være et
   * selvportræt med vores navn under.
   */
  it("kan ikke påvirkes af eksterne ratings", () => {
    // Signaturen tager kun fordelingen. Der ER ingen vej ind for eksterne tal.
    expect(offentligKundescore.length).toBe(2);
    const kun = offentligKundescore(fordeling({ 3: 30 }), true)!;
    expect(kun.score).toBe(3);
  });

  it("foreslår først offentlig visning, når grundlaget er der", () => {
    expect(klarTilOffentligVisning(fordeling({ 5: 4 }), false)).toBe(false);
    expect(klarTilOffentligVisning(fordeling({ 5: 5 }), false)).toBe(true);
    // Er den slået til, er der intet at foreslå.
    expect(klarTilOffentligVisning(fordeling({ 5: 50 }), true)).toBe(false);
  });

  /**
   * LOYALSUM ER IKKE EN CERTIFICERINGSMYNDIGHED. "Verificeret" ville påstå,
   * at vi har efterprøvet noget, vi ikke har. Prøven står her, fordi den
   * slags ord sniger sig ind, når nogen vil have teksten til at lyde
   * stærkere — og det ville være en påstand, vi ikke kan bakke op.
   */
  it("bruger ikke ord, der lyder som en godkendelse", () => {
    const tekster = [
      OFFENTLIG_TEKST.overskrift,
      OFFENTLIG_TEKST.kilde,
      OFFENTLIG_TEKST.foreloebig,
      OFFENTLIG_TEKST.grundlag(86),
    ].join(" ").toLowerCase();

    for (const ord of FORBUDTE_ORD) {
      expect(tekster, ord).not.toContain(ord);
    }
  });

  /** Antallet skal ALTID med — et gennemsnit uden grundlag er en påstand. */
  it("skriver altid antallet af kundeoplevelser", () => {
    expect(OFFENTLIG_TEKST.grundlag(86)).toContain("86");
    expect(OFFENTLIG_TEKST.grundlag(1)).toContain("kundeoplevelse");
    expect(OFFENTLIG_TEKST.grundlag(2)).toContain("kundeoplevelser");
  });
});

describe("den offentlige periode og nudgen", () => {
  /**
   * RULLENDE 12 MÅNEDER. Den interne score dækker hele historikken — det er
   * to forskellige spørgsmål. Udadtil skal tallet sige noget om, hvordan
   * butikken er NU, og en femstjernet periode fra for tre år siden skal ikke
   * kunne bære et tal, en kunde læser i dag.
   */
  it("regner perioden 12 måneder tilbage", () => {
    const nu = new Date("2026-09-05T12:00:00Z");
    const start = offentligPeriodeStart(nu);
    expect(start.getUTCFullYear()).toBe(2025);
    expect(start.getUTCMonth()).toBe(8); // september (0-indekseret)
    expect(OFFENTLIG_PERIODE_MAANEDER).toBe(12);
  });

  /** Årsskiftet må ikke give en dato i fremtiden eller en måned forkert. */
  it("håndterer årsskiftet", () => {
    const start = offentligPeriodeStart(new Date("2026-01-15T12:00:00Z"));
    expect(start.getUTCFullYear()).toBe(2025);
    expect(start.getUTCMonth()).toBe(0); // januar
    expect(start.getTime()).toBeLessThan(new Date("2026-01-15T12:00:00Z").getTime());
  });

  /** Perioden SKAL stå i teksten — ellers kan tallet være fra hvornår som helst. */
  it("skriver perioden sammen med antallet", () => {
    const t = OFFENTLIG_TEKST.grundlag(67);
    expect(t).toContain("67");
    expect(t).toContain("12 måneder");
  });

  /**
   * NUDGEN KRÆVER BÅDE MÆNGDE OG KVALITET. Et forslag ved fem oplevelser
   * ville være en opfordring til at offentliggøre et tyndt tal, og et forslag
   * ved 4,1 ville være en opfordring til at offentliggøre noget, butikken
   * formentlig ikke vil vise.
   */
  it("foreslår kun offentlig visning ved både nok data og stærk score", () => {
    expect(boerForeslaaOffentlig(20, 4.5, false)).toBe(true);
    expect(boerForeslaaOffentlig(19, 4.9, false)).toBe(false);
    expect(boerForeslaaOffentlig(200, 4.4, false)).toBe(false);
    expect(boerForeslaaOffentlig(200, null, false)).toBe(false);
  });

  /** Er den allerede slået til, er der intet at foreslå. */
  it("foreslår ikke noget, når visningen allerede er slået til", () => {
    expect(boerForeslaaOffentlig(500, 5, true)).toBe(false);
  });

  /**
   * NUDGEN ÆNDRER INTET VED MÅLINGEN. Den er en ren funktion af tal, vi
   * allerede har — den kan ikke røre hverken flowet eller beregningen. Prøven
   * står her som en påmindelse: får den nogensinde en bivirkning, er det et
   * brud på, at alle måles ens.
   */
  it("er en ren aflæsning uden bivirkninger", () => {
    const fordeling1 = fordeling({ 5: 30 });
    const foer = beregnOmdoemme({
      fordeling: fordeling1,
      haandteredeNegative: 0,
      profiler: [],
    });
    boerForeslaaOffentlig(30, 5, false);
    const efter = beregnOmdoemme({
      fordeling: fordeling1,
      haandteredeNegative: 0,
      profiler: [],
    });
    expect(efter).toEqual(foer);
  });

  /** Negative vurderinger skal tælle med — ikke filtreres fra. */
  it("tæller negative vurderinger med i den offentlige score", () => {
    const kun5 = offentligKundescore(fordeling({ 5: 10 }), true)!;
    const medEn1 = offentligKundescore(fordeling({ 5: 10, 1: 1 }), true)!;
    expect(medEn1.score).toBeLessThan(kun5.score);
    expect(medEn1.antal).toBe(11);
  });
});
