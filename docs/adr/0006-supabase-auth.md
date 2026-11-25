# ADR 0006 — Use Supabase Auth with profiles-based roles

Status: Proposed (awaiting project lead) · Date: 2026-11-25 · Decider: project lead · Plan: [docs/plans/supabase-auth.md](../plans/supabase-auth.md)

## Context

The app needs sign-in for job seekers and a locked-down admin path for the Agent Console.
ADR 0002 requires step-up re-authentication before any approved commit.

The research docs compared two providers (`docs/security.md`, 2026-11-24):

| Option | Why it was not chosen |
|---|---|
| Netlify Identity | No MFA. Netlify announced its deprecation in 2025, then reversed it (community summary, 2026-02-19). Admins must have MFA, so it cannot protect the console. |
| Auth0 (Netlify extension) | Has MFA, but adds a vendor with its own roles model. The research left "admins only or all users" open. |

The project lead chose Supabase Auth on 2026-11-25. Facts below were read on 2026-11-25 from official Supabase pages.

- **Keys.** The publishable key (`sb_publishable_...`) is "Safe to expose online". Secret keys (`sb_secret_...`) "provide full access to your project's data, bypassing Row Level Security". The legacy `service_role` key is a legacy secret key. Source: https://supabase.com/docs/guides/getting-started/api-keys (page updated 2026-11-18).
- **Local verification.** `getClaims()` verifies the JWT against the project's JWKS. "If your project is using asymmetric JWT signing keys, then the verification is done locally usually without a network request." With a symmetric secret it "always sends a request similar to `getUser()`". Source: https://supabase.com/docs/reference/javascript/auth-getclaims (updated 2026-11-23).
- **Signing keys.** ES256 is recommended; HS256 is "Not recommended for production applications". The JWKS endpoint is cached up to 20 minutes across Supabase edge and client. Source: https://supabase.com/docs/guides/auth/signing-keys (updated 2026-11-20).
- **MFA.** The `aal` claim shows `aal1` or `aal2`. The `amr` claim lists methods with timestamps, most recent first. "TOTP MFA API is free to use and is enabled on all Supabase projects by default." Source: https://supabase.com/docs/guides/auth/auth-mfa (updated 2026-11-18).
- **Roles.** `user_metadata` "can be modified by authenticated end users". It must not hold authorization data. A `security definer` function must never sit in an exposed schema. Source: https://supabase.com/docs/guides/database/postgres/row-level-security (updated 2026-11-19).
- **Free plan.** "50,000 monthly active users"; "Limit of 2 active projects"; "Free projects are paused after 1 week of inactivity"; basic MFA included; leaked-password protection not included; auth audit log kept 24 hours. Source: https://supabase.com/pricing (read 2026-11-25).
- **Email.** Built-in email has a "rate limit of 2 emails per hour" and is best-effort. Supabase advises custom SMTP for production. Source: https://supabase.com/docs/guides/auth/passwords (updated 2026-11-17).
- **Redirects.** `redirectTo` must match the Redirect URLs list. Supabase recommends an exact production path. Source: https://supabase.com/docs/guides/auth/redirect-urls (updated 2026-10-30).

## Decision

1. **Provider.** Use Supabase Auth for all users. Netlify Identity and Auth0 are not used.
2. **Sign-in methods.** Email and password (sign up, log in, log out, forgot password, update password). "Continue with Google" through `signInWithOAuth({ provider: 'google' })`. Browser clients use the PKCE flow.
3. **Keys.** The app uses only `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY`. Both are public. No code, doc, env var or CI secret holds a `sb_secret_` key or the legacy `service_role` key.
4. **Signing.** The Supabase project uses asymmetric signing keys (ES256). HS256 is not used.
5. **Roles table.** `public.profiles` has `id` (references `auth.users`, `on delete cascade`), `role` and `created_at`. `role` is `'user'` (default) or `'super_admin'`. The old `viewer`, `admin` and `owner` roles are retired.
6. **Profile creation.** A `security definer` trigger function with `set search_path = ''` creates the profile row on sign-up. It lives in a non-exposed `private` schema.
7. **Row Level Security.** RLS is on. One policy lets an authenticated user select only their own row. No policy or grant lets any user insert, update or delete a row. No user can change a role.
8. **Role source.** The role is read only from `public.profiles`. Never from `user_metadata`, `app_metadata` or client state.
9. **Per-request checks.** Every Netlify Function that needs a user does this on every request:
   - verify the access token with `getClaims()` (local ES256 check; reject on any error);
   - read the role from `profiles` with a Supabase client built on the caller's own token, so RLS applies.
   Helpers `requireUser`, `requireRole` and `requireAal2` live in `netlify/functions/_lib/auth/` (owner: `security-expert`).
