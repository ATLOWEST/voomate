-- =============================================================================
-- Row Level Security policies
--
-- This file is the backstop that makes application-layer bugs non-catastrophic.
-- Read docs/adr/0004-rls-tenant-isolation.md before changing anything here.
--
-- Apply AFTER the Drizzle-generated schema migration.
--
-- IMPORTANT: the API connects with the Supabase service role, which bypasses RLS by
-- design. These policies therefore protect against:
--   - direct client access using the anon key (the dashboard's own Supabase client)
--   - a compromised or misused anon key
-- They do NOT protect against an unscoped query made by our own API. That is what the
-- application-layer TenantContext is for. Both layers are required; neither is sufficient.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Make this file re-runnable.
--
-- `create policy` has no `if not exists` form, so without this the file applies once and
-- every later edit has to be hand-applied — which is how a policy set drifts out of step
-- with the file that is supposed to define it. Dropping first makes this file the single
-- authority: whatever is below is exactly what the database ends up with.
--
-- Scoped to `public`, so Supabase's own policies on auth/storage schemas are untouched.
-- -----------------------------------------------------------------------------
do $$
declare
  pol record;
begin
  for pol in select policyname, tablename from pg_policies where schemaname = 'public'
  loop
    execute format('drop policy if exists %I on public.%I', pol.policyname, pol.tablename);
  end loop;
end
$$;

-- -----------------------------------------------------------------------------
-- Helper: which organizations does the current user belong to?
--
-- SECURITY DEFINER is essential. Without it, a policy on organization_members that
-- queries organization_members recurses infinitely. The definer context reads the
-- table with RLS bypassed, which is safe because the function only ever returns rows
-- for auth.uid() — the caller cannot influence which user it resolves.
--
-- search_path is pinned to defeat search_path hijacking on a SECURITY DEFINER function.
-- -----------------------------------------------------------------------------
create or replace function public.user_organization_ids()
returns setof uuid
language sql
stable
security definer
set search_path = public
as $$
  select organization_id
  from public.organization_members
  where user_id = auth.uid()
$$;

comment on function public.user_organization_ids() is
  'Organizations the calling user belongs to. SECURITY DEFINER to avoid RLS recursion.';

-- -----------------------------------------------------------------------------
-- Helper: does the current user hold at least the given role in an organization?
-- Role ranking must stay in sync with ROLE_RANK in packages/core/src/domain.ts.
-- -----------------------------------------------------------------------------
create or replace function public.user_has_role(
  target_org uuid,
  minimum_role public.org_role
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organization_members m
    where m.user_id = auth.uid()
      and m.organization_id = target_org
      and case m.role
            when 'owner'     then 3
            when 'admin'     then 2
            when 'developer' then 1
            when 'viewer'    then 0
          end
          >=
          case minimum_role
            when 'owner'     then 3
            when 'admin'     then 2
            when 'developer' then 1
            when 'viewer'    then 0
          end
  )
$$;

-- -----------------------------------------------------------------------------
-- users — a user may only see their own row
-- -----------------------------------------------------------------------------
alter table public.users enable row level security;
alter table public.users force row level security;

create policy users_select_self on public.users
  for select using (id = auth.uid());

create policy users_update_self on public.users
  for update using (id = auth.uid()) with check (id = auth.uid());

-- -----------------------------------------------------------------------------
-- organizations — visible only to members; only owners/admins may modify
-- -----------------------------------------------------------------------------
alter table public.organizations enable row level security;
alter table public.organizations force row level security;

create policy organizations_select_member on public.organizations
  for select using (id in (select public.user_organization_ids()));

create policy organizations_update_admin on public.organizations
  for update using (public.user_has_role(id, 'admin'))
  with check (public.user_has_role(id, 'admin'));

create policy organizations_delete_owner on public.organizations
  for delete using (public.user_has_role(id, 'owner'));

-- -----------------------------------------------------------------------------
-- organization_members — members see the roster; admins manage it
-- -----------------------------------------------------------------------------
alter table public.organization_members enable row level security;
alter table public.organization_members force row level security;

create policy organization_members_select on public.organization_members
  for select using (organization_id in (select public.user_organization_ids()));

create policy organization_members_insert_admin on public.organization_members
  for insert with check (public.user_has_role(organization_id, 'admin'));

create policy organization_members_update_admin on public.organization_members
  for update using (public.user_has_role(organization_id, 'admin'))
  with check (public.user_has_role(organization_id, 'admin'));

-- A member may always remove themselves; admins may remove others.
create policy organization_members_delete on public.organization_members
  for delete using (
    user_id = auth.uid() or public.user_has_role(organization_id, 'admin')
  );

-- -----------------------------------------------------------------------------
-- Tenant-scoped tables
--
-- The pattern below is uniform on purpose: read for any member, write for developer
-- and above. Uniformity is what makes it auditable at a glance — an inconsistent
-- policy is where leaks hide.
-- -----------------------------------------------------------------------------

-- agents
alter table public.agents enable row level security;
alter table public.agents force row level security;

create policy agents_select on public.agents
  for select using (organization_id in (select public.user_organization_ids()));

create policy agents_insert on public.agents
  for insert with check (public.user_has_role(organization_id, 'developer'));

create policy agents_update on public.agents
  for update using (public.user_has_role(organization_id, 'developer'))
  with check (public.user_has_role(organization_id, 'developer'));

-- Deliberately no agent DELETE policy. Customer-facing removal is archival; physical erasure is
-- a separately governed retention operation performed by the service role after policy checks.

-- Business Operating Profile versions are immutable proposals promoted by an explicit admin
-- review. There is deliberately no delete policy: evidence and prior decisions remain auditable.
alter table public.business_profile_versions enable row level security;
alter table public.business_profile_versions force row level security;

create policy business_profile_versions_select on public.business_profile_versions
  for select using (organization_id in (select public.user_organization_ids()));

create policy business_profile_versions_insert on public.business_profile_versions
  for insert with check (public.user_has_role(organization_id, 'developer'));

create policy business_profile_versions_update on public.business_profile_versions
  for update using (public.user_has_role(organization_id, 'admin'))
  with check (public.user_has_role(organization_id, 'admin'));

alter table public.business_profile_evidence enable row level security;
alter table public.business_profile_evidence force row level security;

create policy business_profile_evidence_select on public.business_profile_evidence
  for select using (organization_id in (select public.user_organization_ids()));

create policy business_profile_evidence_insert on public.business_profile_evidence
  for insert with check (public.user_has_role(organization_id, 'developer'));

create policy business_profile_evidence_update on public.business_profile_evidence
  for update using (public.user_has_role(organization_id, 'admin'))
  with check (public.user_has_role(organization_id, 'admin'));

-- agent_connections — members can inspect topology; developers may change routing.
alter table public.agent_connections enable row level security;
alter table public.agent_connections force row level security;

create policy agent_connections_select on public.agent_connections
  for select using (organization_id in (select public.user_organization_ids()));

create policy agent_connections_write on public.agent_connections
  for all using (public.user_has_role(organization_id, 'developer'))
  with check (public.user_has_role(organization_id, 'developer'));

-- agent_active_tools — enabling an action capability changes the agent's authority, so only
-- admins may mutate grants. Members may inspect the effective capability set.
alter table public.agent_active_tools enable row level security;
alter table public.agent_active_tools force row level security;

create policy agent_active_tools_select on public.agent_active_tools
  for select using (organization_id in (select public.user_organization_ids()));

create policy agent_active_tools_write on public.agent_active_tools
  for all using (public.user_has_role(organization_id, 'admin'))
  with check (public.user_has_role(organization_id, 'admin'));

-- tool_audit_logs — append-only from the execution harness and visible only to admins. There is
-- deliberately no client insert, update, or delete policy.
alter table public.tool_audit_logs enable row level security;
alter table public.tool_audit_logs force row level security;

create policy tool_audit_logs_select_admin on public.tool_audit_logs
  for select using (public.user_has_role(organization_id, 'admin'));

-- approval_requests — the backend creates requests; authorized dashboard users review them.
alter table public.approval_requests enable row level security;
alter table public.approval_requests force row level security;

create policy approval_requests_select on public.approval_requests
  for select using (organization_id in (select public.user_organization_ids()));

create policy approval_requests_write on public.approval_requests
  for all using (public.user_has_role(organization_id, 'developer'))
  with check (public.user_has_role(organization_id, 'developer'));

-- knowledge_sources
alter table public.knowledge_sources enable row level security;
alter table public.knowledge_sources force row level security;

create policy knowledge_sources_select on public.knowledge_sources
  for select using (organization_id in (select public.user_organization_ids()));

create policy knowledge_sources_write on public.knowledge_sources
  for all using (public.user_has_role(organization_id, 'developer'))
  with check (public.user_has_role(organization_id, 'developer'));

-- knowledge_documents
alter table public.knowledge_documents enable row level security;
alter table public.knowledge_documents force row level security;

create policy knowledge_documents_select on public.knowledge_documents
  for select using (organization_id in (select public.user_organization_ids()));

create policy knowledge_documents_write on public.knowledge_documents
  for all using (public.user_has_role(organization_id, 'developer'))
  with check (public.user_has_role(organization_id, 'developer'));

-- knowledge_chunks — the retrieval corpus (docs/adr/0005-supabase-pgvector.md).
--
-- Read-only to members, and written exclusively by the API's ingestion pipeline. There
-- is deliberately no client write path: a chunk's `embedding` must correspond to its
-- `content`, and nothing enforces that except the code that produced both. A client
-- able to insert rows could poison retrieval by pairing arbitrary text with an
-- embedding chosen to rank first for common questions.
alter table public.knowledge_chunks enable row level security;
alter table public.knowledge_chunks force row level security;

create policy knowledge_chunks_select on public.knowledge_chunks
  for select using (organization_id in (select public.user_organization_ids()));

create policy knowledge_chunks_delete on public.knowledge_chunks
  for delete using (public.user_has_role(organization_id, 'developer'));

-- knowledge_gaps — generated by the backend from untrusted visitor questions. Members can read
-- the queue; developers may curate status and approved answers but cannot bypass tenant scope.
alter table public.knowledge_gaps enable row level security;
alter table public.knowledge_gaps force row level security;

create policy knowledge_gaps_select on public.knowledge_gaps
  for select using (organization_id in (select public.user_organization_ids()));

create policy knowledge_gaps_write on public.knowledge_gaps
  for all using (public.user_has_role(organization_id, 'developer'))
  with check (public.user_has_role(organization_id, 'developer'));

-- conversations — read-only from the client. Only the API (service role) writes these,
-- because conversations are created by anonymous website visitors, not by logged-in users.
alter table public.conversations enable row level security;
alter table public.conversations force row level security;

create policy conversations_select on public.conversations
  for select using (organization_id in (select public.user_organization_ids()));

create policy conversations_delete on public.conversations
  for delete using (public.user_has_role(organization_id, 'admin'));

-- messages — same reasoning as conversations
alter table public.messages enable row level security;
alter table public.messages force row level security;

create policy messages_select on public.messages
  for select using (organization_id in (select public.user_organization_ids()));

create policy messages_delete on public.messages
  for delete using (public.user_has_role(organization_id, 'admin'));

-- message_feedback — visitors write only through the signed Web Agent endpoint; tenant members
-- may inspect aggregated learning evidence. Direct client mutation would let a dashboard user
-- forge evaluation signals, so there is deliberately no client write policy.
alter table public.message_feedback enable row level security;
alter table public.message_feedback force row level security;

create policy message_feedback_select on public.message_feedback
  for select using (organization_id in (select public.user_organization_ids()));

create policy message_feedback_delete on public.message_feedback
  for delete using (public.user_has_role(organization_id, 'admin'));

-- agent_turn_evaluations — offline Nova judge evidence, append-only from the backend.
alter table public.agent_turn_evaluations enable row level security;
alter table public.agent_turn_evaluations force row level security;

create policy agent_turn_evaluations_select on public.agent_turn_evaluations
  for select using (organization_id in (select public.user_organization_ids()));

create policy agent_turn_evaluations_delete on public.agent_turn_evaluations
  for delete using (public.user_has_role(organization_id, 'admin'));

-- agent_run_events — runtime traces are written only by the backend and visible to members.
alter table public.agent_run_events enable row level security;
alter table public.agent_run_events force row level security;

create policy agent_run_events_select on public.agent_run_events
  for select using (organization_id in (select public.user_organization_ids()));

create policy agent_run_events_delete on public.agent_run_events
  for delete using (public.user_has_role(organization_id, 'admin'));

-- web_agent_orders — the controlled tool owns writes; members may inspect the projection.
alter table public.web_agent_orders enable row level security;
alter table public.web_agent_orders force row level security;

create policy web_agent_orders_select on public.web_agent_orders
  for select using (organization_id in (select public.user_organization_ids()));

create policy web_agent_orders_write on public.web_agent_orders
  for all using (public.user_has_role(organization_id, 'developer'))
  with check (public.user_has_role(organization_id, 'developer'));

-- web_agent_image_uploads — attachment metadata is visible to tenant members, but only the
-- controlled Web Agent backend may create or mutate upload lifecycle rows. Storage objects stay
-- private and are addressed through tenant-derived paths rather than this policy.
alter table public.web_agent_image_uploads enable row level security;
alter table public.web_agent_image_uploads force row level security;

create policy web_agent_image_uploads_select on public.web_agent_image_uploads
  for select using (organization_id in (select public.user_organization_ids()));

create policy web_agent_image_uploads_delete on public.web_agent_image_uploads
  for delete using (public.user_has_role(organization_id, 'admin'));

-- organization_integrations — credentials are never directly selectable or writable. The
-- dashboard uses the validated API; direct clients may only let an admin revoke a row.
alter table public.organization_integrations enable row level security;
alter table public.organization_integrations force row level security;

create policy organization_integrations_delete on public.organization_integrations
  for delete using (public.user_has_role(organization_id, 'admin'));

-- read_only_connections — safe metadata is visible to members; configuration is admin-only.
alter table public.read_only_connections enable row level security;
alter table public.read_only_connections force row level security;

create policy read_only_connections_select on public.read_only_connections
  for select using (organization_id in (select public.user_organization_ids()));

create policy read_only_connections_write on public.read_only_connections
  for all using (public.user_has_role(organization_id, 'admin'))
  with check (public.user_has_role(organization_id, 'admin'));

-- read_only_connection_secrets — deliberately no SELECT policy. Even an owner configures a
-- connection through the API and can never read stored ciphertext through Supabase.
alter table public.read_only_connection_secrets enable row level security;
alter table public.read_only_connection_secrets force row level security;

create policy read_only_connection_secrets_delete on public.read_only_connection_secrets
  for delete using (public.user_has_role(organization_id, 'admin'));

-- read_only_invocations — immutable, metadata-only runtime evidence written by the backend.
alter table public.read_only_invocations enable row level security;
alter table public.read_only_invocations force row level security;

create policy read_only_invocations_select on public.read_only_invocations
  for select using (organization_id in (select public.user_organization_ids()));

create policy read_only_invocations_delete on public.read_only_invocations
  for delete using (public.user_has_role(organization_id, 'admin'));

-- api_keys — admin only, in both directions. key_hash must never be readable by a
-- viewer, and there is no legitimate reason for a non-admin to enumerate keys.
alter table public.api_keys enable row level security;
alter table public.api_keys force row level security;

create policy api_keys_select_admin on public.api_keys
  for select using (public.user_has_role(organization_id, 'admin'));

create policy api_keys_write_admin on public.api_keys
  for all using (public.user_has_role(organization_id, 'admin'))
  with check (public.user_has_role(organization_id, 'admin'));

-- usage_records — read-only to members. Written exclusively by the API.
alter table public.usage_records enable row level security;
alter table public.usage_records force row level security;

create policy usage_records_select on public.usage_records
  for select using (organization_id in (select public.user_organization_ids()));

-- audit_logs — read-only to admins, append-only via the API. Deliberately no update or
-- delete policy: an audit log a tenant can edit is not an audit log.
alter table public.audit_logs enable row level security;
alter table public.audit_logs force row level security;

create policy audit_logs_select_admin on public.audit_logs
  for select using (public.user_has_role(organization_id, 'admin'));

-- -----------------------------------------------------------------------------
-- Mirror auth.users into public.users on signup.
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    new.raw_user_meta_data ->> 'full_name',
    new.raw_user_meta_data ->> 'avatar_url'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
