import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveLandingPath } from "@/lib/auth";
import { getSiteUrl } from "@/lib/site";
import { safeNextPath, emailOtpType } from "@/lib/auth-links";

/**
 * Landingspunkt for auth-mails, der VIRKER PÅ TVÆRS AF ENHEDER.
 *
 * Forskellen på denne og /auth/callback er hele pointen:
 *
 * `/auth/callback` bruger PKCE. Da nulstillingen blev bestilt, lagde Supabase
 * en hemmelig verifier i den browser, der spurgte. Åbnes mailen et andet sted —
 * bestilt på computeren, læst på telefonen — findes den hemmelighed ikke, og
 * linket fejler med "Linket virkede ikke længere". Det er ikke en sjælden kant;
 * det er den mest almindelige måde folk læser mail på.
 *
 * Her bærer linket i stedet et engangstoken (`token_hash`), som verificeres
 * direkte hos Supabase. Der er intet, browseren skal huske, så linket virker
 * uanset hvilken enhed det åbnes på. Tokenet kan kun bruges én gang og udløber.
 *
 * Mailskabelonerne peger hertil — se supabase/email-templates/.
 */
export async function GET(request: NextRequest) {
  const base = getSiteUrl();
  const params = request.nextUrl.searchParams;

  const tokenHash = params.get("token_hash");
  const type = emailOtpType(params.get("type"));
  const next = safeNextPath(params.get("next"));

  if (!tokenHash || !type) {
    return NextResponse.redirect(`${base}/login?fejl=link`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.verifyOtp({
    type,
    token_hash: tokenHash,
  });

  if (error || !data.user) {
    return NextResponse.redirect(`${base}/login?fejl=link`);
  }

  const destination = next ?? (await resolveLandingPath(data.user.id));
  return NextResponse.redirect(`${base}${destination}`);
}