10. **super_admin gate.** Only `super_admin` with `aal: "aal2"` (TOTP MFA) may open the Agents page, list agents or chat. Others get 403.
11. **Step-up for Approve.** Approve also needs a recent TOTP check: the newest `amr` entry is `totp` and is at most 10 minutes old. This implements ADR 0002 safeguard 1. Exact check: `docs/security/supabase-auth.md` (owner: `security-expert`).
12. **Promotion.** Only the project lead promotes a user, by manual SQL in the Supabase dashboard. Every role change is audited. The audit mechanism is defined by `security-expert`.
13. **Deploy Previews.** No login on Deploy Previews. `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` get values for the Production context only. Preview builds hide auth screens; protected Functions return 401. The Supabase redirect allow-list holds only exact production URLs.
14. **Resumes stay out.** No resume data goes to Supabase (ADR 0004). That covers files, text, profiles, matches, saved jobs and outcome labels. Blobs keys use a salted hash of the Supabase user ID.
15. **Plan.** Supabase Free plan. Any paid plan or add-on needs the project lead.

## Consequences

**New vendor.**
- Supabase becomes a subprocessor for email, password hash, Google identity ID and MFA factors. Counsel reviews its terms before launch (`docs/privacy/supabase-auth.md`).
- The Google OAuth client secret lives in the Supabase dashboard only. It never enters this repo or Netlify.
- New agent `supabase-auth-engineer` owns `supabase/**`, `apps/web/src/auth/**`, `tests/auth/**` and `docs/auth/**`. The team grows to 18 agents and 56 skills (ADR 0005 process).

**Supabase Free-plan limits.**

| Limit | Effect | Mitigation |
|---|---|---|
| 50,000 MAU | Far above expected use | Track MAU in the weekly usage check |
| Pauses after 1 week of inactivity | Nobody can sign in, and "Delete my data" fails | `netlify-engineer` adds a weekly activity check and alert; restore is a runbook step |
| Built-in email: 2/hour, best-effort | Sign-up and reset mail fails under load | Custom SMTP before launch (lead approves any cost) |
| Auth audit log kept 24 hours | Supabase logs are too short for us | Our audit log in Blobs keeps 1 year (skill `audit-logging`) |
| No leaked-password protection | Weak or breached passwords allowed | Password length rules in the UI; MFA mandatory for `super_admin` |
| MFA challenge/verify: 15/min, not configurable | Limits brute force on codes | None needed |

**ADR 0003 credit impact.**
- Token checks run locally with ES256, so they add no network call. JWKS fetches are cached.
- The role lookup adds one HTTPS call to Supabase per protected request. That adds Function run time and so Netlify compute credits.
- Public routes (`/api/jobs`) need no token and stay CDN-cached. Most traffic stays free of auth cost.
- `netlify-engineer` measures the added time in the Phase 0 spike. If it is material, we revisit a short role cache in a new ADR.
- HS256 is ruled out partly for cost: it would turn every check into a network call.

**Deploy Previews.**
- Free plan has no env-var scopes (ADR 0003). Previews would otherwise share the production Supabase project.
- With no login on previews, no real account is created from a preview. Auth flows are tested locally and in CI with mocks or a separate test project.

**Deleting accounts without a secret key.**
- `auth.admin.deleteUser()` needs a secret key, which this ADR forbids.
- Until a safer path is verified, "Delete my data" deletes Blobs data at once. The lead then deletes the `auth.users` row in the dashboard, under a runbook with a deadline. The `profiles` row goes by cascade.
- A user-callable `security definer` function in the `private` schema may replace the manual step. It needs research and `security-expert` review first.
- Allowing any secret key needs a new ADR.

**ADR 0004.**
- Unchanged. Supabase holds identity only. Resume data never touches it.
- `profiles` holds only `id`, `role` and `created_at`. No name, avatar or resume field.

**Other.**
- Roles shrink to two. Employer-registry management moves to `super_admin` (lead to confirm; plan open question 7).
- The `architecture-decisions` skill needs a row for this ADR once accepted (owner: `meta-agent`).
- Open items: step-up recency check and promotion audit (`security-expert`); account deletion path (lead, `security-expert`, `privacy-compliance-specialist`); `aud` claim value and identity-linking rules to verify during the build.

Referenced by: `docs/plans/supabase-auth.md`, `docs/README.md`, `docs/netlify-architecture.md`, `docs/expert-roster.md`, `docs/security/supabase-auth.md`, `docs/privacy/supabase-auth.md`.
