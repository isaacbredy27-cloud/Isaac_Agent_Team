---
name: authorization
description: Authorization rules — roles (user, viewer, admin, owner), deny-by-default requireRole helper, resource ownership checks (users only see their own resume/profile/matches), agent path allow-list and deny-list for proposals, path normalization against traversal. Use for any access-control or proposal-path decision.
metadata:
  owner: security-expert
  backups: [agent-console-engineer, netlify-engineer]
  version: 1.0.0
---

# Authorization

## Purpose
Decide what each verified user or agent may do, denying by default.

## Use when
- Any new route or data access
- Any change to roles or agent path rules

## Inputs → Outputs
- Inputs: Verified identity, requested resource or path.
- Outputs: Allow or 403, with an audit event for denials on sensitive routes.

## Roles
| Role | Can |
|---|---|
| user | own resume, profile, matches, saved jobs, delete own data |
| viewer | + read Agent Console and proposals |
| admin | + chat with agents, create/approve/reject proposals, manage employer registry |
| owner | + manage roles |
No role can read another user's resume or profile — not even admin (ADR 0004).

## Rules
- `requireRole(req, role)` at the top of every handler; deny by default.
- Ownership: Blob keys derive from the verified user ID; never from request params.
- Proposal paths: normalize (`path.posix.normalize`), reject `..`, absolute, backslash, NUL, URL-encoded traversal; then allow-list ∩ agent globs; **deny wins** (skill: agent-console).

## Checklist
- [ ] 403 tests for every role boundary
- [ ] IDOR test: user A cannot fetch user B's match
- [ ] Path validator fuzz test

## Common mistakes
- Checking role in the UI only.
- Building a Blob key from a user-supplied ID.

## References
- https://owasp.org/Top10/2025/ (A01 Broken Access Control)
- https://cheatsheetseries.owasp.org/cheatsheets/Authorization_Cheat_Sheet.html
