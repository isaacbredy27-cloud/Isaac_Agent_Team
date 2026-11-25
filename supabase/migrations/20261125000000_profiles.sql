-- Migration: profiles table, RLS, sign-up trigger and role audit.
-- Owner: supabase-auth-engineer. Reviewers: security-expert, privacy-compliance-specialist.
-- Source: knowledge/supabase-auth-engineer/examples/profiles-rls.sql (reviewed). Body below is unchanged.
-- The project lead runs this once in the Supabase dashboard SQL editor. See supabase/README.md.
-- Test sign up on a dev project first: a failing trigger blocks every sign up.
-- Sources (read 2026-11-25):
--   https://supabase.com/docs/guides/database/postgres/row-level-security
--   https://supabase.com/docs/guides/auth/managing-user-data
-- No resume data in Supabase (ADR 0004). Roles: user, super_admin only (ADR 0006).

-- 1. Private schema: not listed under "Exposed schemas", so the Data API cannot call into it.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 2. profiles: one row per auth user. Roles are only user and super_admin.
create table public.profiles (
  id uuid not null references auth.users on delete cascade,
  role text not null default 'user' check (role in ('user', 'super_admin')),
  created_at timestamptz not null default now(),
  primary key (id)
);

-- 3. RLS on. People read only their own row. No insert, update or delete policy exists.
alter table public.profiles enable row level security;
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create policy "profiles: read own row"
  on public.profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- 4. Sign-up trigger. Inserts only the id; the role takes its default.
-- A failure here blocks sign ups, so every name is schema-qualified.
create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id) values (new.id);
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function private.handle_new_user();

-- 5. Audit table for role changes. RLS on with no policies: only the database owner reads it.
create table private.role_changes (
  id bigint generated always as identity primary key,
  profile_id uuid not null,
  old_role text,
  new_role text not null,
  changed_by text not null default session_user,
  changed_at timestamptz not null default now()
);
alter table private.role_changes enable row level security;
revoke all on private.role_changes from public, anon, authenticated;

create function private.log_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if new.role <> 'user' then
      insert into private.role_changes (profile_id, old_role, new_role) values (new.id, null, new.role);
    end if;
  elsif new.role is distinct from old.role then
    insert into private.role_changes (profile_id, old_role, new_role) values (new.id, old.role, new.role);
  end if;
  return new;
end;
$$;
revoke all on function private.log_role_change() from public, anon, authenticated;

create trigger profiles_role_audit
  after insert or update of role on public.profiles
  for each row execute function private.log_role_change();

-- 6. Promotion (manual, project lead only, dashboard SQL editor). Nothing in the app can do this.
--   update public.profiles set role = 'super_admin' where id = '<user uuid>';
-- Demotion:
--   update public.profiles set role = 'user' where id = '<user uuid>';
