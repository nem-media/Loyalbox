"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLandingPath } from "@/lib/auth";
import { claimCardForUser } from "@/lib/loyalty/member-account";
import { getSiteUrl } from "@/lib/site";

export interface AuthState {
  error?: string;
  /** Sat når Supabase kræver e-mailbekræftelse før der gives en session. */
  needsConfirmation?: boolean;
}

export interface CustomerAuthState {
  error?: string;
  /** Sat når Supabase kræver e-mailbekræftelse før der gives en session. */
  needsConfirmation?: boolean;
}

/**
 * `next` kommer fra et formularfelt og må derfor kun være en intern sti —
 * ellers kunne et manipuleret link sende brugeren videre til et fremmed domæne
 * umiddelbart efter login.
 */
function safeNext(next: string): string | null {
  if (!next.startsWith("/") || next.startsWith("//")) return null;
  return next;
}

export async function login(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "").trim();

  if (!email || !password) {
    return { error: "Udfyld e-mail og adgangskode." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { error: "Forkert e-mail eller adgangskode." };
  }

  // Uden et eksplicit `next` sendes brugeren derhen hvor de hører hjemme:
  // butiksejer/medarbejder → dashboard, slutkunde med stempelkort → /mine-kort.
  const destination = safeNext(next) ?? (await resolveLandingPath(data.user.id));

  revalidatePath("/", "layout");
  redirect(destination);
}

export async function signup(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const companyName = String(formData.get("company_name") ?? "").trim();

  if (!email || !password || !companyName) {
    return { error: "Udfyld alle felter." };
  }
  if (password.length < 6) {
    return { error: "Adgangskoden skal være mindst 6 tegn." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "customer" },
      // Bekræftelseslinket skal lande på /auth/callback, som veksler koden til
      // en session. Uden dette peger linket på Site URL'ens rod, der ikke
      // veksler noget: brugeren får bekræftet sin mail, men ender uden session
      // på forsiden. Det ses først, når "Confirm email" slås til i Supabase.
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    return { error: error.message };
  }
  if (!data.user) {
    return { error: "Kontoen kunne ikke oprettes. Prøv igen." };
  }

  // Virksomheden oprettes med det samme, så onboarding har noget at hænge på.
  // Indsættes med service-role og ikke brugerens egen klient: er
  // e-mailbekræftelse slået til i Supabase, kommer der INGEN session med
  // signup, og en RLS-tjekket insert ville blive afvist — så ville brugeren
  // stå med en konto uden virksomhed efter at have bekræftet sin mail.
  await createAdminClient().from("companies").insert({
    user_id: data.user.id,
    name: companyName,
    contact_email: email,
  });

  // Uden session venter Supabase på, at e-mailen bekræftes.
  if (!data.session) return { needsConfirmation: true };

  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/**
 * Kundekonto for en butiks slutkunde — IKKE en virksomhedskonto: der oprettes
 * ingen `companies`-række, så brugeren har intet dashboard.
 *
 * Kommer kunden fra sit stempelkort, sendes kortets token med, og kortet
 * knyttes til den nye konto med det samme. Tokenet er autorisationen; der
 * knyttes aldrig kort ud fra e-mail-match, da e-mailen ikke er verificeret her.
 */
export async function signupCustomer(
  _prev: CustomerAuthState,
  formData: FormData,
): Promise<CustomerAuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const token = String(formData.get("token") ?? "").trim();

  if (!email || !password) {
    return { error: "Udfyld e-mail og adgangskode." };
  }
  if (password.length < 6) {
    return { error: "Adgangskoden skal være mindst 6 tegn." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: { role: "customer" },
      // Bekræftelseslinket skal lande på /auth/callback, som veksler koden til
      // en session. Uden dette peger linket på Site URL'ens rod, der ikke
      // veksler noget: brugeren får bekræftet sin mail, men ender uden session
      // på forsiden. Det ses først, når "Confirm email" slås til i Supabase.
      emailRedirectTo: `${getSiteUrl()}/auth/callback`,
    },
  });

  if (error) {
    if (/already registered|already exists/i.test(error.message)) {
      return {
        error:
          "Der findes allerede en konto med den e-mail. Log ind i stedet — så kan du gemme kortet derfra.",
      };
    }
    return { error: "Kontoen kunne ikke oprettes. Prøv igen." };
  }
  if (!data.user) {
    return { error: "Kontoen kunne ikke oprettes. Prøv igen." };
  }

  // Kortet knyttes selv hvis der ikke kom en session med (e-mailbekræftelse
  // slået til) — så ligger det klar, når kunden logger ind første gang.
  if (token) await claimCardForUser(token, data.user.id);

  if (!data.session) return { needsConfirmation: true };

  revalidatePath("/", "layout");
  redirect(token ? `/kort/${token}` : "/mine-kort");
}

export async function signout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export interface ResetRequestState {
  error?: string;
  /** Sat når kvitteringen er vist — uanset om e-mailen fandtes. */
  sent?: boolean;
}

/**
 * Beder Supabase sende et nulstillingslink. Linket peger på `/auth/callback`,
 * som veksler koden til en session og sender brugeren videre til
 * `/nulstil-adgangskode` — uden den mellemstation ville brugeren lande uden
 * session og ikke kunne sætte en ny adgangskode.
 */
export async function requestPasswordReset(
  _prev: ResetRequestState,
  formData: FormData,
): Promise<ResetRequestState> {
  const email = String(formData.get("email") ?? "").trim();
  if (!email) return { error: "Udfyld din e-mail." };

  const supabase = await createClient();
  await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${getSiteUrl()}/auth/callback?next=/nulstil-adgangskode`,
  });

  // Samme kvittering uanset om adressen har en konto. Ville vi vise "findes
  // ikke", kunne enhver afprøve e-mails og kortlægge, hvem der er kunder.
  return { sent: true };
}

export interface NewPasswordState {
  error?: string;
}

/**
 * Sætter en ny adgangskode på den bruger, recovery-sessionen tilhører.
 * Kræver en gyldig session — den kommer fra `/auth/callback`.
 */
export async function updatePassword(
  _prev: NewPasswordState,
  formData: FormData,
): Promise<NewPasswordState> {
  const password = String(formData.get("password") ?? "");
  const repeat = String(formData.get("password_repeat") ?? "");

  if (password.length < 6) {
    return { error: "Adgangskoden skal være mindst 6 tegn." };
  }
  if (password !== repeat) {
    return { error: "De to adgangskoder er ikke ens." };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return {
      error:
        "Linket er udløbet eller allerede brugt. Bed om et nyt nulstillingslink.",
    };
  }

  const { error } = await supabase.auth.updateUser({ password });
  if (error) {
    return { error: "Adgangskoden kunne ikke ændres. Prøv igen." };
  }

  revalidatePath("/", "layout");
  redirect(await resolveLandingPath(user.id));
}
