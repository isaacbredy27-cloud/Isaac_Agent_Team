---
name: agent-console
description: The in-app Agent Console — super_admin + MFA access via Supabase Auth, agent manifest from .claude/agents, streaming chat with server-side system prompts, propose_change and read_file tools, validation, diffs, TOTP step-up approval, commit to main, deploy status and revert. Use for any console feature, access rule, proposal rule or approval flow change.
metadata:
  owner: agent-console-engineer
  backups: [security-expert, meta-agent]
  version: 1.1.0
---

# Agent Console

## Inputs → Outputs
- Inputs: Agent files, verified Supabase access token, user message, proposal edits, approval with TOTP step-up.
- Outputs: Streamed reply, stored proposal with diff, audited commit on main, deploy status.

## Purpose
Let a `super_admin` chat with project agents and accept code changes only after human review.

## Use when
- Building console UI, chat, proposals or approval.
- Changing access, allow-list or approval rules (security-expert must approve).

## Access (Supabase Auth, ADR 0006)
Every `agents-*` and `proposals-*` Function runs these checks on every request, in order:
1. Missing bearer token, or `auth.getClaims(token)` fails → 401 `{"error":"unauthorized"}`.
2. Read the role from `public.profiles` with a client on the user's own token (RLS). Never from the JWT, `user_metadata` or the body. No row means `user`. A lookup error returns 503.
3. `user` → 403 `{"error":"forbidden"}`, same body on every route.
4. `aal !== "aal2"` → 403 `{"error":"mfa_required"}`.
5. Approve and Revert: require `amr[0].method === "totp"` and `now − amr[0].timestamp ≤ 600` s, else 403 `{"error":"step_up_required"}`.
Use only `SUPABASE_URL` and the publishable key. No secret key exists anywhere.

## Flow
```
build:   parse .claude/agents/*.md → agents-manifest.json (bundled into agents-* functions) + server-only prompts
list:    GET /api/agents → access(super_admin, aal2) → manifest
chat:    POST /api/agents/chat → access(super_admin, aal2) → budget check → stream Claude (tools: read_file, propose_change)
propose: validate paths (deny wins) → secret scan → size ≤ 200 KB → base SHA → diff → store proposal (pending, requestedBy = sub)
reject:  access(super_admin, aal2) → status rejected
approve: access(super_admin, aal2, step-up ≤ 600 s) + type proposal # → commit to main (skill: github-api) → Netlify deploys → status
revert:  access(super_admin, aal2, step-up ≤ 600 s) → new proposal reversing the diff → approve flow
```

## Rules
- Approver = `sub` from verified claims. Commit trailer: `Approved-by: <sub>`. Never the email. Ignore identity fields sent by the client.
- Audit events record the hashed `sub`, route, action, proposal ID and result.
- Hiding console links from `user` is convenience only. Functions enforce access.
- `step_up_required` opens the step-up sheet. After `mfa.verify`, the user presses Approve again. No auto-retry.
- System prompts come from the server bundle by agent name; ignore any client-sent prompt.
- Console context never includes resumes, profiles or postings (ADR 0004).
- Global allow: `apps/web/src/**`, `packages/**`, `data/taxonomy/**`, `docs/**`, `.claude/agents/**`, `.claude/skills/**`, `knowledge/**`, `tests/**`.
- Global deny (wins): `netlify.toml`, `netlify/functions/**`, `package*.json`, `.github/**`, `.env*`, `**/*.pem`, `**/*.key`, `scripts/**`.
- Deploy Preview contexts disable Approve (no token, ADR 0001).
- Every step writes an audit event (skill: audit-logging).

## Checklist
- [ ] Manifest lists 100% of agent files
- [ ] Path validator tests: traversal, absolute, encoded, denied, overlap
- [ ] Stale-base test
- [ ] 401 without a token or with an invalid token on every agents-*/proposals-* route
- [ ] 403 `forbidden` for `user`, same body on every route
- [ ] 403 `mfa_required` for `super_admin` at aal1
- [ ] 403 `step_up_required` when `amr[0]` is not `totp` or is older than 600 s
- [ ] A role in `user_metadata` or the request body grants nothing
- [ ] Commit approver comes from claims, not the request body
- [ ] Diff viewer accessible (skill: accessibility-wcag)

## Common mistakes
- Trusting the model's `path` field without normalising.
- Showing full system prompts in the browser.
- Reading the role from the JWT or `user_metadata`.
- Using `getSession()` to authorize on the server.
- Checking `aal` before role, which tells a `user` the route needs MFA.
- Checking only `aal2` for Approve. MFA may be hours old.
- Serving `agents-manifest.json` as a static file, which bypasses the gate.

## References
- docs/agent-console.md · ADR 0001 · ADR 0002 · ADR 0005 · ADR 0006
- Skills: authentication, authorization, audit-logging, supabase-auth
- https://supabase.com/docs/reference/javascript/auth-getclaims (read 2026-11-25)
- https://supabase.com/docs/guides/auth/auth-mfa (read 2026-11-25)
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
