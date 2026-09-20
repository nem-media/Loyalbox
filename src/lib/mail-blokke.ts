/**
 * MAILENS TEKST ER KILDEN — HTML'EN UDLEDES AF DEN.
 *
 * Kundemailene er skrevet som linjer, og hver eneste formulering er vejet:
 * beløbene, svarløftet, hvad der loves om levering. En HTML-udgave skrevet
 * ved siden af ville være to beskrivelser af samme mail bygget på hvert sit
 * datasæt — nøjagtig dét, ordrevarslet og ordrebekræftelsen deler ÉT
 * datasæt for at undgå, fordi det er kundens udgave, der bliver troet på.
 *
 * Derfor læses teksten her i stedet, og BEGGE udgaver kommer ud af den. Et
 * ord kan kun rettes ét sted, og `text`-delen af mailen ER den tekst, der
 * altid har været sendt — så en klient, der viser ren tekst, får præcis det
 * samme som før.
 *
 * GRAMMATIKKEN ER IKKE OPFUNDET HER. Den står allerede i mailene, og den er
 * ens i dem alle:
 *
 *   Hej Café Aurora                 ← hilsen: første linje, starter med "Hej"
 *                                   ← tom linje skiller blokke
 *   Vare:      LoyalSum Komplet     ← etiket + flere mellemrum + værdi
 *   Betalt nu: 399 kr. ex moms         (justeret op, altså en TABEL)
 *
 *   Sendes til:                     ← overskrift
 *     Café Aurora                   ←   to mellemrum: en VÆRDI
 *     Bredgade 1
 *
 *   Hvad sker der nu?               ← overskrift uden indrykning under
 *   Vi går i gang med at …
 *
 *   Venlig hilsen                   ← underskrift
 *   LoyalSum
 *
 * DEN FARLIGE FEJL ER IKKE ET GRIMT AFSNIT — det er en linje, der
 * FORSVINDER, fordi den ikke passede i et mønster. `mail-skabelon.test.ts`
 * kræver derfor, at hver eneste ikke-tomme linje kan findes igen i HTML'en,
 * for hver af de rigtige mails. En pæn mail, der har tabt leveringsadressen,
 * er værre end en grim, der har den med.
 */

export type Blok =
  | { slags: "hilsen"; tekst: string }
  | { slags: "afsnit"; linjer: string[] }
  | { slags: "overskrift"; tekst: string; linjer: string[] }
  | { slags: "tabel"; raekker: { etiket: string; vaerdi: string }[] }
  | { slags: "vaerdier"; etiket: string | null; vaerdier: string[] }
  | { slags: "link"; etiket: string | null; url: string }
  | { slags: "hilsenTil"; hilsen: string; navn: string };

/**
 * En etiket, et kolon og en værdi.
 *
 * ANTALLET AF MELLEMRUM SIGER INGENTING — det er JUSTERINGEN, der gør det til
 * en opstilling. Første udgave krævede to mellemrum eller flere, og den faldt
 * på den rigtige ordrebekræftelse: kolonnen er rettet ind efter den LÆNGSTE
 * etiket, så netop den linje har præcis ét mellemrum ("Betalt nu: 399 kr."),
 * mens naboen har seks. Kvitteringen blev derfor til tre løse sætninger.
 *
 * Kravet står i stedet i `laesBlokke`: alle værdier skal begynde i SAMME
 * kolonne. Det er dét, der skiller en opstilling fra to sætninger, der
 * tilfældigvis begge har et kolon.
 */
const TABELLINJE = /^([^:]{1,24}):[ ]+(.+)$/;

/** Indrykket med præcis to mellemrum: en værdi under linjen over. */
const VAERDI = /^ {2}(\S.*)$/;

const ER_URL = /^https?:\/\/\S+$/;

/**
 * EN HÅRD OMBRYDNING ER IKKE ET NYT AFSNIT.
 *
 * Sletningsmailene — de tre juridiske — er skrevet med linjeskift midt i
 * sætningerne, fordi de er sat op til at blive læst som ren tekst i en fast
 * bredde: "Det omfatter dine kunders stempelkort, stempler, pointsaldi og" /
 * "pointhistorik, al feedback, …". Hver linje som sit eget afsnit ville
 * brække teksten midt i en opremsning af præcis dét, kunden er ved at slette.
 *
 * SIGNALET ER, OM LINJEN SLUTTER EN SÆTNING. En linje, der ender på "og"
 * eller "dine", er brudt af bredden og fortsætter; en, der ender på punktum,
 * kolon eller spørgsmålstegn, er sat af skribenten. Det er den samme skelnen,
 * `format=flowed` laver med et mellemrum i enden — og vores tekster har ikke
 * det mellemrum, så enden af sætningen er dét, der er tilbage at læse på.
 *
 * Bemærk, at "Hvad sker der nu?" derfor BEVARER sine to linjer som to
 * afsnit: begge er hele sætninger, og de er skrevet som to.
 */
