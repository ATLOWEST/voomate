# ADR 0004 — Enforce tenant isolation with Postgres Row Level Security

**Status:** Accepted · 2026-08-02

## Context

Multi-tenant SaaS. A cross-tenant data leak is an existential failure — it ends customer
trust and, for a support product holding conversation logs, likely ends the company.

Options: (a) discipline in the application layer, every query filtered by `organization_id`;
(b) a database per tenant; (c) shared database with Row Level Security.

## Decision

Shared Postgres with **RLS on every tenant-scoped table**, plus an application-layer
`TenantContext` required by every repository function. Both layers, deliberately redundant.

## Rationale

Application-layer filtering alone fails to one forgotten `WHERE` clause. That's a single
typo, in a codebase that will grow, written by people under deadline. The failure is silent —
it returns data rather than throwing — and it can persist undetected for a long time.

RLS makes that class of bug *impossible* rather than *unlikely*. The database refuses to
return rows outside the tenant scope regardless of what the query says. It converts a
catastrophic silent bug into an empty result set.

A database per tenant isolates most strongly but makes migrations, connection pooling, and
cross-tenant analytics painful, and it doesn't fit Supabase's model — which we want for its
integrated auth.

## Consequences

- **Every tenant table needs a policy.** A new table without one is a leak, so this must be a
  migration review checklist item and ideally an automated test that fails on any
  tenant-scoped table lacking `ENABLE ROW LEVEL SECURITY`.
- **The API's service role bypasses RLS by design** — it needs to serve many tenants. So RLS
  protects against direct client access and against our own accidental unscoped queries in
  service-role paths only insofar as the application layer holds. This is precisely why both
  layers exist, and why the service role key must never leave the server.
- Some performance cost on policy evaluation; mitigated by indexing `organization_id` on
  every tenant table.
- Policies are tested explicitly: for each table, a cross-tenant read attempt must return
  zero rows. This is a test suite, not a code review item.

## Consequences for AWS resources

RLS covers Postgres only. Bedrock Knowledge Bases and S3 objects get their own isolation —
a KB per tenant and per-tenant S3 prefixes — because there is no RLS equivalent there.
