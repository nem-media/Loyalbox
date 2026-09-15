import { describe, it, expect } from "vitest";
import { periodRange, previousRange, parsePeriod, PERIODS } from "./period";
import { dagStartKoebenhavn, iDagDatoKoebenhavn } from "./dansk-dag";

/**
 * "I DAG" SKAL VÆRE BUTIKKENS DAG.
 *
 * FEJLEN, FUNDET 2026-09-15: `periodRange("today")` begyndte ved midnat UTC.
 * Om sommeren er det kl. 02 dansk tid, og det rammer værst dér, hvor tallet
 * bliver læst — **åbnede en cafeejer dashboardet kl. 00:30 efter lukketid,
 * begyndte "I dag" kl. 02:00 DAGEN FØR**, så næsten hele gårsdagen stod under
 * overskriften "I dag". I almindelig åbningstid manglede til gengæld døgnets
 * to første timer, hvilket rammer enhver, der har åbent hen over midnat.
 *
 * Tallet var ikke bare skævt — det var et ANDET DØGN, og intet i
 * brugerfladen kunne afsløre det.
 *
 * Prøverne herunder giver `now` med, så vinduerne kan efterprøves uden at
 * vente på et døgnskifte — og de prøver begge sider af sommertiden, fordi et
 * fast timetal ville passe det halve år og lyve det andet.
 */

/** Kort dansk visning af et tidspunkt, så en fejl kan læses i beskeden. */
const dansk = (iso: string) =>
  new Intl.DateTimeFormat("da-DK", {
    timeZone: "Europe/Copenhagen",
    dateStyle: "short",
    timeStyle: "short",
  })
    .format(new Date(iso))
    // Formateringen sætter et komma mellem dato og klokkeslæt; det er kun støj
    // i en fejlbesked.
    .replace(",", "");

describe('perioden "i dag"', () => {
  /** 16. sep. kl. 00:30 dansk = 15. sep. kl. 22:30 UTC. Selve fælden. */
  const efterMidnat = new Date("2026-09-15T22:30:00Z");

  it("begynder ved midnat DANSK tid og ikke ved midnat UTC", () => {
    const { from } = periodRange("today", efterMidnat);
    expect(dansk(from)).toBe("16.09.2026 00.00");
  });

  /**
   * KL. 00:30 ER DER EN HALV TIMES DATA — IKKE ET DØGNS.
   *
   * Det er den skarpeste måde at sige fejlen på. Den gamle kode begyndte
   * vinduet 15-09 kl. 02:00 dansk, så "I dag" spændte over 22½ time og var
   * reelt gårsdagens tal. Den nye begynder 16-09 kl. 00:00, og vinduet er
   * præcis så langt, som butikken har haft åbent i dag.
   */
  it("er en halv time langt en halv time inde i døgnet", () => {
    const { from, to } = periodRange("today", efterMidnat);
    const minutter =
      (new Date(to).getTime() - new Date(from).getTime()) / 60_000;
    expect(minutter).toBe(30);
  });

  it("mister ikke døgnets første timer midt på dagen", () => {
    const formiddag = new Date("2026-09-16T06:00:00Z"); // kl. 08 dansk
    const { from } = periodRange("today", formiddag);
    expect(dansk(from)).toBe("16.09.2026 00.00");
  });

  /** Vintertid: UTC+1. Et fast "+02:00" ville tage en time for meget. */
  it("følger med over sommertidsskiftet", () => {
    const vinter = new Date("2026-01-15T10:00:00Z");
    expect(dansk(periodRange("today", vinter).from)).toBe("15.01.2026 00.00");
    const sommer = new Date("2026-07-15T10:00:00Z");
    expect(dansk(periodRange("today", sommer).from)).toBe("15.07.2026 00.00");
  });

  it("slutter nu", () => {
    const { to } = periodRange("today", efterMidnat);
    expect(to).toBe(efterMidnat.toISOString());
  });
});

describe('"i går" som sammenligning', () => {
  const efterMidnat = new Date("2026-09-15T22:30:00Z");

  it("dækker hele det foregående danske døgn", () => {
    const nu = periodRange("today", efterMidnat);
    const foer = previousRange("today", efterMidnat);
    expect(dansk(foer.from)).toBe("15.09.2026 00.00");
    // Og slutter præcis dér, hvor i dag begynder — ingen huller, ingen overlap.
    expect(foer.to).toBe(nu.from);
  });

  /**
   * DEN DAG, HVOR ET DØGN IKKE ER 24 TIMER. Sommertiden slutter søndag den
   * 25. oktober 2026, hvor døgnet er 25 timer. Et fast fradrag på 86400000 ms
   * ville derfor lande kl. 01:00 den 25. og ikke ved midnat — og "i går" ville
   * mangle sin første time.
   */
  it("rammer midnat også på en dag med 25 timer", () => {
    const efterSkiftet = new Date("2026-10-26T08:00:00Z"); // 26. okt., vintertid
    const foer = previousRange("today", efterSkiftet);
    expect(dansk(foer.from)).toBe("25.10.2026 00.00");
  });
});

describe("de rullende perioder", () => {
  it("måler bagud fra nu og ikke fra midnat", () => {
    const nu = new Date("2026-09-16T06:00:00Z");
    const { from, to } = periodRange("7", nu);
    expect(to).toBe(nu.toISOString());
    expect(from).toBe("2026-09-09T06:00:00.000Z");
  });

  it("den foregående periode er lige så lang og støder op til", () => {
    const nu = new Date("2026-09-16T06:00:00Z");
    const p = periodRange("30", nu);
    const f = previousRange("30", nu);
    expect(f.to).toBe(p.from);
    expect(new Date(p.from).getTime() - new Date(f.from).getTime()).toBe(
      new Date(p.to).getTime() - new Date(p.from).getTime(),
    );
  });
});

describe("parsePeriod", () => {
  it("tager kun de kendte værdier", () => {
    for (const p of PERIODS) expect(parsePeriod(p)).toBe(p);
  });

  it("falder tilbage til 30 dage på alt andet", () => {
    for (const v of [undefined, "", "365", "i går", "<script>"]) {
      expect(parsePeriod(v)).toBe("30");
    }
  });
});

describe("dansk-dag er ét svar og ikke tre", () => {
  it("dagens dato og dagens begyndelse er enige", () => {
    const t = new Date("2026-09-15T22:30:00Z");
    expect(dagStartKoebenhavn(t).startsWith(iDagDatoKoebenhavn(t))).toBe(true);
  });

  it("bærer sin egen forskydning, så basen ikke skal gætte", () => {
    expect(dagStartKoebenhavn(new Date("2026-07-15T10:00:00Z"))).toMatch(
      /T00:00:00\.000\+02:00$/,
    );
    expect(dagStartKoebenhavn(new Date("2026-01-15T10:00:00Z"))).toMatch(
      /T00:00:00\.000\+01:00$/,
    );
  });
});
