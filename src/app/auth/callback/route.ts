import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLandingPath } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { safeNextPath } from "@/lib/auth-links";

/**
 * Landingspunkt for PKCE-links, hvor Supabase sender en engangskode, der
 * veksles til en session.
 *
 * BEMÆRK: koden kan kun veksles i den browser, der bestilte mailen — PKCE
 * kræver en verifier, som blev lagt dér. Auth-mails peger derfor på
 * /auth/confirm, som virker på tværs af enheder. Denne rute bevares, fordi
 * allerede udsendte links stadig peger herpå.
 *
 * Uden dette trin ville et nulstillingslink ende på forsiden UDEN session, og
 * brugeren ville aldrig kunne vælge en ny adgangskode.
 *
 * Der redirectes til `getSiteUrl()` og ikke til request-originen, så en
 * forfalsket Host-header ikke kan sende brugeren — og dermed sessionens
 * cookies — et andet sted hen.
 */
export async function GET(request: NextRequest) {
  const base = getSiteUrl();
  const code = request.nextUrl.searchParams.get("code");
  const next = request.nextUrl.searchParams.get("next") ?? "";

  // Samme regel som /auth/confirm — den bor i auth-links, så de to indgange
  // ikke kan blive uenige om, hvad der er en sikker viderestilling.
  const safeNext = safeNextPath(next);

  if (!code) {
    return NextResponse.redirect(`${base}/login?fejl=link`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.exchangeCodeForSession(code);

  if (error || !data.user) {
    return NextResponse.redirect(`${base}/login?fejl=link`);
  }

  const destination = safeNext ?? (await resolveLandingPath(data.user.id));
  return NextResponse.redirect(`${base}${destination}`);
}
