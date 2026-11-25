---
name: audit-logging
description: Append-only security audit log in Netlify Blobs (audit/log/yyyy-mm-dd/ulid.json) — which events (sign-in, role change, auth denials, MFA and step-up failures, upload, delete, proposal create/approve/reject/commit, rate-limit hits), fields, no PII content, 1-year retention, weekly review. Use when adding a security-relevant action.
metadata:
  owner: security-expert
  backups: [agent-console-engineer, netlify-engineer]
  version: 1.1.0
---

# Audit Logging

## Purpose
Keep a tamper-evident, content-free record of security-relevant actions for one year.

## Use when
- Adding any action listed under Events
- Investigating an incident or an unexpected push

## Inputs → Outputs
- Inputs: Action, actor, target, safe details.
- Outputs: One JSON object in Blobs store `audit`.

## Event shape
```json
{"ts":"2026-11-25T18:03:11Z","actor":"u_3f9a","role":"super_admin","action":"proposal.approve","target":"proposal/7","ip":"203.0.113.4","details":{"commitSha":"abc123","files":2}}
```

## Events (minimum)
auth.sign_in · auth.role_change · auth.denied · auth.mfa_required · auth.step_up_required · resume.upload · resume.delete · data.delete_all · account.delete_requested · account.deleted · agent.chat_start · proposal.create · proposal.approve · proposal.reject · proposal.commit · proposal.stale · ratelimit.block · secret.rotate

## Rules
- One object per event (no read-modify-write races); strong consistency store `audit`.
- Never store resume text, prompts, outputs or tokens.
- Keep 1 year (Free-plan function logs last only 24 h, ADR 0003).
- Actor is the hashed Supabase user ID (`sub`). Never the email, token or claims.
- `proposal.approve` records `details.stepUpAt` (`amr[0].timestamp`). Flag two approvals on one step-up.
- Role changes happen in dashboard SQL. A trigger logs them to `private.role_changes`; the runbook mirrors each one as `auth.role_change`. The weekly review reconciles both. Any gap is an incident.
- Supabase keeps its auth logs 24 hours on the Free plan; our Blobs copy is the record.
- Weekly review by security-expert; alert on push to main without matching `proposal.commit` or human PR.

## Checklist
- [ ] Event name in the list
- [ ] No content fields (resume text, prompts, tokens)
- [ ] Strong-consistency store
- [ ] Weekly review done

## Common mistakes
- Appending to one big JSON file (races, lost events)
- Logging prompts or model outputs
- Relying on 24-hour Netlify logs for audits

## References
- https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html
- docs/security.md §8 · docs/security/supabase-auth.md
- https://supabase.com/pricing (auth log retention, read 2026-11-25)
