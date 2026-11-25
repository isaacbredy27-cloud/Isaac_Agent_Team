# Security design: Supabase Auth, profiles and super_admin

Owner: `security-expert` (Rhea). Written 2026-11-25. Status: **Design. Not built.**
Plan: [`docs/plans/supabase-auth.md`](../plans/supabase-auth.md) task T4.
Privacy review: [`docs/privacy/supabase-auth.md`](../privacy/supabase-auth.md).
Decision record: ADR 0006 (Proposed, `software-architect`).

Vendor facts come from official Supabase pages read on 2026-11-25. Sources are at the end.
Items marked **TO VERIFY** must be tested on a test project before release.
Never test against the production project with real people's data.

## 1. Scope and trust boundaries

```
Browser (untrusted) ──password / Google / TOTP──▶ Supabase Auth (vendor)
   │  access token (JWT, ES256)                      │ JWKS (public keys)
   ▼                                                 ▼
Netlify Functions (trusted) ── verify locally ── role lookup under RLS ──▶ Supabase Postgres (public.profiles)
   │
   └──▶ Blobs, Claude API, GitHub (unchanged; ADR 0001–0004)
```

- The browser talks to Supabase Auth directly with the publishable key.
- Functions trust nothing from the browser except a signed access token.
- Functions hold no Supabase secret. They reach Postgres only as the signed-in user.
- Supabase is an identity vendor only. No resume data goes there (ADR 0004; privacy verdict "No").

## 2. Threat model

| # | Threat | OWASP 2025 | Control (section) |
|---|---|---|---|
| T1 | Secret or `service_role` key leaks and bypasses RLS | A02, A04 | No secret key anywhere; CI scan (§3) |
| T2 | Forged, expired or wrong-project token | A07 | `getClaims` on ES256, `alg`/`iss`/`role`/`exp` checks (§4) |
| T3 | User makes self `super_admin` via `user_metadata` | A01 | Role only from `profiles`; never metadata (§5) |
| T4 | User updates own `profiles.role` through the Data API | A01 | No write grants or policies; guard trigger (§6) |
| T5 | `SECURITY DEFINER` function callable over the API | A01, A05 | Functions live in non-exposed `private` schema (§6) |
| T6 | Stolen `super_admin` password | A07 | aal2 (TOTP) on all admin routes (§7) |
| T7 | Stolen admin session approves a commit to `main` | A07, A08 | Step-up: TOTP within 600 s on Approve (§7) |
| T8 | Silent or unrecorded promotion | A09 | DB trigger log + runbook + Blobs mirror (§8) |
| T9 | OAuth code theft or open redirect | A01, A07 | PKCE; exact redirect allow-list (§9) |
| T10 | Account takeover through automatic email linking | A07 | Confirmed emails; MFA on admins (§9) |
| T11 | Login on Deploy Previews against production users | A02 | No auth config on previews (§10) |
| T12 | Credential stuffing, email bombing, cost abuse | A06 | Supabase limits + Netlify `rateLimit` (§11) |
| T13 | Session token stolen by XSS | A05, A07 | Strict CSP; short tokens; step-up (§4.4) |
| T14 | Supabase Free project pauses; sign-in down | A10 | Fail closed; lead decision (§12) |
| T15 | Deleted account keeps access | A01 | Per-request profile lookup; `getUser` on Approve (§4, §13) |
| T16 | Resume data drifts into Supabase | ADR 0004 | `profiles` has 3 columns; review rule (§6) |

## 3. Keys

| Key | Where allowed | Rule |
|---|---|---|
| `SUPABASE_URL` | Browser, Functions | Public. Production context only (§10). |
| `SUPABASE_PUBLISHABLE_KEY` (`sb_publishable_...`) | Browser, Functions | Public. Production context only (§10). |
| Secret key (`sb_secret_...`) | **Nowhere** | Banned. Needs a new ADR to change. |
| Legacy `service_role` JWT | **Nowhere** | Banned. Same as a secret key. |
| Legacy `anon` JWT | Nowhere | Use the new publishable key instead. |
| Legacy JWT secret (HS256) | Nowhere | Asymmetric ES256 keys only. |
| Google OAuth client secret | Supabase dashboard only | Never in git, Netlify or our code. |

