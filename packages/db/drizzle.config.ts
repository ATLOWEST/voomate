import { defineConfig } from 'drizzle-kit';

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
