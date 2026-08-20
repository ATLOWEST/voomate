-- Global platform access is not a tenant role. It is an explicit, minimal allowlist that can
-- only be managed through controlled server-side operations. A signed-in user can at most
-- confirm their own membership; they cannot enumerate administrators or grant access.

alter table public.platform_administrators enable row level security;
alter table public.platform_administrators force row level security;

grant select on public.platform_administrators to authenticated;

drop policy if exists platform_administrators_select_self on public.platform_administrators;
create policy platform_administrators_select_self on public.platform_administrators
  for select using (user_id = auth.uid());