Why the ban: Supabase says secret keys "provide full access to your project's data, bypassing Row Level Security."
It adds: "Policies never apply to a secret key, because `service_role` has the `BYPASSRLS` attribute."
One leaked secret key would expose every account and let anyone set any role.

Publishable key: Supabase calls it "Safe to expose online". It is still not a credential.
Every protection comes from RLS and grants (§6), not from hiding this key.

CI secret scan adds two patterns:
- `sb_secret_` anywhere in the repo, `dist/` or a proposal.
- Any JWT-shaped string whose payload decodes to `"role":"service_role"`.

## 4. Per-request token verification (every Function)

### 4.1 Rules

1. Read the token only from `Authorization: Bearer <jwt>`. Never from a query string or body.
2. Reject a missing, malformed or oversize (> 8 KB) header with **401** and `WWW-Authenticate: Bearer`.
3. Verify with `supabase.auth.getClaims(token)` on a per-request client.
   With asymmetric keys, "the verification is done locally usually without a network request using the WebCrypto API."
4. Require `header.alg === "ES256"`. Anything else is **401**. This blocks a fallback to the shared secret.
5. Require `iss === SUPABASE_URL + "/auth/v1"`, `role === "authenticated"`, a UUID `sub`, and `exp > now`.
   Check `exp` in our code even if the library also checks it.
6. `aud`: check `aud === "authenticated"` once confirmed. **TO VERIFY.**
7. Reject anonymous users. Keep anonymous sign-ins off in the dashboard. Reject `is_anonymous === true`. **TO VERIFY** claim name.
8. **Never use `getSession()` on the server.** Supabase: "the user object returned by this function must not be trusted."
9. Never read `user_metadata` or `app_metadata` for any decision.
10. Never log the token, the `Authorization` header or the email.

Why `getClaims` and not `getUser`: `getUser` "always sends a request to the Auth server for each JWT."
That costs time and Netlify credits (ADR 0003). We use `getUser` only where instant revocation matters (§7.3, §13).

### 4.2 Signing keys and JWKS

- Enable asymmetric signing keys (ES256, P-256) before launch. Supabase marks HS256 "Not recommended for production applications."
- JWKS: `GET <SUPABASE_URL>/auth/v1/.well-known/jwks.json`. Edge cache 10 min, client cache up to 10 more min.
- Decision: use the live JWKS through `getClaims`. Do not pin keys in the repo. Pinned keys break on rotation.
- Rotation runbook: publish the standby key, wait **at least 20 minutes**, then switch signing. Revoke the old key only after access tokens it signed have expired.

### 4.3 Role lookup under RLS

- Build a **new client per request**: `SUPABASE_URL`, publishable key, and the caller's `Authorization` header.
- Never put a user's token on a module-level client. Warm Functions reuse module scope across users.
- Query `profiles` for `role` where `id = claims.sub`. RLS returns at most the caller's own row.
- Zero rows → **401** (account deleted). DB error → **503**. Unknown role value → **403**. Fail closed every time.
- Validate the role with Zod: `z.enum(["user", "super_admin"])`.
- The lookup runs on every request. A demotion or deletion takes effect on the next call.

### 4.4 Browser session storage (changed rule)

supabase-js keeps the session in browser storage by default (**TO VERIFY**: `localStorage`).
Our old rule said "never `localStorage`". A pure SPA cannot hold an `HttpOnly` cookie without a server session layer.
Decision: accept supabase-js storage, with compensating controls:
- Strict CSP: no inline script, no third-party script. Add `SUPABASE_URL` to `connect-src` only.
- Render model and user text as text or DOMPurify output. No raw `innerHTML`.
- Admin power needs aal2 plus a fresh TOTP (§7). A stolen session cannot approve after 600 s.
- Incident: sign out all sessions for the user, then rotate signing keys if a key is suspect.
Revisit if we add a server session layer.

