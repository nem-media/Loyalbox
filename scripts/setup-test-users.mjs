// Opretter (idempotent) hele sættet af testbrugere, så alle roller og
// abonnementsniveauer kan prøves af.
//
// Adgangskoden kommer fra miljøet og står bevidst IKKE i koden: dette repo er
// offentligt, og testkontiene lever i produktionsdatabasen (ét Supabase-projekt
// til både udvikling og drift), så en hardkodet kode ville være et rigtigt login.
//
// Scriptet RØRER IKKE virksomheder, det ikke selv ejer, og det sletter aldrig
// noget. Kør det igen når som helst — det retter kun det, der mangler.
//
// Brug: TEST_PASSWORD="…" node scripts/setup-test-users.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const __dirname = dirname(fileURLToPath(import.meta.url));

const env = {};
for (const line of readFileSync(join(__dirname, "..", ".env.local"), "utf8").split(/\r?\n/)) {
  const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
  if (m) env[m[1]] = m[2].trim().replace(/^["']|["']$/g, "");
}

const PASSWORD = process.env.TEST_PASSWORD;
if (!PASSWORD) {
  console.error("Mangler TEST_PASSWORD i miljøet.");
  console.error('Brug: TEST_PASSWORD="…" node scripts/setup-test-users.mjs');
  process.exit(1);
}

const admin = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } },
);

/**
 * Personaerne.
 *
 * Pointen er at dække de tilstande, dashboardet OPFØRER SIG forskelligt i:
 * Basic har hverken stempelkort eller feedback-indbakke, Reviewstander Pro har
 * feedback men ikke stempelkort, og Komplet har det hele. Uden alle tre kan man
 * kun se den ene halvdel af sit eget produkt.
 */
const PERSONAER = [
  {
    email: "test-admin@loyalbox.test",
    rolle: "admin",
    beskrivelse: "Administrator — ser /admin med alle virksomheder og ordrer",
  },
  {
    email: "test-basic@loyalbox.test",
    rolle: "customer",
    virksomhed: { name: "Testkiosk Basic", plan: "basic", product_slug: "reviewstander" },
    stander: "Kiosken – disken",
    beskrivelse: "Basic — stander uden abonnement. Ingen feedback-indbakke, intet stempelkort",
  },
  {
    email: "test-pro@loyalbox.test",
    rolle: "customer",
    virksomhed: { name: "Testsalon Pro", plan: "pro", product_slug: "reviewstander-pro" },
    stander: "Salonen – receptionen",
    beskrivelse: "Reviewstander Pro — feedback og statistik, men stempelkort er låst",
  },
  {
    email: "test-kunde@loyalbox.test",
    rolle: "customer",
    virksomhed: { name: "Testcafe (demo)", plan: "pro", product_slug: "loyalsum-komplet" },
    beskrivelse: "LoyalSum Komplet — alt låst op, med demodata og medarbejdere",
  },
  {
    email: "test-medarbejder@loyalbox.test",
    rolle: "customer",
    medarbejderHos: "Testcafe (demo)",
    navn: "Test Medarbejder",
    rettigheder: { can_stamp: true, can_redeem: true, can_discount: true },
    beskrivelse: "Medarbejder med fulde rettigheder — lander på /personale",
  },
  {
    email: "test-medarbejder-begraenset@loyalbox.test",
    rolle: "customer",
    medarbejderHos: "Testcafe (demo)",
    navn: "Test Medarbejder (kun stempel)",
    rettigheder: { can_stamp: true, can_redeem: false, can_discount: false },
    beskrivelse: "Medarbejder der KUN må stemple — viser at rettigheder rent faktisk spærrer",
  },
  {
    email: "test-slutkunde@loyalbox.test",
    rolle: "customer",
    beskrivelse: "Butikkens kunde med konto — lander på /mine-kort",
  },
];

/* ------------------------------------------------------------- hjælpere */

async function alleBrugere() {
  const map = new Map();
  for (let side = 1; side <= 10; side++) {
    const { data, error } = await admin.auth.admin.listUsers({ page: side, perPage: 200 });
    if (error) throw new Error(error.message);
    for (const u of data.users) map.set((u.email ?? "").toLowerCase(), u);
    if (data.users.length < 200) break;
  }
  return map;
}

const slug = () => randomBytes(5).toString("hex");

/* ---------------------------------------------------------------- kørsel */

const brugere = await alleBrugere();
const resultat = [];

