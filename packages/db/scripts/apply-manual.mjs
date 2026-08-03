/**
 * Applies the hand-written migrations in `migrations/manual/`, in filename order.
 *
 * drizzle-kit cannot own these: they contain extension installs, RLS policies, a SECURITY
 * DEFINER helper and an HNSW index with build parameters — none of which `schema.ts` can
 * express, and all of which are load-bearing. Keeping them in a separate directory with their
 * own runner is what stops `drizzle-kit generate` from silently dropping them on the next
 * schema change.
 *
 * Ordering is the whole point of the numeric prefixes:
 *
 *   00_  before the generated schema — `knowledge_chunks.embedding` is of type `vector`,
 *        which does not exist until pgvector is installed
 *   10_  after it — policies reference tables
 *   20_  after it — the index and match function reference the table and its column type
 *
 * So this takes a prefix argument, and the full sequence is:
 *
 *   node scripts/apply-manual.mjs 00
 *   npx drizzle-kit generate && npx drizzle-kit migrate
 *   node scripts/apply-manual.mjs 10 20
 *
 * Every file is written to be idempotent (`create ... if not exists`, `create or replace`,
 * `drop policy if exists`), so re-running is safe and is the normal way to pick up an edit.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import postgres from 'postgres';
import { loadEnv } from './load-env.mjs';

loadEnv();

const here = dirname(fileURLToPath(import.meta.url));
const manualDir = join(here, '..', 'migrations', 'manual');

// Migrations use the direct connection. Supabase's transaction pooler does not keep a session
// across statements, and DDL that sets session-level parameters fails intermittently against
// it — which reads as network flakiness rather than as the configuration error it is.
const url = process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL;
if (!url) {
  console.error('DATABASE_DIRECT_URL is not set. Migrations need the direct connection.');
  process.exit(1);
}

const prefixes = process.argv.slice(2);
const files = readdirSync(manualDir)
  .filter((name) => name.endsWith('.sql'))
  .filter((name) => prefixes.length === 0 || prefixes.some((p) => name.startsWith(p)))
  .sort();

if (files.length === 0) {
  console.error(`No manual migrations matched ${prefixes.join(', ') || '(all)'}`);
  process.exit(1);
}

const sql = postgres(url, { prepare: false, connect_timeout: 20, max: 1, onnotice: () => {} });

let failed = false;
for (const file of files) {
  const body = readFileSync(join(manualDir, file), 'utf8');
  process.stdout.write(`  ${file} ... `);
  try {
    // `sql.unsafe` because this is a whole file of DDL, not a parameterised query. The input
    // is a checked-in file, not user input.
    await sql.unsafe(body);
    console.log('ok');
  } catch (error) {
    console.log('FAILED');
    console.error(`\n${error.message}\n`);
    failed = true;
    break;
  }
}

await sql.end({ timeout: 5 });
process.exit(failed ? 1 : 0);
