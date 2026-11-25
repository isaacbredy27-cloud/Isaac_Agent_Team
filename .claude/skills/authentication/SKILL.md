---
name: authentication
description: Authentication for Finance Match Orlando with Supabase Auth (ADR 0006) — per-request token checks in every Netlify Function (getClaims, ES256 JWKS, alg/iss/role/exp), publishable key only, TOTP MFA (aal2) for super_admin, step-up for Approve, session and CSRF rules. Use for login, tokens, sessions or admin access.
metadata:
  owner: security-expert
  backups: [supabase-auth-engineer, agent-console-engineer]
  version: 2.0.0
---

# Authentication

## Purpose
Know who is calling, and require strong proof for anyone who can change code.

## Use when
- Adding a protected route
- Changing login, sessions or MFA
- Building the approval step-up

## Inputs → Outputs
- Inputs: `Authorization: Bearer <Supabase access token>`.
- Outputs: Verified claims (`sub`, `aal`, `amr`), or 401 / 503.

## Decisions
- Provider: Supabase Auth (ADR 0006, proposed). Email and password, plus Continue with Google (PKCE). Client set-up: skill `supabase-auth`.
- Browser and Functions use only `SUPABASE_URL` and the publishable key. Secret (`sb_secret_…`) and `service_role` keys are banned. They bypass RLS.
- `super_admin` must use TOTP MFA (`aal2`). Approve also needs step-up.
- Asymmetric ES256 signing keys only. The Free plan has no basic-auth headers (ADR 0003); protection is in code.
- Design: docs/security/supabase-auth.md.

## Verify on every request
- Take the token only from `Authorization: Bearer`. Missing, malformed or > 8 KB → 401.
- Create a new supabase-js client per request (publishable key + caller's Authorization header).
- `getClaims(token)` verifies locally against the JWKS. Never use `getSession()` on the server.
- Require `header.alg === "ES256"`, `iss === SUPABASE_URL + "/auth/v1"`, `role === "authenticated"`, a UUID `sub` and `exp > now`.
- Reject `is_anonymous === true` (claim name to verify). Check `aud` once confirmed.
- Then read the role from `profiles` (skill `authorization`).
- Step-up for Approve: `amr[0].method === "totp"` and `now − amr[0].timestamp ≤ 600` s.
- Sessions: supabase-js browser storage is an accepted exception under strict CSP (design §4.4).
- CSRF: Bearer tokens, plus an `Origin` check on state-changing routes.

## Checklist
- [ ] Every non-public Function calls `requireUser`
- [ ] No `getSession`, `user_metadata` or `app_metadata` in netlify/functions
- [ ] Tests: 401 for no token, wrong alg, wrong iss, expired
- [ ] Redirect allow-list is exact; no Deploy Preview login

## Best practices
- Verify locally with `getClaims`; use `getUser` only where revocation must be instant (Approve)
- Fail closed: a database or JWKS error returns 503, never anonymous access
- Never log tokens, headers or emails

## Common mistakes
- Using `getSession()` to authorize a server call
- Trusting decoded claims without `getClaims`
- Reusing one supabase client across requests
- Treating `aal2` as proof of a recent MFA
- Adding Netlify preview wildcards to Redirect URLs

## References
- https://supabase.com/docs/reference/javascript/auth-getclaims (read 2026-11-25)
- https://supabase.com/docs/guides/auth/jwts (read 2026-11-25)
- https://supabase.com/docs/guides/auth/signing-keys (read 2026-11-25)
- https://supabase.com/docs/guides/auth/auth-mfa (read 2026-11-25)
- https://cheatsheetseries.owasp.org/cheatsheets/Authentication_Cheat_Sheet.html
- docs/security.md §2 · docs/security/supabase-auth.md
