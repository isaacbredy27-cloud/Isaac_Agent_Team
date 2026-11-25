---
name: supabase-row-level-security
description: Supabase Postgres Row Level Security for the profiles table — id, role (user or super_admin), select-own-row policy, no write policies, privilege revokes, a private-schema security definer trigger that inserts only the id, a role-change audit trigger, and manual SQL promotion by the project lead. Use for any table, policy, trigger or grant in supabase/.
metadata:
  owner: supabase-auth-engineer
  backups: [security-expert]
  version: 1.0.0
---

# Supabase Row Level Security

## Purpose
Lock the role column so no user path can read another row or change a role.

## Use when
- Writing or reviewing SQL under `supabase/`
- Adding a table, policy, grant, trigger or function
- Promoting or demoting a `super_admin`

## Inputs → Outputs
- Inputs: table design, who may read or write, the auth model in skill `supabase-auth`.
- Outputs: reviewed SQL with RLS on, minimal grants and an audit trail.

## The profiles design
- `public.profiles`: `id uuid primary key references auth.users on delete cascade`, `role text not null default 'user'` with `check (role in ('user','super_admin'))`, `created_at`.
- `enable row level security`. One policy: `select` to `authenticated` using `((select auth.uid()) = id)`.
- No INSERT, UPDATE or DELETE policy. `revoke all` from `anon` and `authenticated`, then `grant select` to `authenticated` only.
- Trigger function in schema `private` (not exposed to the Data API): `security definer`, `set search_path = ''`, schema-qualified names, inserts only `id`. The role takes its default.
- Audit: a trigger on `profiles` writes role changes to `private.role_changes`. That table has RLS on and no policies.
- Promotion: the project lead runs one `update` in the Supabase dashboard SQL editor. Nothing in the app can do it.
- Reference SQL: `knowledge/supabase-auth-engineer/examples/profiles-rls.sql`. Self-check: `profiles-rls-check.mjs`.

## Checklist
- [ ] RLS enabled on every table in an exposed schema
- [ ] Each policy names a role (`to authenticated`) and wraps `auth.uid()` in `select`
- [ ] No policy or function reads `user_metadata` or `raw_user_meta_data`
- [ ] Every `security definer` function: private schema, `set search_path = ''`, EXECUTE revoked from public roles
- [ ] A failing trigger blocks sign ups: test sign up on a dev project first
- [ ] Tests: another user's row is invisible; role update is denied; anon reads nothing

## Best practices
- Deny by default; grant the least privilege per role
- Prefer a missing policy over a clever one
- Add a restrictive `aal2` policy on any future table only `super_admin` should touch
- Keep the SQL as reviewed migrations under `supabase/`, run by the project lead

## Common mistakes
- A `security definer` function in an exposed schema (callable over the Data API)
- Missing `set search_path = ''`, or unqualified names inside the trigger (every sign up then fails)
- Granting UPDATE on `profiles` "for convenience"
- Storing authorization data in `user_metadata` (user-editable)
- Using a secret key to bypass RLS in a Function
- Putting resume-derived data in any Supabase table (ADR 0004)

## References
- https://supabase.com/docs/guides/database/postgres/row-level-security (read 2026-11-25)
- https://supabase.com/docs/guides/auth/managing-user-data (read 2026-11-25)
- https://supabase.com/docs/guides/auth/auth-mfa (read 2026-11-25)
- `knowledge/supabase-auth-engineer/docs/rls-and-profiles.md`
