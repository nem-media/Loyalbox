/**
 * Perioder til statistik.
 *
 * Ligger for sig og ikke i loyalitetsmodulet, fordi både forsiden og
 * stempelkortet måler over de samme vinduer. Lå de to steder, ville "30 dage"
 * med tiden komme til at betyde noget forskelligt de to steder.
 */

import { dagStartKoebenhavn } from "@/lib/dansk-dag";

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

/**
 * "I DAG" ER BUTIKKENS DAG OG IKKE SERVERENS.
 *
 * Der stod før `now.toISOString().slice(0, 10) + "T00:00:00.000Z"`, altså
 * midnat UTC. Om sommeren er det kl. 02 dansk tid, og virkningen var værst
 * netop dér, hvor tallet bliver læst: **åbnede en cafeejer dashboardet kl.
 * 00:30 efter lukketid, begyndte "I dag" kl. 02:00 DAGEN FØR** — så stod
 * næsten hele gårsdagen under overskriften "I dag". I almindelig åbningstid
 * manglede til gengæld de første to timer af døgnet, hvilket rammer enhver,
 * der har åbent hen over midnat.
 *
 * Målt: kl. 00:30 dansk den 16. begyndte vinduet den 15. kl. 02:00.
 *
 * `now` kan gives med, så vinduerne kan prøves uden at vente på et døgnskifte.
 */
export function periodRange(
  period: Period,
  now: Date = new Date(),
): { from: string; to: string } {
  const to = now.toISOString();
  if (period === "today") {
    return { from: dagStartKoebenhavn(now), to };
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
export function previousRange(
  period: Period,
  now: Date = new Date(),
): { from: string; to: string } {
  const { from, to } = periodRange(period, now);
  const start = new Date(from);

  if (period === "today") {
    /*
     * I GÅR ER DAGEN FØR I DANSK TID. Et døgn trukket fra dagens begyndelse
     * lander på gårsdagens begyndelse — undtagen de to gange om året, hvor
     * sommertiden skifter og døgnet er 23 eller 25 timer. Derfor spørges der
     * om dagens begyndelse for et tidspunkt midt i går, frem for at regne.
     */
    const midtIGaar = new Date(start.getTime() - 12 * 3_600_000);
    return { from: dagStartKoebenhavn(midtIGaar), to: from };
  }

  const laengde = new Date(to).getTime() - start.getTime();
  return { from: new Date(start.getTime() - laengde).toISOString(), to: from };
}