### 4.5 Helper contract (`netlify/functions/_lib/auth/`)

Reference sketch. Not built. supabase-js option names are **TO VERIFY** against the initializing reference.

```ts
import { createClient } from "@supabase/supabase-js";
import { z } from "zod";

const SUPABASE_URL = process.env.SUPABASE_URL ?? "";
const SUPABASE_PUBLISHABLE_KEY = process.env.SUPABASE_PUBLISHABLE_KEY ?? "";
const ISSUER = `${SUPABASE_URL}/auth/v1`;
export const STEP_UP_MAX_AGE_S = 600;
const Role = z.enum(["user", "super_admin"]);
const JWT = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;

export class AuthError extends Error {
  constructor(public status: 401 | 403 | 503, public code: string) { super(code); }
}

export async function requireUser(req: Request) {
  if (!SUPABASE_URL || !SUPABASE_PUBLISHABLE_KEY) throw new AuthError(503, "auth_unavailable");
  const m = JWT.exec(req.headers.get("authorization") ?? "");
  if (!m || m[1].length > 8192) throw new AuthError(401, "invalid_token");
  const token = m[1];
  const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });
  const { data, error } = await supabase.auth.getClaims(token);
  if (error || !data) throw new AuthError(401, "invalid_token");
  const { claims, header } = data;
  const now = Math.floor(Date.now() / 1000);
  if (header.alg !== "ES256" || claims.iss !== ISSUER || claims.role !== "authenticated"
      || typeof claims.sub !== "string" || typeof claims.exp !== "number" || claims.exp <= now
      || claims.is_anonymous === true) throw new AuthError(401, "invalid_token");
  const { data: row, error: dbError } = await supabase
    .from("profiles").select("role").eq("id", claims.sub).maybeSingle();
  if (dbError) throw new AuthError(503, "auth_unavailable");
  if (!row) throw new AuthError(401, "invalid_token");
  const role = Role.safeParse(row.role);
  if (!role.success) throw new AuthError(403, "forbidden");
  return { userId: claims.sub, role: role.data, aal: claims.aal ?? "aal1",
           amr: Array.isArray(claims.amr) ? claims.amr : [], token, supabase };
}
export type AuthContext = Awaited<ReturnType<typeof requireUser>>;

export function requireRole(ctx: AuthContext, role: "super_admin") {
  if (ctx.role !== role) throw new AuthError(403, "forbidden");
}
export function requireAal2(ctx: AuthContext) {
  if (ctx.aal !== "aal2") throw new AuthError(403, "mfa_required");
}
export function requireStepUp(ctx: AuthContext, now = Math.floor(Date.now() / 1000)) {
  const last = ctx.amr[0];
  if (!last || last.method !== "totp" || typeof last.timestamp !== "number"
      || now - last.timestamp > STEP_UP_MAX_AGE_S || last.timestamp > now + 60)
    throw new AuthError(403, "step_up_required");
}
```

Error body: `{ "error": "<code>" }` only. No stack, no claim values. Response header `Cache-Control: private, no-store`.

## 5. Role source

- The only role source is `public.profiles.role`, read per request under RLS (§4.3).
- **Never** `user_metadata`. Supabase: it "can be modified by authenticated end users."
- Not `app_metadata` either. It is user-safe, but a second source invites drift.
- Never accept a role from the request body, a header, a cookie or the UI.
- A code check in CI fails if `netlify/functions/**` contains `user_metadata` or `app_metadata`.

## 6. `profiles` schema, grants, RLS and trigger (reference SQL)

Reviewed reference SQL. **Not a migration.** `supabase-auth-engineer` writes the migration under `supabase/`. security-expert reviews it.
Before applying: confirm `private` is **not** in Dashboard → API → Exposed schemas.

