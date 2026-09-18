import type { Database, DestinationType } from "@/lib/types/database";

type Stand = Database["public"]["Tables"]["stands"]["Row"];

export interface Destination {
  url: string | null;
  type: DestinationType;
  label: string;
}

const LABELS: Record<DestinationType, string> = {
  google: "Anmeld os på Google",
  trustpilot: "Anmeld os på Trustpilot",
  facebook: "Anmeld os på Facebook",
  custom: "Skriv en anmeldelse",
};

/** De fem kolonner, en destination kan læses ud af. */
export type DestinationFelter = Pick<
  Stand,
  | "destination_type"
  | "google_review_url"
  | "trustpilot_url"
  | "facebook_url"
  | "custom_url"
>;

function urlFor(stand: DestinationFelter, type: DestinationType): string | null {
  switch (type) {
    case "google":
      return stand.google_review_url;
    case "trustpilot":
      return stand.trustpilot_url;
    case "facebook":
      return stand.facebook_url;
    case "custom":
      return stand.custom_url;
  }
}

/**
 * Resolves the public-review destination for a stand. Prefers the configured
 * destination_type, then falls back to the first available link so a negative
 * customer is never blocked from leaving a public review.
 */
export function resolvePublicDestination(stand: Stand): Destination {
  const primary = urlFor(stand, stand.destination_type);
  if (primary) {
    return { url: primary, type: stand.destination_type, label: LABELS[stand.destination_type] };
  }

  const order: DestinationType[] = ["google", "trustpilot", "facebook", "custom"];
  for (const t of order) {
    const u = urlFor(stand, t);
    if (u) return { url: u, type: t, label: LABELS[t] };
  }

  return { url: null, type: stand.destination_type, label: LABELS[stand.destination_type] };
}

/**
 * DEN DESTINATION, KUNDEN FAKTISK HAR VALGT — uden fallback.
 *
 * `resolvePublicDestination` ovenfor er til /r/<slug>, hvor en manglende
 * adresse skal findes et andet sted frem for at spærre en utilfreds kunde ude.
 * Til en FORMULAR er det omvendt: forudfyldes feltet med noget andet end det,
 * der står i den valgte kolonne, viser vi et Trustpilot-link i et felt, der
 * siger Google — og kunden ville rette noget, de ikke havde skrevet.
 *
 * Den ligger her og ikke i den ene side, der først fik brug for den: valget af
 * kolonne ud fra typen stod i forvejen to steder (`urlFor` her og en ternær i
 * /bestil), og en tredje udgave er den slags, der først bliver forkert, når
 * nogen tilføjer en femte destination.
 */
export function valgtDestination(
  stand: DestinationFelter,
): { type: DestinationType; url: string } | undefined {
  const url = urlFor(stand, stand.destination_type);
  return url ? { type: stand.destination_type, url } : undefined;
}

export interface ReviewLink {
  type: DestinationType;
  url: string;
  /** Kort label til knappen, fx "Google". */
  platform: string;
  /**
   * Entydig nøgle til React-lister.
   *
   * NØDVENDIG, FORDI `type` IKKE LÆNGERE ER ENTYDIG: to egne platforme er
   * begge `custom`, og to ens `key` i en liste får React til at genbruge det
   * forkerte element — knappen ville kunne pege på den anden platforms
   * adresse. Falder tilbage på `type` for de tre kendte, som er entydige.
   */
  key?: string;
}

const PLATFORM_NAMES: Record<DestinationType, string> = {
  google: "Google",
  trustpilot: "Trustpilot",
  facebook: "Facebook",
  custom: "Vores side",
};

/**
 * Butikkens EGNE anmeldelsesplatforme (0032).
 *
 * De tre kendte har hver sin kolonne, fordi VI kender deres navne. Her
 * skriver butikken både navn og adresse — en tandlæge vil på jameda, et
 * værksted på en brancheportal — og dem kan vi ikke forudse.
 *
 * HØJST TO, og det håndhæves også i databasen (0032).
 */
export interface EgenPlatform {
  navn: string;
  url: string;
}

export const MAKS_EGNE_PLATFORME = 2;

/**
 * Navnet står på en knap, butikkens kunder trykker på. Uden en grænse kunne
 * et indsat afsnit sprænge layoutet på en telefon.
 */
export const EGEN_PLATFORM_NAVN_MAKS = 40;

/**
 * HØJST TRE ANMELDELSESKNAPPER PÅ SKÆRMEN.
 *
 * Valgene har alle samme visuelle vægt med vilje — det er dét, der gør flowet
 * neutralt. Men når alt vejer lige meget, er LÆNGDEN af listen det eneste
 * signal tilbage, og syv knapper på en telefon ved en disk vælger reelt for
 * kunden. Grænsen håndhæves, hvor valget træffes (i dashboardet), og ikke ved
 * visningen: et link, butikken kan se i panelet, men som kunden aldrig får,
 * ville være værre end en grænse, der siger fra.
 */
