# @voomate/db

Multi-tenant Postgres schema, RLS policies, and migrations. Also the vector store — see
[ADR 0005](../../docs/adr/0005-supabase-pgvector.md).

## The rule

**Every tenant-scoped table needs three things.** Miss any one and you have a data leak:

1. An `organization_id` column, indexed.
2. An RLS policy in `migrations/manual/10_rls_policies.sql`.
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

Two kinds, in two places, applied in a fixed order:

```
migrations/manual/00_extensions.sql        hand-written  → pgvector, version-gated
migrations/<generated>.sql                 drizzle-kit   → tables, columns, indexes
migrations/manual/10_rls_policies.sql      hand-written  → RLS, helpers, signup trigger
migrations/manual/20_pgvector_retrieval.sql hand-written → HNSW index, match function
```

`db:manual` takes filename prefixes, because `00_` has to be interleaved *before* the
generated schema and the rest *after* it. On a fresh database:

```bash
npm run db:manual -- 00     # pgvector, so the `vector` column type exists
npm run db:generate         # generate SQL from schema.ts changes
npm run db:migrate          # apply the generated migrations
npm run db:manual -- 10 20  # RLS policies, then the HNSW index and match function
```

Day to day, only the last step changes: edit a policy, re-run `npm run db:manual -- 10`.
Every hand-written file is idempotent — `10_` drops and recreates every policy in `public`,
so the file is the single authority on what the policies are rather than a log of edits.

Then prove it works:

```bash
npm run db:verify           # cross-tenant read test + live retrieval round-trip
```

Migrations use the **direct** connection, not the pooler — Supabase's transaction pooler
doesn't support the session-level statements DDL needs, and pointing at it produces
intermittent failures that look like network flakiness.

## Verifying

Two scripts, both of which roll back everything they write, so they are safe against a live
database:

| Script | What it proves |
|---|---|
| `scripts/verify-rls.mjs` | A member of org A cannot read, insert into, update or delete org B — checked as the `authenticated` role with a real JWT claim, not as the table owner |
| `scripts/verify-retrieval.mjs` | A real Titan embedding survives the round trip through pgvector, ranks the right chunk first, respects the similarity floor, and refuses a foreign `organization_id` or `agent_id` |

`verify-rls` is the one that matters most. `relrowsecurity = true` only says RLS is switched
on; a policy with `using (true)` reports exactly the same. Run it after any change to
`10_rls_policies.sql`.

`verify-retrieval` costs a few Titan calls (fractions of a cent) and needs AWS credentials.
It deliberately re-implements the embedding request rather than importing
`apps/api/src/lib/embeddings.ts` — a test that imports the code it checks agrees with itself
by construction and cannot notice drift against the real service.

### Why `manual/` is a separate directory

`drizzle-kit generate` names its output `0000_*`, `0001_*`, … and tracks it in
`meta/_journal.json`. Hand-written files previously sat in the same directory and the same
number space, which meant two problems: the next generated migration could collide with a
hand-written name, and `drizzle-kit migrate` silently skipped the hand-written ones because
they were absent from the journal. Separating them makes the ordering explicit and the
tooling's responsibilities disjoint.

`00_extensions.sql` must run **before** the generated schema — `knowledge_chunks.embedding`
is of type `vector`, which does not exist until pgvector is installed.

## The vector store

`knowledge_chunks` holds one row per chunk with a `vector(1024)` embedding
(Titan Embed Text v2). Retrieval goes through `match_knowledge_chunks()`, scoped by
organization **and** agent.

Two things in `20_pgvector_retrieval.sql` are load-bearing and easy to undo by accident:

- **HNSW, not IVFFlat.** IVFFlat picks its lists from existing data at build time; our table
  starts empty and grows as merchants onboard, so there is nothing to train on.
- **`hnsw.iterative_scan = relaxed_order`.** Retrieval filters by `agent_id`. Without
  iterative scans, HNSW gathers its candidates *first* and filters *second*, so a tenant
  owning a small share of the table gets back fewer results than requested — sometimes none —
  with no error. `00_extensions.sql` refuses to run on a pgvector older than 0.8.0 for this
  reason.
