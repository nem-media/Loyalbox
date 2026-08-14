import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLandingPath } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";

/**
 * Landingspunkt for alle links i auth-mails: bekræft e-mail og nulstil
 * adgangskode. Supabase verificerer selv tokenet og sender brugeren hertil med
 * en engangskode, som veksles til en session.
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

  // `next` kommer fra URL'en og må kun være en intern sti.
  const safeNext = next.startsWith("/") && !next.startsWith("//") ? next : null;

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
