/**
 * Opslags-generator — skabeloner og baggrunde (v1, ingen AI).
 *
 * Ren data + rene helpers. INGEN server-only imports her — filen bruges både
 * server-side (billed-ruten) og client-side (composeren, til kopiér-tekst), så
 * caption i preview-billedet og den kopierede tekst altid er identiske.
 */

export type PostCategory = "testimonial" | "milestone" | "generic";

export interface PostTemplate {
  id: number;
  category: PostCategory;
  text: string; // flettefelter: {firmanavn} {anmeldelse} {antal}
}

/** De 20 standardskabeloner. */
export const POST_TEMPLATES: PostTemplate[] = [
  // A — Enkelt-testimonial (bruger {anmeldelse})
  { id: 1, category: "testimonial", text: `⭐️⭐️⭐️⭐️⭐️ "{anmeldelse}" — tusind tak for de søde ord! 🙏 {firmanavn}` },
  { id: 2, category: "testimonial", text: `Sådan starter man en god dag 🌟 "{anmeldelse}" Tak fordi du valgte {firmanavn}!` },
  { id: 3, category: "testimonial", text: `Vores kunder siger det bedst: "{anmeldelse}" ❤️ Tak for din 5-stjernede anmeldelse!` },
  { id: 4, category: "testimonial", text: `"{anmeldelse}" — det bliver vi vildt glade for at høre. Tak! ⭐️⭐️⭐️⭐️⭐️` },
  { id: 5, category: "testimonial", text: `En hilsen fra en glad kunde: "{anmeldelse}" 🌻 Tak fordi du anbefaler os videre!` },
  { id: 6, category: "testimonial", text: `Tak for tilliden! 🙌 "{anmeldelse}" Vi glæder os til at se dig igen hos {firmanavn}.` },
  { id: 7, category: "testimonial", text: `Det er sådan noget her, vi går på arbejde for 💚 "{anmeldelse}"` },
  { id: 8, category: "testimonial", text: `5 stjerner og de fineste ord: "{anmeldelse}" Tusind tak! 🥰` },

  // B — Samlet / milepæl (bruger {antal})
  { id: 9, category: "milestone", text: `🎉 Vi har rundet {antal} femstjernede anmeldelser! Tusind tak til alle jer skønne kunder ⭐️⭐️⭐️⭐️⭐️` },
  { id: 10, category: "milestone", text: `{antal} gange 5 stjerner ⭐️ Tak fordi I anbefaler {firmanavn} til hinanden!` },
  { id: 11, category: "milestone", text: `Wow — {antal} tilfredse kunder har givet os topkarakter! 🙏 Tak for jeres anmeldelser.` },
  { id: 12, category: "milestone", text: `Milepæl nået: {antal} femstjernede anmeldelser 🌟 Det havde vi aldrig klaret uden jer.` },
  { id: 13, category: "milestone", text: `Tak for jeres {antal} 5-stjernede anmeldelser — I gør os bedre hver eneste dag ❤️` },
  { id: 14, category: "milestone", text: `{antal} × ⭐️⭐️⭐️⭐️⭐️ og vi er stadig lige stolte hver gang. Tak, kære kunder!` },

  // C — Generisk tak
  { id: 15, category: "generic", text: `Tak for jeres anmeldelser! 🙏 Det betyder alt for en lokal forretning som {firmanavn} ⭐️⭐️⭐️⭐️⭐️` },
  { id: 16, category: "generic", text: `Endnu en glad kunde hos {firmanavn}! ⭐️⭐️⭐️⭐️⭐️ Tak fordi du tog dig tid til at anmelde os.` },
  { id: 17, category: "generic", text: `Femstjernet dag i dag 🌟 Tak til vores fantastiske kunder!` },
  { id: 18, category: "generic", text: `Din anbefaling er den bedste reklame, vi kan få. Tusind tak! ❤️ {firmanavn}` },
  { id: 19, category: "generic", text: `Vi elsker at gøre vores kunder glade — og en 5-stjernet anmeldelse gør OS glade 🥰 Tak!` },
  { id: 20, category: "generic", text: `Tak fordi du valgte lokalt og anmeldte {firmanavn}. Vi ses snart igen 👋 ⭐️⭐️⭐️⭐️⭐️` },
];

export const CATEGORY_LABELS: Record<PostCategory, string> = {
  testimonial: "Testimonial",
  milestone: "Milepæl",
  generic: "Generisk tak",
};

export function templatesFor(category: PostCategory): PostTemplate[] {
  return POST_TEMPLATES.filter((t) => t.category === category);
}

// ---------------------------------------------------------------------------
// Baggrunde (6 temaer). Visuelt config bruges direkte af billed-ruten.
// bgImage bruges når der er et forløb; ellers bgColor. Satori-venligt.
// ---------------------------------------------------------------------------

export type QuoteStyle = "normal" | "quoted" | "pop";

export interface PostBackground {
  id: string;
  name: string;
  description: string;
  bgColor?: string;
  bgImage?: string;
  ink: string;
  subInk: string;
  starColor: string;
  logoBg: string;
  logoInk: string;
  accentLine?: string;
  quoteStyle: QuoteStyle;
}

