# supabase/

Owner: `supabase-auth-engineer` (Vera). Reviewers: `security-expert`, `privacy-compliance-specialist`.
Decision: ADR 0006 (proposed). Design: `docs/security/supabase-auth.md`.

The project lead does every step here. No agent changes the live project or promotes a user.
We use only the project URL and the publishable key. Never create, copy or store a secret key (`sb_secret_...`) or the legacy `service_role` key.

## Files

| File | What it does |
|---|---|
| `migrations/20261125000000_profiles.sql` | `public.profiles` with RLS, the sign-up trigger, and the role-change audit table |

## 1. Apply the migration (SQL editor)

1. Try it on a dev project first. A broken trigger blocks every sign up.
2. Open the Supabase dashboard, then **SQL Editor**, then **New query**.
3. Paste all of `migrations/20261125000000_profiles.sql`. Click **Run**.
4. Check **Settings → API → Exposed schemas**. It must not list `private`.
5. Sign up a test user in the app. Then run:
   `select id, role from public.profiles order by created_at desc limit 1;`
   You should see one row with role `user`.

If sign up fails with "Database error saving new user", the trigger failed. Stop and tell `supabase-auth-engineer`.

## 2. Promote yourself to super_admin

1. Sign up in the app and confirm your email.
2. Find your user ID in **Authentication → Users**.
3. In the SQL editor, run:
   `update public.profiles set role = 'super_admin' where id = '<your user id>';`
4. Check the audit row:
   `select * from private.role_changes order by changed_at desc limit 1;`
5. Log out and log in again. The app then asks you to set up an authenticator app (MFA). The Agents page needs it.

Demote with the same `update`, using `role = 'user'`. Nothing in the app can change a role.

## 3. Signing keys

1. Open **Settings → JWT Keys** (signing keys).
2. Use an asymmetric ES256 key as the current key. Do not use the legacy HS256 shared secret.
3. When you rotate, publish the standby key, wait at least 20 minutes, then switch. JWKS caches last up to 20 minutes.

Source: https://supabase.com/docs/guides/auth/signing-keys (read 2026-11-25).

## 4. URL configuration (redirect allow-list)

Open **Authentication → URL Configuration**.

- **Site URL**: the production URL, for example `https://<your-site>.netlify.app`.
- **Redirect URLs**: exact paths only. Add these, for production and for localhost:
  - `https://<your-site>.netlify.app/auth/callback`
  - `https://<your-site>.netlify.app/update-password`
  - `http://localhost:8888/auth/callback` and `http://localhost:8888/update-password` (netlify dev)
  - `http://localhost:5173/auth/callback` and `http://localhost:5173/update-password` (vite dev)
- Do **not** add Deploy Preview URLs or wildcards like `https://**--...netlify.app/**`. Deploy Previews get no login.

Source: https://supabase.com/docs/guides/auth/redirect-urls (read 2026-11-25).

## 5. Enable Continue with Google

1. In Google Cloud, create an OAuth client ID of type **Web application**.
2. **Authorized JavaScript origins**: the production URL and `http://localhost:8888`.
3. **Authorized redirect URIs**: the callback URL shown on the Supabase Google provider page. It looks like `https://<project-ref>.supabase.co/auth/v1/callback`.
4. Scopes: `openid`, `.../auth/userinfo.email`, `.../auth/userinfo.profile`.
5. Fill in the consent screen branding so users see our name, not the project ID.
6. In Supabase, open **Authentication → Providers → Google**. Turn it on. Paste the client ID and client secret.

The Google client secret lives only in the Supabase dashboard. Never put it in git, Netlify or chat.

Source: https://supabase.com/docs/guides/auth/social-sign-in/auth-google (read 2026-11-25).

## 6. MFA

TOTP MFA is on by default and free. Nothing to switch on. Source: https://supabase.com/docs/guides/auth/auth-mfa (read 2026-11-25).

## 7. App environment variables (Netlify UI, Production only)

| Variable | Value | Secret? |
|---|---|---|
| `VITE_SUPABASE_URL` | `https://<project-ref>.supabase.co` | No, public |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | `sb_publishable_...` | No, public |

Without these the app still runs, with sign in turned off.
`VITE_E2E_AUTH_STUB` is for local end-to-end tests only. Never set it in Netlify. Production-mode builds ignore it.

## Open items

- Built-in email allows 2 emails per hour. Custom SMTP may cost money; the lead decides.
- Free projects pause after 1 week idle. A paused project blocks every login.
- Unverified: how Google links to an unverified email account. Read https://supabase.com/docs/guides/auth/identities before launch.
