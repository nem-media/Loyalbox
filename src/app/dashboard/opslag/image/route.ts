/**
 * Billed-rute for opslags-generatoren: renderer et delbart PNG (1080×1080) via
 * next/og. Auth-gated — kun personale for kortets/anmeldelsens egen virksomhed.
 * Preview i composeren OG downloadet peger begge på denne rute, så de er ens.
 */
import { ImageResponse } from "next/og";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { getCompanyAccess } from "@/lib/loyalty/access";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  POST_TEMPLATES,
  backgroundById,
  customBackground,
  renderCaption,
  EGEN_FARVE_ID,
} from "@/lib/posts/templates";
import { buildPostElement } from "@/lib/posts/post-image";

export const runtime = "nodejs";

const bool = (v: string | null, dflt: boolean) => (v == null ? dflt : v !== "0" && v !== "false");

/** Loft på den redigerede tekst — et opslag er ikke en roman. */
const MAKS_TEKST = 400;

/**
 * Kundens logo som en data-URI, klar til Satori.
 *
 * Normaliseres til PNG med `sharp`, så ALT (png/jpg/webp/svg) bliver til noget
 * Satori kan tegne — en rå SVG- eller webp-URL ville ellers give et brudt
 * eller manglende logo. Fejler noget, returneres null, og billedet falder
 * tilbage på bogstav-mærket i stedet for at vælte hele ruten.
 */
async function logoDataUri(url: string | null | undefined): Promise<string | null> {
  if (!url) return null;
  try {
    const svar = await fetch(url);
    if (!svar.ok) return null;
    const raa = Buffer.from(await svar.arrayBuffer());
    if (raa.byteLength > 5 * 1024 * 1024) return null;
    const png = await sharp(raa)
      .resize(180, 180, { fit: "inside", withoutEnlargement: true })
      .png()
      .toBuffer();
    return `data:image/png;base64,${png.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(req: Request) {
  const access = await getCompanyAccess();
  if (!access) return new Response("Log ind for at generere opslag.", { status: 401 });

  const q = new URL(req.url).searchParams;
  const template = POST_TEMPLATES.find((t) => t.id === Number(q.get("template"))) ?? POST_TEMPLATES[0];
  // Egen farve bygges af `c`; ellers et af de faste temaer.
  const bgId = q.get("bg") ?? "navy";
  const bg =
    bgId === EGEN_FARVE_ID
      ? customBackground(q.get("c") ?? "#19375c")
      : backgroundById(bgId);
  const showStars = bool(q.get("stars"), true);
  const showLogo = bool(q.get("logo"), true);
  const showName = bool(q.get("name"), false);
  const emojis = bool(q.get("emojis"), true);
  const feedbackId = q.get("feedback");
  // Kundens egen redigering af teksten, hvis der er en. Skabelonen er blot et
  // udgangspunkt — det, der står her, er det, kunden faktisk vil udgive.
  const egenTekst = (q.get("text") ?? "").slice(0, MAKS_TEKST).trim();

  const admin = createAdminClient();

  const { data: company } = await admin
    .from("companies")
    .select("name, logo_url")
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

  // Er teksten redigeret, bruges den som skabelon; ellers den valgte skabelon.
  // renderCaption fletter stadig eventuelle {felter} og rydder emojis/stjerner.
  const caption = renderCaption(
    egenTekst || template.text,
    { firmanavn, anmeldelse, antal },
    { emojis, stripStars: showStars },
  );

  const logo = showLogo ? await logoDataUri(company?.logo_url) : null;

  const [inter400, inter700] = await Promise.all([
    readFile(join(process.cwd(), "assets/fonts/inter-400.woff")),
    readFile(join(process.cwd(), "assets/fonts/inter-700.woff")),
  ]);

  return new ImageResponse(
    buildPostElement({ bg, caption, firmanavn, showStars, showLogo, showName, customerName, logoDataUri: logo }),
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
