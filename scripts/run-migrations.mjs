// Runs every .sql file in supabase/migrations (sorted) against DATABASE_URL.
// Usage: DATABASE_URL="postgresql://..." node scripts/run-migrations.mjs
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import pg from "pg";

const __dirname = dirname(fileURLToPath(import.meta.url));
const migrationsDir = join(__dirname, "..", "supabase", "migrations");

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  console.error("Missing DATABASE_URL");
  process.exit(1);
}

const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith(".sql"))
  .sort();

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

try {
  await client.connect();
  for (const file of files) {
    const sql = readFileSync(join(migrationsDir, file), "utf8");
    process.stdout.write(`Running ${file} ... `);
    await client.query(sql);
    console.log("OK");
  }
  console.log("\nAll migrations applied.");
} catch (err) {
  console.error("\nMigration failed:", err.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
