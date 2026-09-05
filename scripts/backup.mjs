/**
 * Eksport af hele databasen til JSON på din egen maskine.
 *
 * Kør den med:  npm run backup
 *
 * HVAD DEN ER OG IKKE ER: en nødløsning, ikke en erstatning for rigtige
 * backups. Den kører kun, når nogen starter den, og den kan ikke genskabe
 * LOGINS — adgangskoder ligger som hashes, der ikke kan hentes ud. Data
 * overlever en gendannelse; konti gør ikke, og alle ville skulle sætte ny
 * adgangskode. Værd at have alligevel, også når Supabase Pro er på plads,
 * fordi filerne ligger et andet sted end databasen.
 *
 * FILERNE LANDER UDEN FOR PROJEKTMAPPEN med vilje. De indeholder kunders
 * navne, e-mails og telefonnumre, og de må aldrig kunne havne i et git-commit.
 */
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join, resolve } from "node:path";

const MAPPE = process.env.BACKUP_DIR ?? resolve("..", "loyalsum-backup");

/**
 * Tabellerne i den rækkefølge, de skal lægges TILBAGE i.
 *
 * Rækkefølgen er ikke tilfældig: en postering peger på et medlem, som peger på
 * en virksomhed. Indlæses de forkert, afvises de af fremmednøglerne. Den
 * skrives også i manifestet, så den følger med filerne og ikke kun står her.
 */
const TABELLER = [
  "users",
  "companies",
  "stands",
  // designs SKAL ligge før orders: orders.design_id peger på den. Lå den til
  // sidst, ville alle ordrer blive afvist ved en gendannelse.
  "designs",
  "orders",
  "locations",
  "employees",
  "feedback",
  "scans",
  "loyalty_programs",
  "loyalty_rewards",
  "discounts",
  "loyalty_members",
  "loyalty_memberships",
  "loyalty_transactions",
  "customer_rewards",
  "customer_discounts",
  "campaigns",
  "consent_records",
  "loyalty_audit_log",
  "consent_log",
  "drift_log",
  // Herunder: peger kun på companies (og admin_log desuden på users), så de
  // kan lægges tilbage til sidst.
  "subscriptions",
  "eksterne_profiler",
  "omdoemme_snapshots",
  "admin_log",
];

const SIDE = 1000; // PostgREST leverer højst 1000 rækker ad gangen.

function env() {
  const fundet = Object.fromEntries(
    readFileSync(".env.local", "utf8")
      .split("\n")
      .filter((l) => l.includes("=") && !l.trim().startsWith("#"))
      .map((l) => {
        const i = l.indexOf("=");
        return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^["']|["']$/g, "")];
      }),
  );
  const url = fundet.NEXT_PUBLIC_SUPABASE_URL;
  const noegle = fundet.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !noegle) {
    console.error("NEXT_PUBLIC_SUPABASE_URL eller SUPABASE_SERVICE_ROLE_KEY mangler i .env.local");
    process.exit(1);
  }
  return { url, hoveder: { apikey: noegle, Authorization: `Bearer ${noegle}` } };
}

/** Henter en hel tabel, side for side. */
async function hentTabel(url, hoveder, tabel) {
  const alle = [];
  for (let side = 0; ; side++) {
    const svar = await fetch(
      `${url}/rest/v1/${tabel}?select=*&limit=${SIDE}&offset=${side * SIDE}`,
      { headers: hoveder },
    );
    if (!svar.ok) throw new Error(`${tabel}: HTTP ${svar.status} ${await svar.text()}`);
    const raekker = await svar.json();
    alle.push(...raekker);
    // Kortere end en fuld side betyder, at der ikke er mere.
    if (raekker.length < SIDE) return alle;
  }
}

