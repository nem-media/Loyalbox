"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveLandingPath } from "@/lib/auth";
import { claimCardForUser } from "@/lib/loyalty/member-account";
import { getSiteUrl } from "@/lib/site";
import { erGyldigtCvr, normaliserCvr, CVR_FEJL } from "@/lib/cvr";
import { bestillingsSti } from "@/lib/bestillings-sti";

export interface AuthState {
  error?: string;
  /** Sat når Supabase kræver e-mailbekræftelse før der gives en session. */
  needsConfirmation?: boolean;
  /**
   * Det, der blev skrevet — så formularen kan lægge det tilbage.
   *
   * REACT NULSTILLER EN FORMULAR, NÅR EN SERVER ACTION SVARER. Uden det her
   * mistede en, der tastede ét ciffer forkert i CVR, BÅDE firmanavn, mail og
   * adgangskode — og fejlbeskeden bad dem oven i købet om at "tjekke de otte
   * cifre", altså rette ét felt, de ikke kunne se mere. Målt i brugerfladen
   * 2026-09-16: alle fire felter stod tomme bagefter.
   *
   * Samme kur som i `kontakt-form.tsx`, hvor problemet blev løst først, og
   * samme klasse som filfeltet i `/bestil/uden-konto`.
   *
   * ADGANGSKODEN ER IKKE MED OG SKAL ALDRIG VÆRE DET: den skulle i så fald
   * sendes tilbage gennem svaret og stå i browserens hukommelse som en
   * almindelig streng. Den er billig at taste igen; et firmanavn og et
   * CVR-nummer er det ikke.
   */
  udfyldt?: { company_name?: string; cvr?: string; email?: string };
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

  // Mailen lægges tilbage ved en fejl — koden gør ikke. Den hyppigste fejl
  // her er en forkert adgangskode, og indtil nu kostede den også e-mailen.
  const udfyldt = { email };

  if (!email || !password) {
    return { error: "Udfyld e-mail og adgangskode.", udfyldt };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });
  if (error || !data.user) {
    return { error: "Forkert e-mail eller adgangskode.", udfyldt };
  }

  // Uden et eksplicit `next` sendes brugeren derhen hvor de hører hjemme:
  // butiksejer/medarbejder → dashboard, slutkunde med stempelkort → /mine-kort.
  const destination =
    safeNext(next) ?? (await resolveLandingPath(data.user.id));

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
  const cvrRaw = String(formData.get("cvr") ?? "");

  // Bestillingen, kunden kom fra — se `bestillingsSti()` for hvorfor slug'en
  // slås op og ikke skrives ind som den kom.
  const naeste = bestillingsSti(
    formData.get("produkt")?.toString(),
    formData.get("antal")?.toString(),
  );

  // CVR er IKKE med i den her: feltet er frivilligt, jf. nedenfor.
  const udfyldt = { company_name: companyName, cvr: cvrRaw, email };

  if (!email || !password || !companyName) {
    return { error: "Udfyld navn, mail og adgangskode.", udfyldt };
  }
  if (password.length < 6) {
    return { error: "Adgangskoden skal være mindst 6 tegn.", udfyldt };
  }

  // CVR ER FRIVILLIGT ved oprettelsen, men skal være rigtigt, hvis det
  // skrives. Det ville være bagvendt at kræve nummeret for at få en konto,
  // når man kan købe uden — og de konti, der blev oprettet før kravet, findes
  // i forvejen uden. Se src/lib/cvr.ts.
  if (cvrRaw && !erGyldigtCvr(cvrRaw)) {
    return { error: CVR_FEJL, udfyldt };
  }
  const cvr = cvrRaw ? normaliserCvr(cvrRaw) : null;

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      /*
       * ROLLEN SÆTTES IKKE HER — OG DET ER POINTEN.
       *
       * Der stod `data: { role: "customer" }`, og det så uskyldigt ud: vi
       * sendte jo den rigtige værdi. Men databasens trigger LÆSTE den værdi,
       * og `options.data` kommer fra klienten. Anon-nøglen er offentlig, så
       * enhver kunne kalde Supabases eget signup-endpoint med
       * `{"role":"admin"}` og få en admin-konto (afprøvet 2026-09-15 mod
       * produktion; brugeren blev slettet igen). Migration 0040 gør rollen
       * fast til `customer` i triggeren.
       *
       * Feltet er fjernet herfra, fordi det efter rettelsen ikke gør noget —
       * og et felt, der ser ud til at bestemme rollen uden at gøre det, er
       * netop dét, der får den næste til at tro, at rollen kan sendes med.
       * Skal en bruger være admin, sættes det bevidst med service-role, se
       * `scripts/create-admin.mjs`.
       */
      // Bekræftelseslinket skal lande på /auth/callback, som veksler koden til
      // en session. Uden dette peger linket på Site URL'ens rod, der ikke
      // veksler noget: brugeren får bekræftet sin mail, men ender uden session
      // på forsiden. Det ses først, når "Confirm email" slås til i Supabase.
      // Bestillingen følger med gennem bekræftelsesmailen. `/auth/callback`
      // kender `next` i forvejen og kører den gennem `safeNextPath()`.
      emailRedirectTo:
        `${getSiteUrl()}/auth/callback` +
        (naeste ? `?next=${encodeURIComponent(naeste)}` : ""),
    },
  });

  if (error) {
    return { error: error.message, udfyldt };
  }
  if (!data.user) {
    return { error: "Kontoen kunne ikke oprettes. Prøv igen.", udfyldt };
  }

  // Virksomheden oprettes med det samme, så onboarding har noget at hænge på.
  // Indsættes med service-role og ikke brugerens egen klient: er
  // e-mailbekræftelse slået til i Supabase, kommer der INGEN session med
  // signup, og en RLS-tjekket insert ville blive afvist — så ville brugeren
  // stå med en konto uden virksomhed efter at have bekræftet sin mail.
  const { error: firmaFejl } = await createAdminClient()
    .from("companies")
    .insert({
      user_id: data.user.id,
      name: companyName,
      cvr,
      contact_email: email,
    });

  // Den hyppigste årsag er, at CVR-nummeret allerede er i brug — der er et
  // unikt indeks på det. Brugeren skal have det at vide her og ikke opdage
  // det som en konto uden virksomhed efter at have bekræftet sin mail.
  if (firmaFejl) {
    return {
      error: /duplicate|unique/i.test(firmaFejl.message)
        ? "Der findes allerede en konto med dette CVR-nummer. Log ind i stedet, eller skriv til os."
        : "Virksomheden kunne ikke oprettes. Prøv igen, eller skriv til os.",
      udfyldt,
    };
  }

  // Uden session venter Supabase på, at e-mailen bekræftes.
  if (!data.session) return { needsConfirmation: true };

  revalidatePath("/", "layout");
  redirect(naeste ?? "/dashboard");
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
      /* Rollen sættes ikke her — se migration 0040. */
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
