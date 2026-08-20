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

const optalt = {};
for (const tabel of TABELLER) {
  try {
    const raekker = await hentTabel(url, hoveder, tabel);
    writeFileSync(join(mappe, `${tabel}.json`), JSON.stringify(raekker, null, 2));
    optalt[tabel] = raekker.length;
    console.log(`  ${tabel.padEnd(22)} ${String(raekker.length).padStart(6)}`);
  } catch (err) {
    // En manglende tabel må ikke stoppe resten — så var eksporten intet værd
    // netop den dag, en migration var halvvejs.
    optalt[tabel] = null;
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
      indlaesningsraekkefoelge: TABELLER,
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