```sql
-- 0. Private schema: never exposed through the Data API.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

-- 1. Table. Three columns only (ADR 0004: no resume, name or avatar fields).
create table public.profiles (
  id         uuid        primary key references auth.users (id) on delete cascade,
  role       text        not null default 'user' check (role in ('user', 'super_admin')),
  created_at timestamptz not null default now()
);

-- 2. Grants. Revoke first in case default privileges granted anything (TO VERIFY defaults).
revoke all on table public.profiles from public, anon, authenticated;
grant select on table public.profiles to authenticated;

-- 3. RLS: read own row only. No insert, update or delete policies exist.
alter table public.profiles enable row level security;
create policy "profiles_select_own" on public.profiles
  for select to authenticated
  using ((select auth.uid()) = id);

-- 4. Create the profile on sign-up. Role is always the default; never from metadata.
create or replace function private.handle_new_user()
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

-- 5. Belt and braces: block role changes from API roles even if a grant slips in later.
--    SECURITY INVOKER on purpose, so current_user is the caller's role.
create or replace function private.block_api_role_change()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.role is distinct from old.role
     and current_user in ('anon', 'authenticated') then
    raise exception 'role change not allowed';
  end if;
  return new;
end;
$$;
revoke all on function private.block_api_role_change() from public, anon, authenticated;
create trigger profiles_block_api_role_change
  before update of role on public.profiles
  for each row execute function private.block_api_role_change();

-- 6. Promotion record (section 8). No FK, so history survives account deletion.
create table private.role_changes (
  id          bigint      generated always as identity primary key,
  profile_id  uuid        not null,
  old_role    text,
  new_role    text        not null,
  changed_by  text        not null,
  changed_at  timestamptz not null default now()
);
revoke all on table private.role_changes from public, anon, authenticated;

create or replace function private.log_role_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' and new.role <> 'user' then
    insert into private.role_changes (profile_id, old_role, new_role, changed_by)
    values (new.id, null, new.role, session_user);
  elsif tg_op = 'UPDATE' and new.role is distinct from old.role then
    insert into private.role_changes (profile_id, old_role, new_role, changed_by)
    values (new.id, old.role, new.role, session_user);
  end if;
  return new;
end;
$$;
revoke all on function private.log_role_change() from public, anon, authenticated;
create trigger profiles_log_role_change
  after insert or update of role on public.profiles
  for each row execute function private.log_role_change();
```

Review notes:
- `search_path = ''` means every name is schema-qualified. Supabase warns that a failing trigger blocks all sign-ups.
- Required tests on a test project: sign-up creates a `user` row; user A cannot read user B's row; `update profiles set role` as `authenticated` fails; `insert` and `delete` as `authenticated` fail; `anon` reads nothing; promotion writes one `role_changes` row.
- **TO VERIFY**: sign-up still works with the trigger function in `private` (the auth role fires it).
- No other table goes in `public` without RLS on, explicit grants and security-expert review.
- ADR 0004: no column holding resume text, skills, matches, name or avatar may be added. Any change needs a new ADR.

## 7. `super_admin`: MFA and step-up

### 7.1 Route matrix

| Route or action | Checks, in order |
|---|---|
| Personal routes (`/api/resume`, `/api/match/*`, saved jobs, delete my data) | `requireUser` |
| Agents page data, `/api/agents/*` incl. chat | `requireUser` → `requireRole("super_admin")` → `requireAal2` |
| Proposal list, create, reject, employer registry | same as above |
| **Approve** (`/api/proposals/:id/approve`) | above → `requireStepUp` → `getUser(token)` → `Origin` check → typed proposal number → base-SHA check (ADR 0002) |

A `user` gets **403** `forbidden`. A `super_admin` at aal1 gets **403** `mfa_required`.
The UI then runs the TOTP challenge. Supabase: ask the user to "continue the sign-in process instead of logging them out."
The MFA UI alone adds nothing. Supabase: "You also need to enforce the MFA rules in your application's database, APIs".

### 7.2 Step-up rule (open question 1: decided)

