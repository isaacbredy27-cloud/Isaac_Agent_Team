# Row Level Security and the profiles table — notes

Sources (read 2026-11-25):
- https://supabase.com/docs/guides/database/postgres/row-level-security (page updated 2026-11-19)
- https://supabase.com/docs/guides/auth/managing-user-data (page updated 2026-11-20)

## RLS
- `alter table ... enable row level security;`
- Select own row: `create policy "..." on profiles for select to authenticated using ( (select auth.uid()) = id );` Wrap `auth.uid()` in `select` for performance.
- Update policies need `using` and `with check`. We create none.
- "creating an RLS policy that relies on the `user_metadata` claim can create security issues ... this information can be modified by authenticated end users." `raw_user_meta_data` "is not a good place to store authorization data"; `raw_app_meta_data` "cannot be updated by the user".
- "A `security definer` function in an exposed schema is callable over the Data API with the creator's privileges. Never create one in a schema listed under 'Exposed schemas'".

## Managing user data
- `create table public.profiles ( id uuid not null references auth.users on delete cascade, ..., primary key (id) );`
- The docs example enables RLS and says: "Make sure to protect the table by enabling Row Level Security and only granting the necessary privileges for each role." We grant only SELECT to `authenticated` and nothing to `anon`.
- Docs trigger: `create function public.handle_new_user() returns trigger language plpgsql security definer set search_path = '' as $$ begin insert into public.profiles (id, ...) values (new.id, ...); return new; end; $$;` then `create trigger on_auth_user_created after insert on auth.users for each row execute procedure public.handle_new_user();`
- "If the trigger fails, it could block signups". With `search_path = ''` use schema-qualified names, or every sign up fails with `Database error saving new user`.
- Deleting: "You may delete users directly or via the management console at Authentication > Users." `auth.admin.deleteUser()` needs a secret key, so it is not allowed here.

## Project design (differs from the docs example on purpose)
- The docs put `handle_new_user` in `public`, an exposed schema. That conflicts with the RLS page warning. We put it in schema `private`. Security-expert confirms.
- Trigger inserts only `id`. Role takes the default `user`.
- Promotion to `super_admin`: manual SQL by the project lead in the dashboard. A trigger writes each role change to `private.role_changes`.
- Reference SQL: `examples/profiles-rls.sql`. Static check: `examples/profiles-rls-check.mjs`.

## Open
- Can a user delete their own account without a secret key (for example a security definer function in `private`)? Unverified. Privacy and security decide.
- Confirm on a dev project that revoking EXECUTE on the trigger function does not break sign up.
