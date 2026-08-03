import { existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'drizzle-kit';

// drizzle-kit reads `.env` relative to its own working directory, which is this package —
// but the credentials live in one root `.env` shared by every workspace. Load it explicitly
// so `npm run db:migrate` works from anywhere instead of failing with an empty URL.
const rootEnv = join(dirname(fileURLToPath(import.meta.url)), '..', '..', '.env');
if (existsSync(rootEnv)) process.loadEnvFile(rootEnv);

/**
 * Migrations run against the DIRECT Postgres connection, not the pooler. Supabase's
 * transaction pooler does not support the session-level statements DDL needs, so pointing
 * this at the pooled URL produces confusing intermittent failures.
 */
export default defineConfig({
  schema: './src/schema.ts',
  out: './migrations',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_DIRECT_URL ?? process.env.DATABASE_URL ?? '',
  },
  verbose: true,
  strict: true,
});
