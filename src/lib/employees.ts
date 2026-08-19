/**
 * Rene hjælpere til medarbejder-administration.
 *
 * De ligger for sig, fordi de kan afprøves uden database og server-actions —
 * og fordi rettighederne læses det samme sted både ved oprettelse og ved
 * rettelse. Ellers ville et nyt flag nemt blive husket ét af stederne.
 */

export interface EmployeePermissions {
  can_stamp: boolean;
  can_discount: boolean;
  can_redeem: boolean;
}

/** Rettigheder en medarbejder kan få. `can_manage` er bevidst ikke iblandt. */
export const PERMISSION_FIELDS = [
  {
    name: "can_stamp",
    label: "Give stempler",
    help: "Kan sætte stempler på kundernes kort.",
  },
  {
    name: "can_redeem",
    label: "Indløse belønninger",
    help: "Kan markere en optjent belønning som brugt.",
  },
  {
    name: "can_discount",
    label: "Give rabatter",
    help: "Kan give en kunde en rabat — også som kompensation.",
  },
] as const;

/**
 * Læser rettighederne af en formular.
 *
 * Et afkrydsningsfelt sendes slet ikke med, når det er slået fra, så fraværet
 * betyder false. Derfor må feltet ikke bare "mangle" — det skal sættes
 * eksplicit, ellers ville en fjernet rettighed blive stående i databasen.
 */
export function readPermissions(form: {
  get(name: string): FormDataEntryValue | null;
}): EmployeePermissions {
  return {
    can_stamp: form.get("can_stamp") !== null,
    can_redeem: form.get("can_redeem") !== null,
    can_discount: form.get("can_discount") !== null,
  };
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/**
 * Rummelig kontrol: der skal være et navn, et snabel-a og et punktum i
 * domænet. Vi afviser ikke adresser, vi ikke forstår — mailen selv afgør, om
 * den kan leveres, og en for streng kontrol ville spærre for rigtige adresser.
 */
export function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

/** Kort opsummering af hvad en medarbejder må, til visning i listen. */
export function permissionSummary(p: EmployeePermissions): string {
  const dele = PERMISSION_FIELDS.filter(
    (f) => p[f.name as keyof EmployeePermissions],
  ).map((f) => f.label.toLowerCase());
  if (dele.length === 0) return "Ingen rettigheder";
  if (dele.length === 1) return `Må ${dele[0]}`;
  return `Må ${dele.slice(0, -1).join(", ")} og ${dele[dele.length - 1]}`;
}