- Supabase `amr` is "an array of objects ... ordered most recent method first", each with `method` and `timestamp`.
- Approve passes only if `amr[0].method === "totp"` and `now - amr[0].timestamp <= 600`.
- Otherwise **403** `{ "error": "step_up_required" }`. The UI runs `mfa.challenge` + `mfa.verify`, then retries with the new token.
- Allow 60 s of future clock skew. Reject larger future timestamps.
- **TO VERIFY (blocking for release):**
  - A refreshed token keeps the original TOTP timestamp in `amr[0]`. If refresh resets it, step-up is broken.
  - `mfa.verify` on an aal2 session adds a fresh `totp` entry at `amr[0]`.
- Record `amr[0].timestamp` in the `proposal.approve` audit event. Weekly review flags two approvals on one step-up.

### 7.3 Revocation on Approve

`getClaims` cannot see a revoked session until the token expires.
Approve also calls `supabase.auth.getUser(token)`. Any error → **401**.
One network call per approval is cheap. Approvals are rare.

### 7.4 Enrolment before promotion

An attacker who takes over a promoted account before MFA exists could enrol their own factor.
Rule: the person enrols TOTP first, as a `user`. The lead promotes only after a verified factor exists (§8).

## 8. Promotion and demotion (open question 2: decided)

Promotion is **manual SQL by the project lead** in the Supabase SQL editor. No API, Function or UI can change a role.

Runbook (`docs/security/runbooks/role-change.md`, to write in Phase 3):
1. Confirm the request in writing. Record who asked and why.
2. Confirm the target has a verified TOTP factor (`auth.mfa_factors`, **TO VERIFY** column names).
3. Run: `update public.profiles set role = 'super_admin' where id = '<uuid>';`
4. Confirm one new row in `private.role_changes`.
5. Mirror into the Blobs audit log: event `auth.role_change` with hashed target ID, old and new role, and the `role_changes.id`.
   The lead files it through a `super_admin` console action (aal2 + step-up). Until that exists, the orchestrator logs it from the runbook entry.
6. Demotion: same steps with `role = 'user'`. It takes effect on the next request (§4.3).

Why both records: dashboard SQL never reaches our Functions, so Blobs cannot see it.
The trigger catches every change, including one nobody reported.
The weekly audit review compares `private.role_changes` with `auth.role_change` events. Any gap is an incident.

## 9. Sign-in methods

### 9.1 Email and password

- Keep email confirmation on (hosted default).
- Set the strongest password rules the Free plan offers. Leaked-password protection is Pro-only, so we lack it.
- Reset: `resetPasswordForEmail(email, { redirectTo: <prod>/account/update-password })` → `updateUser({ password })`.
- UI copy never reveals whether an email exists (T2 brief). **TO VERIFY** what Supabase responses reveal.

### 9.2 Google OAuth with PKCE

- Browser client uses the PKCE flow. The callback page calls `exchangeCodeForSession(code)`.
- After the exchange, remove `code` from the URL with `history.replaceState`.
- Send `Referrer-Policy: no-referrer` on the callback page.
- Request only `openid`, `userinfo.email`, `userinfo.profile`. Do not copy name or avatar into our tables.
- Google Cloud client: Authorized JavaScript origins = production + localhost. Redirect URI = the Supabase callback only.
- The Google client secret lives only in the Supabase dashboard.

### 9.3 Redirect allow-list

- Site URL: the production origin.
- Redirect URLs, exact paths, no wildcards:
  - `https://<production-domain>/auth/callback`
  - `https://<production-domain>/account/update-password`
  - `http://localhost:<dev-port>/auth/callback`
  - `http://localhost:<dev-port>/account/update-password`
- No `**--*.netlify.app` pattern. No Deploy Preview login (§10).
- Every call passes an explicit `redirectTo`. Supabase: it "should match the Redirect URLs list configuration."
- Hardening option (lead decision): move localhost to a second Free project (2 allowed). Then production lists production only.

### 9.4 Automatic identity linking

Supabase "automatically links identities with the same email address to a single user."

Risk: whoever controls a Google account with a user's email can sign in as that user.
Example: a lapsed company domain re-registered by someone else.
Controls:
- Keep email confirmation on, so unconfirmed password sign-ups do not claim an address.
- **TO VERIFY** Supabase's rules for linking unverified emails.
- `super_admin` still needs TOTP. A linked Google login only reaches aal1, which gets 403 on admin routes.
- Keep manual linking (`linkIdentity`) disabled. We do not need it.
- Super admins use an email on a domain the lead controls, or a consumer Google address with MFA.

