import { NextResponse, type NextRequest } from "next/server";
import { timingSafeEqual } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { noterKoersel, noterFejl } from "@/lib/drift";

/**
 * Den natlige oprydning. Tre skridt, i den rækkefølge:
 *
 *  1. `ryd_op_efter_frister()` (0012) — fristerne undervejs: navne på gammel
 *     feedback, stempelkort uden aktivitet, samtykkeloggen.
 *  2. `afslut_ophoerte_aftaler()` (0014) — suspensioner der er løbet ud efter
 *     seks måneder, og sletningen 30 dage efter et ophør.
 *  3. Logins og logoer for de virksomheder, trin 2 slettede. De ligger uden
 *     for databasen og kan ikke røres fra SQL.
 *
 * Opbevaringsfristerne står i src/lib/opbevaring.ts, og suspensionsmodellen i
 * src/lib/abonnement.ts. Selve sletningen ligger i databasen — se migration
 * 0012 for hvorfor.
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
  const admin = createAdminClient();

  // 1) Fristerne undervejs — feedback, døde stempelkort, samtykkeloggen.
  const { data, error } = await admin.rpc("ryd_op_efter_frister", {
    p_toerloeb: toerloeb,
  });

  if (error) {
    console.error("[oprydning] fejlede:", error.message);
    await noterFejl("oprydning", error.message);
    return NextResponse.json({ error: "fejlede" }, { status: 500 });
  }

  // 2) Ophørte aftaler — suspensioner der er løbet ud, og de sletninger, der
  //    skal ske 30 dage efter et ophør. Kører EFTER fristerne: er et
  //    stempelkort allerede ryddet undervejs, er der mindre at slette her.
  const { data: ophoer, error: ophoerFejl } = await admin.rpc(
    "afslut_ophoerte_aftaler",
    { p_toerloeb: toerloeb },
  );

  if (ophoerFejl) {
    console.error("[oprydning] ophør fejlede:", ophoerFejl.message);
    await noterFejl("oprydning", `ophør: ${ophoerFejl.message}`);
    return NextResponse.json({ error: "fejlede" }, { status: 500 });
  }

  // 3) Logins og logoer for de virksomheder, der lige er slettet. De kan ikke
  //    røres fra SQL — auth-brugere og filer ligger uden for databasen.
  const virksomheder = (ophoer as { virksomheder?: string[] } | null)
    ?.virksomheder;
  const efterladt =
    !toerloeb && virksomheder?.length
      ? await ryddLoginsOgLogoer(admin, virksomheder)
      : 0;

  const resultat = { ...(data as object), ophoer, efterladt };

  // Også de gode kørsler noteres. Det er dét, der gør en STOPPET oprydning
  // synlig: uden en linje hver nat kan panelet ikke se forskel på "alt er
  // fint" og "den har ikke kørt siden marts".
  console.log("[oprydning]", JSON.stringify(resultat));
  if (!toerloeb) await noterKoersel("oprydning", resultat);
  return NextResponse.json(resultat);
}

/**
 * Fjerner login og logo for slettede virksomheder.
 *
 * SQL'en har allerede fjernet personoplysningerne; det her er resten, som
 * ligger uden for databasen. Fejler et af trinene, TÆLLES det og noteres —
 * frem for at afbryde. Det ville være værre at stoppe kørslen midtvejs og
 * efterlade halvdelen af virksomhederne urørte end at rydde op i det, der kan
 * ryddes, og sige højt hvad der blev tilbage.
 *
 * Medarbejderes logins røres IKKE. En medarbejder er et menneske med sin egen
 * konto, som kan være knyttet til en anden butik eller til deres eget
 * stempelkort — den beslutning er ikke vores at træffe på deres vegne.
 */
async function ryddLoginsOgLogoer(
  admin: ReturnType<typeof createAdminClient>,
  virksomheder: string[],
): Promise<number> {
  let efterladt = 0;

  for (const id of virksomheder) {
    const { data: firma } = await admin
      .from("companies")
      .select("user_id")
      .eq("id", id)
      .maybeSingle();

    if (firma?.user_id) {
      const { error } = await admin.auth.admin.deleteUser(firma.user_id);
      // Er brugeren væk i forvejen, er det ikke en fejl — kun et gensyn.
      if (error && !/not found/i.test(error.message)) {
        efterladt++;
        await noterFejl(
          "oprydning",
          `login for virksomhed ${id} kunne ikke slettes: ${error.message}`,
        );
      }
      // `users`-rækken hænger på auth-brugeren og har `on delete set null` på
      // companies.user_id, så den rydder sig selv med.
    }

    // Logoerne ligger i <virksomheds-id>/<fil>. Listningen skal gå i mappen —
    // storage lister kun ét niveau ad gangen og siger ikke fra, hvis man beder
    // om roden og får nul filer tilbage.
    const { data: filer, error: listeFejl } = await admin.storage
      .from("logos")
      .list(id);

    if (listeFejl) {
      efterladt++;
      await noterFejl(
        "oprydning",
        `logomappe for virksomhed ${id} kunne ikke læses: ${listeFejl.message}`,
      );
      continue;
    }

    const stier = (filer ?? [])
      .filter((f) => f.id !== null) // id: null = undermappe, ikke en fil
      .map((f) => `${id}/${f.name}`);

    if (stier.length > 0) {
      const { error } = await admin.storage.from("logos").remove(stier);
      if (error) {
        efterladt++;
        await noterFejl(
          "oprydning",
          `logo for virksomhed ${id} kunne ikke slettes: ${error.message}`,
        );
      }
    }
  }

  return efterladt;
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
