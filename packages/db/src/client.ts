/**
 * Database client.
 *
 * The API connects as the Supabase **service role**, which bypasses RLS. That is necessary
 * — one connection pool serves every tenant — and it is also why `tenantScope` below exists.
 * Read docs/adr/0004-rls-tenant-isolation.md before using this module.
 */
import type { OrganizationId } from '@voomate/core';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import type { PgColumn, PgTable } from 'drizzle-orm/pg-core';
import postgres from 'postgres';
import * as schema from './schema.js';

export type Database = ReturnType<typeof createDatabase>;

export interface DatabaseOptions {
  connectionString: string;
  /** Keep modest — Supabase's pooler has its own limits and stacking pools causes grief. */
  maxConnections?: number;
  /** Logs every statement. Development only; statements can contain visitor content. */
  debug?: boolean;
}

export const createDatabase = ({
  connectionString,
  maxConnections = 10,
  debug = false,
}: DatabaseOptions) => {
  const sql = postgres(connectionString, {
    max: maxConnections,
    idle_timeout: 20,
    connect_timeout: 10,
    // Supabase's transaction pooler cannot cache prepared statements across connections.
    prepare: false,
  });

  return drizzle(sql, { schema, logger: debug });
};

/**
 * Tenant scope predicate.
 *
 * Every query touching a tenant-scoped table must include this. It exists as a named helper
 * rather than an inline `eq(...)` so that "is this query scoped?" is answerable by grepping
 * for `tenantScope`, and so a reviewer sees its absence immediately.
 *
 *   db.select().from(agents).where(and(tenantScope(agents, ctx), eq(agents.id, id)))
 *
 * A tenant-table query without it is a bug, even when it appears to work — it works because
 * the caller happened to filter by an ID that belonged to them.
 */
export const tenantScope = <T extends PgTable & { organizationId: PgColumn }>(
  table: T,
  organizationId: OrganizationId,
) => eq(table.organizationId, organizationId);

export { schema };
