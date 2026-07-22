/**
 * Billed-rute for opslags-generatoren: renderer et delbart PNG (1080×1080) via
 * next/og. Auth-gated — kun personale for kortets/anmeldelsens egen virksomhed.
 * Preview i composeren OG downloadet peger begge på denne rute, så de er ens.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createAdminClient } from "@/lib/supabase/admin";
import { POST_TEMPLATES, backgroundById, renderCaption } from "@/lib/posts/templates";
import { buildPostElement } from "@/lib/posts/post-image";

export const runtime = "nodejs";

const bool = (v: string | null, dflt: boolean) => (v == null ? dflt : v !== "0" && v !== "false");

export async function GET(req: Request) {
  const access = await getCompanyAccess();
  if (!access) return new Response("Log ind for at generere opslag.", { status: 401 });

  const q = new URL(req.url).searchParams;
  const template = POST_TEMPLATES.find((t) => t.id === Number(q.get("template"))) ?? POST_TEMPLATES[0];
  const bg = backgroundById(q.get("bg") ?? "navy");
  const showStars = bool(q.get("stars"), true);
  const showLogo = bool(q.get("logo"), true);
  const showName = bool(q.get("name"), false);
  const emojis = bool(q.get("emojis"), true);
  const feedbackId = q.get("feedback");

  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("name")
    .eq("id", access.companyId)
    .maybeSingle();
  const firmanavn = company?.name ?? "Din virksomhed";

  // Anmeldelse — kun hvis den hører til virksomheden (tekst er autoritativ).
  let anmeldelse: string | null = null;
  let customerName: string | null = null;
  if (feedbackId) {
    const { data: fb } = await admin
      .from("feedback")
      .select("comment, customer_name, company_id")
      .eq("id", feedbackId)
      .maybeSingle();
    if (fb && fb.company_id === access.companyId) {
      anmeldelse = fb.comment;
      customerName = fb.customer_name;
    }
  }

  // Antal 5-stjernede til milepæls-skabeloner.
  let antal: number | null = null;
  if (template.category === "milestone") {
    const { count } = await admin
      .from("feedback")
      .select("*", { count: "exact", head: true })
      .eq("company_id", access.companyId)
      .eq("rating", 5);
    antal = count ?? 0;
  }

  const caption = renderCaption(
    template.text,
    { firmanavn, anmeldelse, antal },
    { emojis, stripStars: showStars },
  );

  const [inter400, inter700] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/inter-400.woff")),
    readFile(join(process.cwd(), "assets/fonts/inter-700.woff")),
  ]);

  return new ImageResponse(
    buildPostElement({ bg, caption, firmanavn, showStars, showLogo, showName, customerName }),
    {
      width: 1080,
      height: 1080,
      fonts: [
        { name: "Inter", data: inter400 as unknown as ArrayBuffer, weight: 400, style: "normal" },
        { name: "Inter", data: inter700 as unknown as ArrayBuffer, weight: 700, style: "normal" },
      ],
      headers: { "Cache-Control": "no-store" },
    },
  );
}