export const MAKS_ANMELDELSESLINKS = 3;

/**
 * Læser jsonb-kolonnen forsvarligt.
 *
 * Kolonnen er `jsonb` og kan i princippet indeholde hvad som helst — en
 * håndredigering i Supabase, en ældre form, en halv skrivning. Anmeldelses-
 * siden er DET, BUTIKKENS KUNDER MØDER, og den må ikke kunne vælte af en
 * uventet værdi. Alt, der ikke er et brugbart par, springes over i stilhed.
 */
export function laesEgnePlatforme(raw: unknown): EgenPlatform[] {
  if (!Array.isArray(raw)) return [];
  const ud: EgenPlatform[] = [];
  for (const p of raw) {
    if (!p || typeof p !== "object") continue;
    const navn = typeof (p as EgenPlatform).navn === "string" ? (p as EgenPlatform).navn.trim() : "";
    const url = typeof (p as EgenPlatform).url === "string" ? (p as EgenPlatform).url.trim() : "";
    if (!navn || !url) continue;
    ud.push({ navn, url });
    if (ud.length === MAKS_EGNE_PLATFORME) break;
  }
  return ud;
}

/**
 * Alle konfigurerede OFFENTLIGE anmeldelses-platforme — kun dem forretningen
 * rent faktisk har udfyldt et link til. Den primære destination lægges først,
 * så review-siden kun viser de valg, forretningen har truffet.
 *
 * Butikkens EGNE platforme kommer efter de kendte, i den rækkefølge de er
 * tilføjet. Grænsen på tre er en sidste skanse: den rigtige afvisning sker,
 * når der gemmes, så butikken selv vælger hvilke tre — frem for at opdage, at
 * den fjerde aldrig blev vist.
 */
export function resolvePublicReviewLinks(stand: Stand): ReviewLink[] {
  const order: DestinationType[] = ["google", "trustpilot", "facebook"];
  const sorted = [
    stand.destination_type,
    ...order.filter((t) => t !== stand.destination_type),
  ].filter((t): t is DestinationType => t !== "custom");

  const links: ReviewLink[] = [];
  for (const t of sorted) {
    const u = urlFor(stand, t);
    if (u) links.push({ type: t, url: u, platform: PLATFORM_NAMES[t] });
  }

  for (const [i, p] of laesEgnePlatforme(stand.egne_platforme).entries()) {
    links.push({ type: "custom", url: p.url, platform: p.navn, key: `egen-${i}` });
  }

  return links.slice(0, MAKS_ANMELDELSESLINKS);
}

/**
 * Valgfrit ekstra link (fx menukort, booking, webshop) — IKKE en anmeldelse.
 * Vises som et selvstændigt link med forretningens egen label ved siden af
 * anmeldelses-valgene. Falder tilbage til "Se mere", hvis der ikke er en label.
 */
export function resolveExtraLink(
  stand: Stand,
): { url: string; label: string } | null {
  if (!stand.custom_url) return null;
  return { url: stand.custom_url, label: stand.custom_label?.trim() || "Se mere" };
}

/**
 * LINKFELTERNE PÅ EN STANDER — OG HVAD DE HEDDER FOR BUTIKKEN.
 *
 * Ét sted, fordi BEGGE veje til de samme fire kolonner skal prøve det samme:
 * butikkens egen side og admins supportformular. Admin er den betroede af de
 * to, men også den, der RETTER en kundes link — en tastefejl dér er præcis
 * lige så dyr, for adressen bliver trykt på et skilt, der ikke kan kaldes
 * tilbage.
 */
export const STANDER_LINKFELTER = [
  ["google_review_url", "Google-linket"],
  ["trustpilot_url", "Trustpilot-linket"],
  ["facebook_url", "Facebook-linket"],
  ["custom_url", "dit eget link"],
] as const;

/**
 * Svarer med en besked, hvis et af linkfelterne ikke er en http(s)-adresse —
 * ellers `null`.
 *
 * **Målt i brugerfladen 2026-09-16:** `ikke-en-url-overhovedet` blev gemt
 * uden en lyd. Adressen er relativ, så kunden, der trykkede "Anmeld os på
 * Google", landede på `/r/ikke-en-url-overhovedet` — en 404 på VORES eget
 * domæne. Kontrollen fandtes i forvejen, men kun på "egne platforme", altså
 * det felt der kom sidst til; de fire oprindelige ved siden af havde den ikke.
 *
 * Den hyppigste rigtige fejl er en glemt `https://`, og derfor siger beskeden
 * præcis dét — og hvilket felt det drejer sig om.
 */
export function tjekStanderLinks(
  laes: (felt: string) => string,
  erGyldigUrl: (v: string) => boolean,
): string | null {
  for (const [felt, navn] of STANDER_LINKFELTER) {
    const v = laes(felt).trim();
    if (v && !erGyldigUrl(v)) {
      return `Tjek ${navn} — det skal begynde med http:// eller https://`;
    }
  }
  return null;
}
