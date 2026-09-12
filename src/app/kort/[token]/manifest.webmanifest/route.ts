import { createAdminClient } from "@/lib/supabase/admin";
import { kortManifest } from "@/lib/kort-manifest";

/**
 * Kortets eget web-app-manifest. Selve indholdet bygges af `kortManifest()` —
 * se den for hvorfor det ikke er det fælles manifest.
 *
 * TOKENET ER AUTORISATIONEN, præcis som på selve kortsiden: uden et gyldigt
 * token svarer ruten 404, så den ikke kan bruges til at afprøve, hvilke tokens
 * der findes. Svaret må derfor heller ikke caches af noget mellemled.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  const { token } = await params;
  const admin = createAdminClient();

  const { data: member } = await admin
    .from("loyalty_members")
    .select("company_id")
    .eq("public_token", token)
    .maybeSingle();
  if (!member) return new Response("Not found", { status: 404 });

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", member.company_id)
    .maybeSingle();

  return Response.json(kortManifest(token, company?.name), {
    headers: {
      "content-type": "application/manifest+json; charset=utf-8",
      "cache-control": "private, no-store",
    },
  });
}
