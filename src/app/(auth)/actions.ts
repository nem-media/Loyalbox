"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { resolveLandingPath } from "@/lib/auth";
import { claimCardForUser } from "@/lib/loyalty/member-account";

export interface AuthState {
  error?: string;
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
    options: { data: { role: "customer" } },
  });

  if (error) {
    return { error: error.message };
  }

  // Create the company immediately so onboarding has something to attach to.
  if (data.user) {
    await supabase.from("companies").insert({
      user_id: data.user.id,
      name: companyName,
      contact_email: email,
    });
  }

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
    options: { data: { role: "customer" } },
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
