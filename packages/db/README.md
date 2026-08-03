# @soniq/db

Multi-tenant Postgres schema, RLS policies, and migrations.

## The rule

**Every tenant-scoped table needs three things.** Miss any one and you have a data leak:

1. An `organization_id` column, indexed.
2. An RLS policy in `migrations/0001_rls_policies.sql`.
3. An entry in `TENANT_SCOPED_TABLES` in [src/schema.ts](src/schema.ts), which the
   conformance test iterates.

## Why both RLS *and* application scoping

The API connects with the Supabase **service role**, which bypasses RLS — it has to, since
one pool serves all tenants. So the two layers guard different things:

| Layer | Guards against |
|---|---|
| RLS | Direct client access with the anon key; a leaked anon key; the dashboard's own Supabase queries |
| `tenantScope()` | Our own API forgetting a `WHERE` clause |

Neither is sufficient alone. Details in
[docs/adr/0004-rls-tenant-isolation.md](../../docs/adr/0004-rls-tenant-isolation.md).

## Migrations

```bash
npm run db:generate     # generate SQL from schema.ts changes
npm run db:migrate      # apply to DATABASE_DIRECT_URL
```

Migrations use the **direct** connection, not the pooler — Supabase's transaction pooler
doesn't support the session-level statements DDL needs, and pointing at it produces
intermittent failures that look like network flakiness.

`0001_rls_policies.sql` is hand-written and applied after the generated schema migration.
Drizzle doesn't generate policies, and these are too important to leave to a tool.

## Ordering note

`0001_rls_policies.sql` references `public.org_role`, `public.users` and the other tables,
so the generated schema migration must be applied first. Run `db:generate` before the first
`db:migrate` so the generated migration lands as `0000_*`.