const SLUTTER_SAETNING = /[.!?:;»"')\]]$/;

function sammenfoej(linjer: string[]): string[] {
  const ud: string[] = [];
  for (const linje of linjer) {
    const forrige = ud[ud.length - 1];
    if (forrige !== undefined && !SLUTTER_SAETNING.test(forrige)) {
      ud[ud.length - 1] = `${forrige} ${linje}`;
    } else {
      ud.push(linje);
    }
  }
  return ud;
}

/** Kun de to ord, mailene rent faktisk underskriver med. */
const HILSEN = /^(Venlig hilsen|Med venlig hilsen)$/;

/**
 * Deler teksten i blokke.
 *
 * Rækkefølgen er ikke ligegyldig: en blok kan passe på flere mønstre, og det
 * SMALLESTE skal prøves først. "Din QR-adresse:" er både en kort linje, der
 * slutter med kolon, og en overskrift med en værdi under — og det er værdien,
 * der gør den til andet end et afsnit.
 */
export function laesBlokke(tekst: string): Blok[] {
  const blokke: Blok[] = [];

  /* Tomme linjer skiller. Et afsnit er altså en stribe linjer i træk. */
  const stykker = tekst
    .split("\n")
    .reduce<string[][]>(
      (ud, linje) => {
        if (linje.trim() === "") {
          if (ud[ud.length - 1].length) ud.push([]);
        } else {
          ud[ud.length - 1].push(linje);
        }
        return ud;
      },
      [[]],
    )
    .filter((s) => s.length > 0);

  for (const [i, linjer] of stykker.entries()) {
    /* 1. UNDERSKRIFTEN. To linjer, hvor den første er hilsenen. */
    if (linjer.length === 2 && HILSEN.test(linjer[0].trim())) {
      blokke.push({
        slags: "hilsenTil",
        hilsen: linjer[0].trim(),
        navn: linjer[1].trim(),
      });
      continue;
    }

    /* 2. HILSENEN. Kun den allerførste blok, og kun hvis den ÅBNER med Hej —
       "Hej" inde i en sætning længere nede er ikke en hilsen. */
    if (i === 0 && linjer.length === 1 && /^Hej\b/.test(linjer[0])) {
      blokke.push({ slags: "hilsen", tekst: linjer[0].trim() });
      continue;
    }

    /* 3. TABELLEN. ALLE linjer skal passe, og der skal være mindst to —
       én enkelt "Vare:   X" er en oplysning og ikke en opstilling. */
    const raekker = linjer.map((l) => TABELLINJE.exec(l));
    const kolonner = raekker.map((m) => (m ? m[0].length - m[2].length : -1));
    if (
      linjer.length >= 2 &&
      raekker.every(Boolean) &&
      kolonner.every((k) => k === kolonner[0])
    ) {
      blokke.push({
        slags: "tabel",
        raekker: raekker.map((m) => ({
          etiket: m![1].trim(),
          vaerdi: m![2].trim(),
        })),
      });
      continue;
    }

    /* 4. VÆRDIER UNDER EN ETIKET. Den første linje er ikke indrykket, resten
       er. Er der KUN indrykkede linjer, står de uden etiket. */
    const foerste = VAERDI.exec(linjer[0]);
    const resten = linjer.slice(1).map((l) => VAERDI.exec(l));
    if (!foerste && resten.length > 0 && resten.every(Boolean)) {
      const vaerdier = resten.map((m) => m![1]);
      const etiket = linjer[0].trim();

      /* En adresse ER et link, og det skal kunne ses HVOR det fører hen —
         se `mailHtml` for hvorfor der ikke står "Klik her". */
      if (vaerdier.length === 1 && ER_URL.test(vaerdier[0])) {
        blokke.push({ slags: "link", etiket, url: vaerdier[0] });
      } else {
        blokke.push({ slags: "vaerdier", etiket, vaerdier });
      }
      continue;
    }

    if (foerste && linjer.every((l) => VAERDI.test(l))) {
      const vaerdier = linjer.map((l) => VAERDI.exec(l)![1]);
      blokke.push(
        vaerdier.length === 1 && ER_URL.test(vaerdier[0])
          ? { slags: "link", etiket: null, url: vaerdier[0] }
          : { slags: "vaerdier", etiket: null, vaerdier },
      );
      continue;
    }

    /* 4b. ADRESSEN UNDER EN ETIKET — UDEN INDRYKNING.
       Ordrebekræftelsen rykker sine adresser ind med to mellemrum;
       sletningsmailene gør ikke ("Bekræft med dette link:" og så adressen i
       venstre kant). Betydningen er den samme, og en kunde, der skal
       bekræfte en sletning, skal have det samme tydelige panel som en, der
       skal oprette sin adgang. Kun ÉT link og kun lige under etiketten —
       ellers ville en hvilken som helst adresse midt i et afsnit blive
       revet ud af sin sætning. */
    if (
      linjer.length === 2 &&
      !foerste &&
      /:$/.test(linjer[0].trim()) &&
      ER_URL.test(linjer[1].trim())
    ) {
      blokke.push({
        slags: "link",
        etiket: linjer[0].trim(),
        url: linjer[1].trim(),
      });
      continue;
    }

    /* 5. OVERSKRIFT MED AFSNIT UNDER. "Hvad sker der nu?" er kort, slutter
       med et spørgsmålstegn og har sætninger under sig — den skal ikke stå
       som første sætning i et afsnit, for så er den ikke en overskrift.
       Grænsen på 60 tegn er dér, fordi en overskrift, man kan tage fejl af
       en sætning, ikke hjælper nogen. */
    if (
      linjer.length >= 2 &&
      linjer[0].length <= 60 &&
      /[:?]$/.test(linjer[0].trim())
    ) {
      blokke.push({
        slags: "overskrift",
        tekst: linjer[0].trim(),
        linjer: sammenfoej(linjer.slice(1).map((l) => l.trim())),
      });
      continue;
    }

    /* 6. ALT ANDET ER ET AFSNIT — og det er med vilje den sidste udvej.
       En linje, der ikke passer i et mønster, skal stadig MED. */
    blokke.push({
      slags: "afsnit",
      linjer: sammenfoej(linjer.map((l) => l.trim())),
    });
  }

  return blokke;
}