export const POST_BACKGROUNDS: PostBackground[] = [
  {
    id: "sunset",
    name: "Varm solnedgang",
    description: "Orange-til-lilla forløb — energisk og glad.",
    bgImage: "linear-gradient(150deg, #ff8a3c 0%, #ff5f7e 48%, #b0468f 100%)",
    ink: "#ffffff",
    subInk: "rgba(255,255,255,0.85)",
    starColor: "#ffe08a",
    logoBg: "rgba(255,255,255,0.92)",
    logoInk: "#b0468f",
    quoteStyle: "normal",
  },
  {
    id: "navy",
    name: "Brand-mørk",
    description: "LoyalBox-navy med guld-accent — rolig og professionel.",
    bgImage: "linear-gradient(160deg, #204777 0%, #19375c 55%, #10243d 100%)",
    ink: "#f2f6fb",
    subInk: "#a9c0d8",
    starColor: "#ffc021",
    logoBg: "#1b916a",
    logoInk: "#ffffff",
    accentLine: "#ffc021",
    quoteStyle: "normal",
  },
  {
    id: "green",
    name: "Frisk grøn",
    description: "Primærgrøn med teal — ren og imødekommende.",
    bgImage: "linear-gradient(155deg, #1fa576 0%, #147d5c 60%, #0d6b6b 100%)",
    ink: "#f3fbf7",
    subInk: "rgba(243,251,247,0.85)",
    starColor: "#ffe08a",
    logoBg: "rgba(255,255,255,0.92)",
    logoInk: "#147d5c",
    quoteStyle: "normal",
  },
  {
    id: "cream",
    name: "Cremet minimal",
    description: "Råhvid med guld-citat — tidløst testimonial-kort.",
    bgColor: "#f6f1e6",
    ink: "#19375c",
    subInk: "#6b7f93",
    starColor: "#e0a008",
    logoBg: "#19375c",
    logoInk: "#ffffff",
    quoteStyle: "quoted",
  },
  {
    id: "pop",
    name: "Solgul pop",
    description: "Kraftig gul, navy tekst — iøjnefaldende til milepæle.",
    bgColor: "#ffb700",
    ink: "#19375c",
    subInk: "#3a4d63",
    starColor: "#19375c",
    logoBg: "#19375c",
    logoInk: "#ffb700",
    quoteStyle: "pop",
  },
  {
    id: "bokeh",
    name: "Bokeh aften",
    description: "Mørk med bløde lyspletter — hyggelig aftenstemning.",
    bgImage:
      "radial-gradient(circle at 78% 20%, rgba(255,193,33,0.55), transparent 22%)," +
      "radial-gradient(circle at 20% 32%, rgba(255,193,33,0.30), transparent 16%)," +
      "radial-gradient(circle at 64% 70%, rgba(53,180,135,0.40), transparent 24%)," +
      "radial-gradient(circle at 30% 84%, rgba(255,255,255,0.20), transparent 16%)," +
      "linear-gradient(160deg, #163150 0%, #0c1d31 100%)",
    ink: "#f3f7fb",
    subInk: "rgba(243,247,251,0.85)",
    starColor: "#ffc021",
    logoBg: "rgba(255,255,255,0.92)",
    logoInk: "#163150",
    quoteStyle: "normal",
  },
];

export function backgroundById(id: string): PostBackground {
  return POST_BACKGROUNDS.find((b) => b.id === id) ?? POST_BACKGROUNDS[1];
}

// ---------------------------------------------------------------------------
// Caption-rendering (samme funktion server- og client-side)
// ---------------------------------------------------------------------------

export interface CaptionVars {
  firmanavn: string;
  anmeldelse?: string | null;
  antal?: number | null;
}

// Bredt emoji-interval — bruges når emojis slås fra.
const EMOJI_RE =
  /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{2190}-\u{21FF}\u{FE00}-\u{FE0F}\u{200D}\u{1F1E6}-\u{1F1FF}]/gu;

/** Fletter felter ind i en skabelon. Fjerner tomme felter og rydder mellemrum. */
export function renderCaption(
  text: string,
  vars: CaptionVars,
  opts: { emojis?: boolean; stripStars?: boolean } = {},
): string {
  let out = text
    .replaceAll("{firmanavn}", vars.firmanavn?.trim() || "os")
    .replaceAll("{anmeldelse}", (vars.anmeldelse ?? "").trim())
    .replaceAll("{antal}", vars.antal != null ? String(vars.antal) : "mange");

  if (opts.emojis === false) out = out.replace(EMOJI_RE, "");
  // Til billedet: fjern ⭐-emojis, da SVG-stjernerækken allerede viser dem.
  else if (opts.stripStars) out = out.replace(/⭐️?/gu, "");

  // Ryd op: tomme citationstegn, hængende bindestreger, dobbelte mellemrum.
  return out
    .replace(/""|«»|“”/g, "")
    .replace(/\s+([.,!?])/g, "$1")
    .replace(/[ \t]{2,}/g, " ")
    .replace(/^[\s—–-]+/, "")
    .trim();
}
