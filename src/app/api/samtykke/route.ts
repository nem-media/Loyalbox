import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { isValidLogEntry } from "@/lib/consent";
import { noterFejl } from "@/lib/drift";

/**
 * Modtager og gemmer et cookiesamtykke.
 *
 * GDPR kræver, at vi kan PÅVISE et samtykke. Lå valget kun i den besøgendes
 * egen browser, havde vi intet at pege på, hvis de ryddede den.
 *
 * Endpointet er åbent — det skal kunne kaldes af enhver besøgende, også en der
 * ikke er logget ind. Derfor validerer det stramt og skriver KUN de felter, det
 * selv kender: en post herfra kan aldrig komme til at indeholde en IP-adresse
 * eller andet, en afsender måtte finde på at sende med.
 */
export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);

  if (!isValidLogEntry(body)) {
    return NextResponse.json({ error: "ugyldig" }, { status: 400 });
  }

  const { error } = await createAdminClient().from("consent_log").insert({
    consent_id: body.consentId,
    version: body.version,
    statistics: body.statistics,
    marketing: body.marketing,
    decided_at: body.decidedAt,
    path: body.path,
  });

  if (error) {
    // Fejlen må ikke ramme den besøgende — deres valg er allerede gemt i
    // browseren og respekteres uanset hvad. Men den skal ses, for uden loggen
    // kan vi ikke dokumentere samtykket.
    console.error("[samtykke] kunne ikke gemme:", error.message);
    await noterFejl("samtykke", `Kunne ikke gemme samtykke: ${error.message}`);
    return NextResponse.json({ error: "kunne ikke gemmes" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
