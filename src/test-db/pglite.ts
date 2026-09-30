import { PGlite } from "@electric-sql/pglite";
import { pgcrypto } from "@electric-sql/pglite/contrib/pgcrypto";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";

/**
 * EN RIGTIG POSTGRES I PRØVERNE — UDEN EN SERVER.
 *
 * Migrationerne køres i hånden i Supabase → SQL Editor, og indtil nu har
 * prøverne kun kunnet LÆSE SQL'en som tekst. Det fanger et glemt `revoke`,
 * men ikke en funktion, der regner forkert, eller et unikt indeks, der ikke
 * spærrer det, det skulle. PGlite er Postgres oversat til WebAssembly: samme
 * parser, samme plpgsql, samme indeks — og det kører i Vitest.
 *
 * SUPABASE-SKEMAERNE ER ATTRAPPER. `auth.users`, `auth.uid()` og `storage.*`
 * findes kun i Supabase, så de oprettes her i den mindste form, migrationerne
 * kan køre imod. Intet i prøverne bygger på, at de opfører sig som de rigtige.
 *
 * BEGRÆNSNING, DER SKAL SIGES HØJT: PGlite har ÉN forbindelse. To "samtidige"
 * kald kører efter hinanden, så en prøve her kan ikke bevise, at to parallelle
 * transaktioner ikke kan snyde hinanden — kun at låsen, indekset og den
 * betingede sætning står, og at gentagelser giver det rigtige svar.
 */

const ATTRAPPER = `
do $$ begin create role anon; exception when duplicate_object then null; end $$;
do $$ begin create role authenticated; exception when duplicate_object then null; end $$;
do $$ begin create role service_role; exception when duplicate_object then null; end $$;
create schema if not exists auth;
create table if not exists auth.users (
  id uuid primary key default gen_random_uuid(),
  email text,
  raw_user_meta_data jsonb default '{}'::jsonb,
  created_at timestamptz default now()
);
create or replace function auth.uid() returns uuid language sql stable as $$ select null::uuid $$;
create or replace function auth.role() returns text language sql stable as $$ select 'service_role'::text $$;
create schema if not exists storage;
create table if not exists storage.buckets (
  id text primary key, name text, public boolean default false,
  file_size_limit bigint, allowed_mime_types text[]
);
create table if not exists storage.objects (
  id uuid primary key default gen_random_uuid(),
  bucket_id text, name text, owner uuid, created_at timestamptz default now()
);
create or replace function storage.foldername(name text) returns text[]
  language sql immutable as $$ select string_to_array(name, '/') $$;
`;

const MAPPE = join(process.cwd(), "supabase", "migrations");

export function migrationsfiler(): string[] {
  return readdirSync(MAPPE)
    .filter((f) => f.endsWith(".sql"))
    .sort();
}

/** En frisk base med alle migrationer kørt i rækkefølge. */
export async function nyBase(): Promise<PGlite> {
  const db = await PGlite.create({ extensions: { pgcrypto } });
  await db.exec(ATTRAPPER);
  for (const fil of migrationsfiler()) {
    const sql = readFileSync(join(MAPPE, fil), "utf8");
    try {
      await db.exec(sql);
    } catch (e) {
      throw new Error(`${fil}: ${(e as Error).message}`);
    }
  }
  return db;
}