for (const p of PERSONAER) {
  const linje = { email: p.email, beskrivelse: p.beskrivelse, gjort: [] };

  // 1) Auth-brugeren. Adgangskoden sættes hver gang, så et glemt kodeord aldrig
  //    står i vejen for en test.
  let bruger = brugere.get(p.email);
  if (!bruger) {
    const { data, error } = await admin.auth.admin.createUser({
      email: p.email,
      password: PASSWORD,
      email_confirm: true,
      user_metadata: { role: p.rolle },
    });
    if (error) throw new Error(`${p.email}: ${error.message}`);
    bruger = data.user;
    linje.gjort.push("bruger oprettet");
  } else {
    const { error } = await admin.auth.admin.updateUserById(bruger.id, {
      password: PASSWORD,
      email_confirm: true,
    });
    if (error) throw new Error(`${p.email}: ${error.message}`);
    linje.gjort.push("kode sat");
  }

  // 2) Rollen i public.users. Triggeren opretter rækken ved signup, men rollen
  //    kan være en anden end den, personaen skal have.
  const { error: rolleFejl } = await admin
    .from("users")
    .upsert({ id: bruger.id, email: p.email, role: p.rolle }, { onConflict: "id" });
  if (rolleFejl) throw new Error(`${p.email}: ${rolleFejl.message}`);

  // 3) Virksomheden.
  if (p.virksomhed) {
    const { data: eksisterende } = await admin
      .from("companies")
      .select("id, name, plan, product_slug")
      .eq("user_id", bruger.id)
      .maybeSingle();

    let firmaId = eksisterende?.id;
    if (!firmaId) {
      const { data, error } = await admin
        .from("companies")
        .insert({ user_id: bruger.id, contact_email: p.email, ...p.virksomhed })
        .select("id")
        .single();
      if (error) throw new Error(`${p.email}: ${error.message}`);
      firmaId = data.id;
      linje.gjort.push("virksomhed oprettet");
    } else if (
      eksisterende.plan !== p.virksomhed.plan ||
      eksisterende.product_slug !== p.virksomhed.product_slug
    ) {
      const { error } = await admin
        .from("companies")
        .update({ plan: p.virksomhed.plan, product_slug: p.virksomhed.product_slug })
        .eq("id", firmaId);
      if (error) throw new Error(`${p.email}: ${error.message}`);
      linje.gjort.push("niveau rettet");
    }
    linje.firma = `${p.virksomhed.name} · ${p.virksomhed.plan} · ${p.virksomhed.product_slug}`;

    // 4) En stander, så siderne ikke står tomme. Kun hvis der ingen er.
    if (p.stander) {
      const { data: standere } = await admin
        .from("stands")
        .select("id")
        .eq("company_id", firmaId);
      if (!standere?.length) {
        const { error } = await admin.from("stands").insert({
          company_id: firmaId,
          name: p.stander,
          slug: slug(),
          destination_type: "google",
          google_review_url: "https://www.google.com/search?q=eksempel",
        });
        if (error) throw new Error(`${p.email}: ${error.message}`);
        linje.gjort.push("stander oprettet");
      }
    }
  }

  // 5) Medarbejder-tilknytning.
  if (p.medarbejderHos) {
    const { data: firma } = await admin
      .from("companies")
      .select("id")
      .eq("name", p.medarbejderHos)
      .maybeSingle();
    if (!firma) throw new Error(`Fandt ikke virksomheden ${p.medarbejderHos}`);

    const { data: raekke } = await admin
      .from("employees")
      .select("id")
      .eq("company_id", firma.id)
      .eq("user_id", bruger.id)
      .maybeSingle();

    const felter = {
      company_id: firma.id,
      user_id: bruger.id,
      name: p.navn,
      email: p.email,
      is_active: true,
      can_manage: false,
      ...p.rettigheder,
    };

    if (raekke) {
      const { error } = await admin.from("employees").update(felter).eq("id", raekke.id);
      if (error) throw new Error(`${p.email}: ${error.message}`);
    } else {
      const { error } = await admin.from("employees").insert(felter);
      if (error) throw new Error(`${p.email}: ${error.message}`);
      linje.gjort.push("medarbejder oprettet");
    }
    linje.firma = `medarbejder hos ${p.medarbejderHos}`;
  }

  resultat.push(linje);
}

/* ------------------------------------------------------------- oversigt */

console.log("\nTESTADGANGE — samme adgangskode til alle\n");
for (const r of resultat) {
  console.log(`  ${r.email}`);
  console.log(`     ${r.beskrivelse}`);
  if (r.firma) console.log(`     ${r.firma}`);
  console.log(`     (${r.gjort.join(", ")})\n`);
}

// Kortet uden konto: besiddelse af adressen ER adgangen, så den kan prøves
// uden at logge ind overhovedet.
const { data: kort } = await admin
  .from("loyalty_members")
  .select("name, public_token")
  .limit(1);
if (kort?.length) {
  const base = env.NEXT_PUBLIC_SITE_URL || "https://loyalsum.dk";
  console.log("STEMPELKORT UDEN LOGIN (sådan ser butikkens kunde det):");
  console.log(`  ${kort[0].name}: ${base}/kort/${kort[0].public_token}\n`);
}
