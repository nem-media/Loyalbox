import type { EmailOtpType } from "@supabase/supabase-js";

/**
 * Fælles regler for de links, auth-mails sender folk ind ad.
 *
 * De bor her i stedet for i den enkelte rute, fordi begge indgange —
 * /auth/callback og /auth/confirm — skal håndhæve præcis de samme regler.
 * Bliver de to steder uenige, opstår hullet netop dér.
 */

/**
 * Hvor må brugeren sendes hen bagefter?
 *
 * `next` kommer fra URL'en og kan derfor være hvad som helst. Kun interne
 * stier accepteres: en absolut URL ville gøre linket til en åben viderestilling,
 * som kunne sende en netop indlogget bruger — og dermed sessionens cookies —
 * hen til en fremmed side. `//eksempel.dk` er også en absolut URL i browserens
 * øjne og afvises derfor sammen med resten.
 */
export function safeNextPath(next: string | null | undefined): string | null {
  if (!next) return null;
  if (!next.startsWith("/")) return null;
  if (next.startsWith("//")) return null;
  // Backslash tolkes som skråstreg af flere browsere: /\eksempel.dk
  if (next.startsWith("/\\")) return null;
  return next;
}

/**
 * Hvilke mailtyper må veksles til en session?
 *
 * Listen er lukket med vilje. `type` kommer fra URL'en og sendes videre til
 * Supabase, og vi vil kun acceptere de flows, produktet rent faktisk sender
 * mails for.
 */
const TILLADTE_TYPER = [
  "recovery",
  "signup",
  "email",
  "email_change",
  "invite",
  "magiclink",
] as const;

export function emailOtpType(type: string | null | undefined): EmailOtpType | null {
  return TILLADTE_TYPER.includes(type as (typeof TILLADTE_TYPER)[number])
    ? (type as EmailOtpType)
    : null;
}