## 10. Deploy Previews (open question 3: decided)

**No login on Deploy Previews.**
- Set `SUPABASE_URL` and `SUPABASE_PUBLISHABLE_KEY` for the **Production** deploy context only.
  The Free plan supports per-context values, not scopes (ADR 0003).
- On previews `requireUser` returns **503** `auth_unavailable`. The UI hides sign-in.
- Preview URLs are not on the redirect allow-list.
- Reason: password sign-in needs no redirect. Preview code with production keys would accept real tokens.
- If previews ever need login, use a separate Supabase test project with synthetic accounts. Lead decision.

## 11. Rate limits

### 11.1 Supabase Auth (vendor defaults, 2026-11-25)

| Action | Default | Our setting |
|---|---|---|
| Emails, built-in SMTP | 2 per hour | Custom SMTP before launch (lead) |
| Sign up and sign in | 30 per 5 min, burst 30 | Keep default |
| Token refresh | 150 per 5 min, burst 30 | Keep default |
| Verify | 30 per 5 min | Keep default |
| OTP send | 60 s per user | Keep default |
| MFA challenge and verify | 15 per min, burst 30 | Not configurable |

Built-in email: "rate limit of 2 emails per hour, and availability is on a best-effort basis."
Two sign-ups an hour cannot support launch. **Custom SMTP before launch is a lead decision** (new vendor, possible cost).

### 11.2 Our Functions (Netlify `config.rateLimit`)

| Route | Limit |
|---|---|
| `/api/agents/*` incl. chat | 20 per min per IP |
| `/api/proposals/*/approve` | 5 per min per IP |
| `/api/account/*` (delete, session note) | 5 per min per IP |
| Existing routes | Unchanged (skill `rate-limiting`) |

- Token checks are local and cheap. We do not audit every 401 in Blobs; that would let attackers burn credits.
- 401s go to function logs only. 403s on `super_admin` routes go to the audit log.
- **TO VERIFY with `netlify-engineer`:** the skill notes "2 rulesets per project max". If true, not every route can have its own rule. Prioritise upload, chat and approve.

## 12. Availability: Free-plan pausing (risk, escalated)

Supabase: "Free projects are paused after 1 week of inactivity."
A paused project stops sign-in, role lookups and account deletion.
- Functions fail closed: **503** `auth_unavailable`. Never fall back to anonymous access.
- Options for the lead: Supabase Pro (cost), or a keep-alive. A keep-alive needs proof that it counts as activity. **TO VERIFY.**
- Escalated to the project lead (ADR 0003 spirit: paid plans need the lead).

## 13. Account deletion (no secret key)

`auth.admin.deleteUser()` needs a secret key. That is banned.

Decision now: **manual dashboard deletion runbook.**
1. The user presses "Delete my data". Our Function (`requireUser`) deletes all Blobs keys and writes `data.delete_all`.
2. The same Function writes `account.delete_requested` (hashed ID only).
3. The lead deletes the user in Supabase: Authentication → Users. `profiles` cascades.
4. The lead logs `account.deleted` through the runbook. Target: within 30 days (counsel to confirm).
5. Between steps 1 and 3 the user can still sign in but has no data. Tokens stay valid until `exp`.
   Role-gated calls fail at once because the profile lookup returns no row after step 3.

Option to verify (not approved): **self-delete RPC.**
- `private.delete_my_account()`, `security definer`, `set search_path = ''`, deletes only `auth.uid()`.
- Require a fresh credential inside it: `amr[0].timestamp` within 600 s, read from `auth.jwt()`.
- Problem: `private` is not exposed, so the browser cannot call it directly.
  A `public` wrapper with `execute` granted to `authenticated` makes the definer reachable. That needs a full review.
- **TO VERIFY**: deleting from `auth.users` in SQL also removes identities, sessions and factors.
- Ship only after a security review, tests on a test project, and the lead's approval.

