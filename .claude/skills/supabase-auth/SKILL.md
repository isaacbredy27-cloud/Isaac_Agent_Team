---
name: supabase-auth
description: Supabase Auth for Finance Match Orlando — browser client with URL + publishable key only, email/password sign up, log in, reset, Continue with Google (PKCE), TOTP MFA for super_admin, and per-request token checks in Netlify Functions (getClaims, ES256 JWKS, iss/exp/role, profile role under RLS, aal2, step-up). Use for any login, token, session, MFA or Supabase client code.
metadata:
  owner: supabase-auth-engineer
  backups: [security-expert]
  version: 1.0.0
---

# Supabase Auth

## Purpose
Know who is calling and what role they hold, with no secret key anywhere.

## Use when
- Writing or reviewing sign up, log in, log out, forgot or update password
- Adding Continue with Google, MFA enrol or challenge, or step-up
- Writing the token check at the top of a Netlify Function
- Configuring redirect URLs, signing keys or auth rate limits

## Inputs → Outputs
- Inputs: `Authorization: Bearer <access token>`, the `profiles` row, current time.
- Outputs: verified user ID and role, or 401 (bad token) or 403 (role, aal2 or step-up missing).

## Rules (project decisions)
- Roles: `user` (default) and `super_admin`. Nothing else.
- Browser env: `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` only. Both are public.
- Never use a secret key (`sb_secret_...`) or the legacy `service_role` key in code, docs, env vars or CI.
- Role comes from `public.profiles`. Never from `user_metadata` (users can edit it).
- Deploy Previews get no login. The redirect allow-list holds the production URL and localhost only.
- No resume data in Supabase (ADR 0004).

## Per-request check in every Function
1. Read the Bearer token. Missing → 401.
2. `supabase.auth.getClaims(token)` with asymmetric ES256 signing keys. It verifies locally against the JWKS.
3. Check `iss` equals our project issuer, `exp` is in the future, `role` is `authenticated`. Else 401.
4. Build a per-request client with the publishable key and the user's `Authorization` header. RLS applies.
5. Read the role: `select role from profiles where id = <sub>`. No row → 403.
6. `requireRole(allowed)`. `super_admin` routes also need `aal` = `aal2`.
7. Approve also needs step-up: `amr[0].method === 'totp'` and `now - amr[0].timestamp <= 600` seconds.
Reference code: `knowledge/supabase-auth-engineer/examples/require-role.mjs`. The Function helper lives in `netlify/functions/_lib/auth/` (security-expert).

## Client flows (supabase-js)
- Sign up: `signUp({ email, password, options: { emailRedirectTo } })`. Confirmation email is on by default.
- Log in: `signInWithPassword({ email, password })`.
- Forgot password: `resetPasswordForEmail(email, { redirectTo })` → update-password page → `updateUser({ password })`.
- Google: `signInWithOAuth({ provider: 'google', options: { redirectTo } })`, then `exchangeCodeForSession(code)` (PKCE).
- MFA: `mfa.enroll({ factorType: 'totp' })`, `mfa.challenge`, `mfa.verify`, `mfa.getAuthenticatorAssuranceLevel()`.
- Show the MFA challenge when `nextLevel` is `aal2` and differs from `currentLevel`. Do not log the user out.
- Server client options (`global.headers.Authorization`, `persistSession: false`): confirm at the initializing reference before coding. See `knowledge/supabase-auth-engineer/docs/jwt-and-getclaims.md`.

## Checklist
- [ ] Only URL + publishable key reach the browser build
- [ ] Every non-public Function checks token, then role, per request
- [ ] `super_admin` routes check `aal2`; Approve checks step-up recency
- [ ] Error copy never says whether an email exists
- [ ] Redirect allow-list: production URL + localhost only
- [ ] Tests: 401 no token, 403 `user`, 403 no aal2, 403 stale step-up, 403 metadata role

## Best practices
- Verify locally with `getClaims`; use `getUser` only when instant revocation matters
- Treat `getSession` output on a server as untrusted
- Keep auth screens accessible (accessibility-specialist reviews)
- Keep the Google client secret in the Supabase dashboard only
- Follow Google branding for the button label and logo

## Common mistakes
- Trusting a decoded JWT without verifying it
- Reading a role from `user_metadata`
- Using the legacy HS256 shared secret; `getClaims` then calls the Auth server on each request
- Putting a secret key in a browser bundle or Netlify env
- Adding Deploy Preview URLs to the redirect allow-list
- Assuming aal2 means a recent MFA check (it does not)

## References
- https://supabase.com/docs/guides/getting-started/api-keys (read 2026-11-25)
- https://supabase.com/docs/guides/auth/jwts (read 2026-11-25)
- https://supabase.com/docs/guides/auth/signing-keys (read 2026-11-25)
- https://supabase.com/docs/reference/javascript/auth-getclaims (read 2026-11-25)
- https://supabase.com/docs/guides/auth/passwords (read 2026-11-25)
- https://supabase.com/docs/guides/auth/social-sign-in/auth-google (read 2026-11-25)
- https://supabase.com/docs/guides/auth/auth-mfa (read 2026-11-25)
- https://supabase.com/docs/guides/auth/redirect-urls (read 2026-11-25)
- `knowledge/supabase-auth-engineer/docs/`