/**
 * Alle tabeller, basen faktisk har — spurgt basen, ikke gættet.
 *
 * HVORFOR: `TABELLER` er en håndskrevet liste, og en migration, der tilføjer en
 * tabel, glemmer den. Det skete: `designs`, `admin_log`, `eksterne_profiler`,
 * `omdoemme_snapshots` og `subscriptions` stod udenfor i månedsvis, mens
 * eksporten meldte "Færdig" hver gang. `designs` var den dyre — `orders.design_id`
 * peger på den, så en gendannelse ville have afvist HVER ENESTE ordre på en
 * fremmednøgle. Backuppen så komplet ud og kunne ikke lægges tilbage.
 *
 * PostgREST beskriver sig selv på rod-adressen, og hver tabel står som en
 * definition. Det er samme kilde, som klienten bruger, så listen kan ikke være
 * uenig med det, der faktisk findes.
 */
async function hentTabelnavne(url, hoveder) {
  const svar = await fetch(`${url}/rest/v1/`, { headers: hoveder });
  if (!svar.ok) throw new Error(`skema: HTTP ${svar.status}`);
  const { definitions = {} } = await svar.json();
  return Object.keys(definitions);
}

/**
 * Brugerne fra auth-skemaet. De ligger IKKE i PostgREST og skal hentes gennem
 * admin-API'et. Adgangskoderne er ikke med — de kan ikke hentes ud, og det er
 * netop derfor logins ikke kan genskabes.
 */
async function hentBrugere(url, hoveder) {
  const alle = [];
  for (let side = 1; ; side++) {
    const svar = await fetch(
      `${url}/auth/v1/admin/users?page=${side}&per_page=200`,
      { headers: hoveder },
    );
    if (!svar.ok) throw new Error(`auth-brugere: HTTP ${svar.status}`);
    const { users = [] } = await svar.json();
    alle.push(
      ...users.map((b) => ({
        id: b.id,
        email: b.email,
        created_at: b.created_at,
        last_sign_in_at: b.last_sign_in_at,
        email_confirmed_at: b.email_confirmed_at,
        user_metadata: b.user_metadata,
      })),
    );
    if (users.length < 200) return alle;
  }
}

/**
 * Logoerne. De ligger i storage og ville ellers mangle efter en gendannelse.
 *
 * FILERNE LIGGER I UNDERMAPPER — én pr. virksomhed (`<id>/logo.png`). Storage
 * lister kun ét niveau ad gangen og markerer en mappe ved at give den `id:
 * null`. Listes kun roden, findes der derfor TRE MAPPER OG NUL FILER, og
 * eksporten ville stille rapportere nul logoer, som om der ingen var. Derfor
 * gås der ned i hvert niveau.
 */
async function hentFiler(url, hoveder, mappe) {
  const fundne = [];

  async function gaaIgennem(praefiks, dybde) {
    if (dybde > 5) return; // Værn mod en uventet dyb eller cirkulær struktur.
    const svar = await fetch(`${url}/storage/v1/object/list/logos`, {
      method: "POST",
      headers: { ...hoveder, "Content-Type": "application/json" },
      body: JSON.stringify({ prefix: praefiks, limit: 1000 }),
    });
    if (!svar.ok) return;

    for (const post of await svar.json()) {
      const sti = praefiks ? `${praefiks}/${post.name}` : post.name;
      // `id: null` betyder mappe, ikke fil.
      if (post.id) fundne.push(sti);
      else await gaaIgennem(sti, dybde + 1);
    }
  }

  await gaaIgennem("", 0);
  if (fundne.length === 0) return 0;

  mkdirSync(join(mappe, "filer"), { recursive: true });
  let hentet = 0;
  for (const sti of fundne) {
    const data = await fetch(`${url}/storage/v1/object/logos/${sti}`, { headers: hoveder });
    if (!data.ok) continue;
    // Stien fladet ud til ét filnavn, så mappestrukturen ikke skal genskabes
    // for at kunne se, hvad der hører til hvem.
    writeFileSync(
      join(mappe, "filer", sti.replaceAll("/", "_")),
      Buffer.from(await data.arrayBuffer()),
    );
    hentet++;
  }
  return hentet;
}

const { url, hoveder } = env();
const stempel = new Date().toISOString().slice(0, 19).replaceAll(":", "-");
const mappe = join(MAPPE, stempel);
mkdirSync(mappe, { recursive: true });

console.log(`Eksporterer til ${mappe}\n`);