No secret key without a new ADR approved by the lead.

## 14. Audit events (Blobs `audit`, 1 year)

New events: `auth.sign_in` (best effort, from `/api/session` after sign-in) · `auth.role_change` (mirrored, §8) · `auth.denied` (403 on `super_admin` routes) · `auth.mfa_required` · `auth.step_up_required` · `account.delete_requested` · `account.deleted`.

- Actor is the hashed user ID. Never the email, token or claims.
- `proposal.approve` adds `details.stepUpAt` (the `amr[0].timestamp`).
- Supabase keeps its own auth audit log for **24 hours** on Free. Our Blobs copy is the record.

## 15. Open questions from the plan

| # | Question | Answer |
|---|---|---|
| 1 | Step-up recency | **Decided.** `amr[0].method === "totp"` within 600 s, else 403 `step_up_required` (§7.2). Refresh behaviour TO VERIFY before release. |
| 2 | Promotion audit | **Decided.** Trigger into `private.role_changes` + runbook + Blobs mirror + weekly reconcile (§8). |
| 3 | Deploy Previews | **Decided.** No login. Supabase vars Production-only. Not on redirect list (§10). |
| 4 | Vendor and cost | **Escalated to lead.** Free limits now verified (50k MAU, 2 projects, pause after 1 week, MFA included, 24 h auth log). Custom SMTP and any paid plan need the lead (§11, §12). |
| 5 | Resumes and Supabase | **Decided, agrees with privacy.** No resume data in Supabase. `profiles` is 3 columns (§6). |
| 6 | Per-request cost | **Decided.** `getClaims` with ES256 verifies locally. `getUser` only on Approve (§4.1, §7.3). |
| 7 | Dropped roles | **Security agrees; lead confirms.** Two roles shrink the attack surface. Employer registry moves to `super_admin` + aal2. |
| 8 | Approvals | **Escalated to lead.** ADR 0006, the agent and skills need lead approval after reviews. Security sign-off comes in T9. |

## 16. Release gates (security veto applies)

Release is blocked until all are true:
- [ ] Asymmetric ES256 signing keys on; legacy HS256 secret no longer signs tokens.
- [ ] No `sb_secret_` or `service_role` value anywhere; CI scan has both patterns.
- [ ] `private` schema not exposed; RLS tests in §6 pass on a test project.
- [ ] Auth tests: 401 no token; 401 bad `alg`/`iss`/expired; 403 `user` on admin routes; 403 aal1; 403 stale step-up; role from `user_metadata` ignored.
- [ ] Step-up TO VERIFY items in §7.2 confirmed.
- [ ] Redirect allow-list exact; no preview URLs.
- [ ] Custom SMTP configured, or the lead accepts the 2/hour limit in writing.
- [ ] Deletion runbook written and tested with a synthetic user.

## Sources (all read 2026-11-25)

- API keys. https://supabase.com/docs/guides/getting-started/api-keys
- JWTs. https://supabase.com/docs/guides/auth/jwts
- JWT signing keys. https://supabase.com/docs/guides/auth/signing-keys
- `getClaims` reference. https://supabase.com/docs/reference/javascript/auth-getclaims
- Password auth. https://supabase.com/docs/guides/auth/passwords
- Auth rate limits. https://supabase.com/docs/guides/auth/rate-limits
- Google sign-in. https://supabase.com/docs/guides/auth/social-sign-in/auth-google
- Redirect URLs. https://supabase.com/docs/guides/auth/redirect-urls
- Identity linking. https://supabase.com/docs/guides/auth/auth-identity-linking
- MFA. https://supabase.com/docs/guides/auth/auth-mfa · https://supabase.com/docs/guides/auth/auth-mfa/totp
- Row level security. https://supabase.com/docs/guides/database/postgres/row-level-security
- Managing user data. https://supabase.com/docs/guides/auth/managing-user-data
- Pricing. https://supabase.com/pricing
- OWASP Top 10:2025. https://owasp.org/Top10/2025/
- Netlify rate limiting. https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
