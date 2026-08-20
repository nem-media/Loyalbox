import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Den natlige oprydning.
 *
 * Kalder `ryd_op_efter_frister()`, som sletter og anonymiserer efter
 * opbevaringsfristerne i src/lib/opbevaring.ts. Hele kørslen ligger i
 * databasen — se migration 0012 for hvorfor.
 *
 * `?toerloeb=1` tæller kun og rører ingenting. Brug den, før en ændret frist
 * sættes i drift: så kan man se, hvad der VILLE forsvinde, mens det stadig er
 * der.
 *
 * Vercel Cron kalder den med `Authorization: Bearer $CRON_SECRET`. Uden
 * hemmeligheden svarer ruten 503 og rører ikke databasen — en åben rute, der
 * sletter to år gamle kort, er ikke noget at have stående.
 */
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const hemmelighed = process.env.CRON_SECRET;

  if (!hemmelighed) {
    console.error("[oprydning] CRON_SECRET mangler — kørslen er sprunget over");
    return NextResponse.json({ error: "ikke opsat" }, { status: 503 });
  }

  if (!erGodkendt(request.headers.get("authorization"), hemmelighed)) {
    return NextResponse.json({ error: "ingen adgang" }, { status: 401 });
  }

  const toerloeb = request.nextUrl.searchParams.get("toerloeb") === "1";

  const { data, error } = await createAdminClient().rpc(
    "ryd_op_efter_frister",
    { p_toerloeb: toerloeb },
  );

  if (error) {
    // Skal ses: en oprydning, der stille holder op med at køre, opdages ellers
    // først den dag nogen spørger, hvorfor der ligger fem år gamle kort.
    console.error("[oprydning] fejlede:", error.message);
    return NextResponse.json({ error: "fejlede" }, { status: 500 });
  }

  console.log("[oprydning]", JSON.stringify(data));
  return NextResponse.json(data);
}

/**
 * Sammenligning i konstant tid. Et almindeligt `!==` afslører gennem sin
 * svartid, hvor mange tegn der var rigtige, og hemmeligheden kan gættes tegn
 * for tegn. Længden må gerne læses ud af tidsforbruget — den er ikke det
 * hemmelige.
 */
function erGodkendt(header: string | null, hemmelighed: string): boolean {
  if (!header?.startsWith("Bearer ")) return false;
  const givet = Buffer.from(header.slice(7));
  const rigtig = Buffer.from(hemmelighed);
  return givet.length === rigtig.length && timingSafeEqual(givet, rigtig);
}