/*
 * Hvad har basen, som listen ikke kender? Spørges FØR eksporten, så de ukendte
 * kan komme med i samme kørsel i stedet for at vente på, at nogen retter
 * listen. Kan skemaet ikke hentes, fortsætter eksporten — en backup uden
 * kontrollen er stadig bedre end ingen backup.
 */
let ukendte = [];
try {
  const iBasen = await hentTabelnavne(url, hoveder);
  ukendte = iBasen.filter((t) => !TABELLER.includes(t));
} catch (err) {
  console.log(`  (kunne ikke tjekke skemaet: ${err.message.slice(0, 60)})\n`);
}

const optalt = {};
const sprunget = [];
for (const tabel of [...TABELLER, ...ukendte]) {
  try {
    const raekker = await hentTabel(url, hoveder, tabel);
    writeFileSync(join(mappe, `${tabel}.json`), JSON.stringify(raekker, null, 2));
    optalt[tabel] = raekker.length;
    const maerke = ukendte.includes(tabel) ? "  ← IKKE PÅ LISTEN" : "";
    console.log(`  ${tabel.padEnd(22)} ${String(raekker.length).padStart(6)}${maerke}`);
  } catch (err) {
    // En manglende tabel må ikke stoppe resten — så var eksporten intet værd
    // netop den dag, en migration var halvvejs. Men den skal TÆLLES, så
    // kørslen ikke kan slutte med "Færdig" og exit 0.
    optalt[tabel] = null;
    sprunget.push(tabel);
    console.log(`  ${tabel.padEnd(22)}  SPRUNGET OVER (${err.message.slice(0, 60)})`);
  }
}

const brugere = await hentBrugere(url, hoveder);
writeFileSync(join(mappe, "auth_users.json"), JSON.stringify(brugere, null, 2));
console.log(`  ${"auth_users".padEnd(22)} ${String(brugere.length).padStart(6)}  (uden adgangskoder)`);

const antalFiler = await hentFiler(url, hoveder, mappe);
console.log(`  ${"filer (logoer)".padEnd(22)} ${String(antalFiler).padStart(6)}`);

writeFileSync(
  join(mappe, "manifest.json"),
  JSON.stringify(
    {
      tidspunkt: new Date().toISOString(),
      projekt: url,
      raekker: optalt,
      auth_users: brugere.length,
      filer: antalFiler,
      // Rækkefølgen dækker KUN de kendte. De ukendte står for sig, fordi deres
      // plads i rækkefølgen ikke kan gættes — den afhænger af fremmednøgler,
      // som kun et menneske kan slå op.
      indlaesningsraekkefoelge: TABELLER,
      ukendte_tabeller: ukendte,
      sprungne_tabeller: sprunget,
      bemaerk:
        "Adgangskoder er IKKE med og kan ikke hentes ud. Efter en gendannelse skal alle sætte ny adgangskode.",
    },
    null,
    2,
  ),
);

const total = Object.values(optalt).reduce((a, b) => a + (b ?? 0), 0);
console.log(`\nFærdig: ${total} rækker, ${brugere.length} brugere, ${antalFiler} filer.`);
console.log(`Ligger i ${mappe}`);

/*
 * DATA ER I HUS, MEN KØRSLEN ER IKKE OK. Begge tilfælde ville ellers stå som
 * to linjer midt i en skærm fuld af tal og et "Færdig" nedenunder — og en
 * backup, der springer noget over uden at sige det, er værre end ingen.
 * Filerne er skrevet; exit-koden er dét, der kræver et menneske.
 */
if (ukendte.length) {
  console.log(
    `\nADVARSEL: ${ukendte.length} tabel(ler) var ikke på listen i backup.mjs:` +
      `\n  ${ukendte.join(", ")}` +
      `\nDe ER hentet med, men deres plads i indlæsningsrækkefølgen er UKENDT.` +
      `\nSlå deres fremmednøgler op, skriv dem ind i TABELLER, og kør igen.`,
  );
}
if (sprunget.length) {
  console.log(`\nADVARSEL: ${sprunget.length} tabel(ler) blev sprunget over: ${sprunget.join(", ")}`);
}
if (ukendte.length || sprunget.length) process.exit(1);
