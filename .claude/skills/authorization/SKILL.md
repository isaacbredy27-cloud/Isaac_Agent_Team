---
name: authorization
description: Authorization rules — roles user and super_admin (from public.profiles under RLS), deny-by-default requireUser/requireRole/requireAal2/requireStepUp helpers, resource ownership checks (users only see their own resume/profile/matches), agent path allow-list and deny-list for proposals, path normalization against traversal. Use for any access-control or proposal-path decision.
metadata:
  owner: security-expert
  backups: [supabase-auth-engineer, agent-console-engineer]
  version: 2.0.0
---

# Authorization

## Purpose
Decide what each verified user or agent may do, denying by default.

## Use when
- Any new route or data access
- Any change to roles or agent path rules

## Inputs → Outputs
- Inputs: Verified claims, the caller's `profiles` row, requested resource or path.
- Outputs: Allow or 403, with an audit event for denials on `super_admin` routes.

## Roles
| Role | Can |
|---|---|
| user (default) | Own resume, profile, matches, saved jobs; delete own data |
| super_admin | + Agents page, agent chat, proposals, approve/reject, employer registry (`aal2` required) |

No role can read another user's resume or profile, not even `super_admin` (ADR 0004).
Role source: `public.profiles.role` only, read per request under RLS. Never `user_metadata`, the JWT or the request.

## Helpers (netlify/functions/_lib/auth/)
| Helper | Passes when | Else |
|---|---|---|
| `requireUser(req)` | Valid token (skill `authentication`) | 401 (503 if auth unavailable) |
| `requireRole(ctx, "super_admin")` | `profiles.role` matches | 403 `forbidden` |
| `requireAal2(ctx)` | `aal === "aal2"` | 403 `mfa_required` |
| `requireStepUp(ctx)` | `amr[0].method === "totp"` and ≤ 600 s old | 403 `step_up_required` |

Order: requireUser → requireRole → requireAal2 → (Approve, Revert) requireStepUp → getUser → Origin → proposal number → base SHA. Role runs before MFA, so a `user` never learns a route needs MFA.

## Rules
- Call the helpers at the top of every handler; deny by default.
- Role changes: manual SQL by the project lead only. No API path can write `role` (skill `supabase-row-level-security`).
- Ownership: Blob keys derive from the verified `sub` (hashed); never from request params.
- Proposal paths: normalize (`path.posix.normalize`), reject `..`, absolute, backslash, NUL, URL-encoded traversal; then allow-list ∩ agent globs; **deny wins** (skill `agent-console`).

## Checklist
- [ ] 403 tests: `user` on `super_admin` routes, aal1 `super_admin`, stale step-up
- [ ] RLS tests: A cannot read B's profile; `authenticated` cannot update `role`
- [ ] IDOR test: user A cannot fetch user B's match
- [ ] Path validator fuzz test

## Common mistakes
- Checking role in the UI only
- Reading role from `user_metadata` or the JWT
- Building a Blob key from a user-supplied ID
- Treating `aal2` as proof of a recent MFA

## References
- https://owasp.org/Top10/2025/ (A01 Broken Access Control)
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
- https://supabase.com/docs/guides/database/postgres/row-level-security (read 2026-11-25)
- docs/security/supabase-auth.md
