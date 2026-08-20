/**
 * Perioder til statistik.
 *
 * Ligger for sig og ikke i loyalitetsmodulet, fordi både forsiden og
 * stempelkortet måler over de samme vinduer. Lå de to steder, ville "30 dage"
 * med tiden komme til at betyde noget forskelligt de to steder.
 */

export type Period = "today" | "7" | "30" | "90";

export const PERIODS: Period[] = ["today", "7", "30", "90"];

export const PERIOD_LABELS: Record<Period, string> = {
  today: "I dag",
  "7": "7 dage",
  "30": "30 dage",
  "90": "90 dage",
};

/** Hvad den foregående periode hedder, når den nævnes i en sætning. */
export const FORRIGE_LABEL: Record<Period, string> = {
  today: "i går",
  "7": "forrige 7 dage",
  "30": "forrige 30 dage",
  "90": "forrige 90 dage",
};

/** Læser en periode fra en URL. Ukendt værdi falder tilbage til 30 dage. */
export function parsePeriod(value: string | undefined): Period {
  return (PERIODS as string[]).includes(value ?? "")
    ? (value as Period)
    : "30";
}

export function periodRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const to = now.toISOString();
  if (period === "today") {
    return { from: now.toISOString().slice(0, 10) + "T00:00:00.000Z", to };
  }
  const days = parseInt(period, 10);
  return { from: new Date(now.getTime() - days * 86400000).toISOString(), to };
}

/**
 * Den foregående periode af SAMME længde — til at måle udviklingen imod.
 *
 * "I dag" sammenlignes med i går og ikke med de seneste 24 timer: en café
 * sammenligner en formiddag med gårsdagens formiddag, ikke med i nat.
 */
export function previousRange(period: Period): { from: string; to: string } {
  const { from, to } = periodRange(period);
  const start = new Date(from);

  if (period === "today") {
    const igaar = new Date(start.getTime() - 86400000);
    return {
      from: igaar.toISOString().slice(0, 10) + "T00:00:00.000Z",
      to: from,
    };
  }

  const laengde = new Date(to).getTime() - start.getTime();
  return { from: new Date(start.getTime() - laengde).toISOString(), to: from };
}
