import { NextRequest, NextResponse } from "next/server";
import { byggSkilt } from "@/lib/skilt";
import { qrAdresseFor } from "@/lib/qr-adresse";
import { getCurrentUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { STANDER_FARVER, normaliserHex } from "@/lib/stander-tilvalg";

/**
 * Skiltet som billede — til previewet i bestillingen og til trykfilen.
 *
 * EGEN RUTE FREM FOR EN KOMPONENT, fordi skabelonerne er 167 KB hver. Lagt
 * ind i en klientkomponent ville de ligge i browserens bundt for enhver, der
 * blot åbner bestillingen. Her hentes de som et billede, og siden bliver ved
 * med at være let.
 *
 * ÅBEN UDEN LOGIN, og det er efter en overvejelse: den viser kun det, den får
 * med i adressen. Der slås intet op, og der er derfor ikke noget at hente ud,
 * man ikke selv har skrevet. Logoets adresse er i forvejen offentlig — det
 * ligger i en public bucket, fordi kundens egne kunder skal kunne se det.
 */
/** Loft på det, vi bager ind. Et logo på flere megabyte hører ikke til på et skilt. */
const MAKS_LOGO = 3 * 1024 * 1024;

/**
 * Henter logoet og laver det om til en `data:`-URI.
 *
 * HVORFOR IKKE BARE ADRESSEN: en SVG indlæst gennem et <img> er et
 * sandkasse-dokument uden netværksadgang, og et <image href="https://…">
 * blev tegnet som et brudt ikon. Set i browseren, ikke gættet.
 *
 * Fejler hentningen, returneres null, og skiltet tegnes med pladsholderen.
 * Et skilt uden logo er bedre end intet skilt.
 */
async function hentLogo(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    const svar = await fetch(url);
    if (!svar.ok) return null;
    const type = svar.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const buf = await svar.arrayBuffer();
    if (buf.byteLength > MAKS_LOGO) return null;
    return `data:${type};base64,${Buffer.from(buf).toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: NextRequest) {
  const p = request.nextUrl.searchParams;

  const farve = p.get("farve");
  const standerens = STANDER_FARVER.find((f) => f.vaerdi === farve)?.hex;
  const baggrund = normaliserHex(p.get("bg") ?? "") ?? standerens ?? "#111111";
  const accent = normaliserHex(p.get("accent") ?? "") ?? "#4ea4ad";

  /*
   * KUN VORES EGET LAGER. Uden denne kunne adressen bede SVG'en hente et
   * vilkårligt billede fra internettet — og filen bliver serveret fra vores
   * domæne. Det ville gøre ruten til en åben videresender.
   */
  const raa = p.get("logo");
  const logoUrl =
    raa && /^https:\/\/[a-z0-9-]+\.supabase\.co\/storage\/v1\//i.test(raa)
      ? raa
      : null;

  /*
   * QR-KODEN SLÅS OP, DEN KOMMER ALDRIG FRA ADRESSEN.
   *
   * Hvad koden skal indeholde, afhænger af standeren: med abonnement vores
   * egen `/r/<slug>`, uden abonnement butikkens eget link. Reglen ligger i
   * `qrAdresseFor()` — ét sted, så previewet, trykfilen og dokumentationen
   * ikke kan komme til at sige hver sit.
   *
   * DERFOR ER `stand` KUN FOR ADMIN. Ruten er ellers åben, og et opslag på et
   * frit slug ville gøre den til en måde at afprøve, hvilke slugs der er i
   * brug — og til at læse en butiks destination ud af et gæt. Trykfilen
   * hentes i forvejen kun fra admin (se `skiltAdresse()` i
   * /admin/ordrer/[id]); previewet i bestillingen sender ikke `stand` med og
   * rører derfor ikke basen.
   *
   * Uden `stand` bliver skabelonens pladsholder stående. Et skilt med en
   * FORKERT kode er værre end et med en pladsholder: den forkerte bliver
   * trykt og opdaget af en kunde, der står og scanner.
   */
  const slug = p.get("stand");
  let qrAdresse: string | null = null;

  if (slug) {
    const user = await getCurrentUser();
    if (user?.role !== "admin") {
      return new NextResponse("Ikke adgang", { status: 403 });
    }

    const { data: stand } = await createAdminClient()
      .from("stands")
      .select(
        "slug, kun_viderestilling, destination_type, google_review_url, trustpilot_url, facebook_url, custom_url",
      )
      .eq("slug", slug)
      .maybeSingle();

    qrAdresse = stand ? qrAdresseFor(stand) : null;
  }

  const svg = await byggSkilt({
    baggrund,
    accent,
    qrAdresse,
    logoDataUri: await hentLogo(logoUrl),
  });

  return new NextResponse(svg, {
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      // Samme adresse giver altid samme skilt, så det må gerne ligge i
      // browserens cache — men ikke hos en mellemliggende, da logoets
      // adresse er kundens egen.
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": "inline",
    },
  });
}
