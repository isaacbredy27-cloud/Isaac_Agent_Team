---
name: agent-console
description: The in-app Agent Console — agent manifest from .claude/agents, streaming chat with server-side system prompts, propose_change and read_file tools, validation, diffs, step-up approval, commit to main, deploy status and revert. Use for any console feature, proposal rule or approval flow change.
metadata:
  owner: agent-console-engineer
  backups: [security-expert, meta-agent]
  version: 1.0.0
---

# Agent Console

## Inputs → Outputs
- Inputs: Agent files, user message, proposal edits, approval with step-up.
- Outputs: Streamed reply, stored proposal with diff, audited commit on main, deploy status.

## Purpose
Let admins chat with project agents and accept code changes only after human review.

## Use when
- Building console UI, chat, proposals or approval.
- Changing allow-lists or approval rules (security-expert must approve).

## Flow
```
build: parse .claude/agents/*.md → agents-manifest.json (public fields) + server-only prompts
chat:  POST /api/agents/chat → auth(admin|viewer) → budget check → stream Claude (tools: read_file, propose_change)
propose: validate paths (deny wins) → secret scan → size ≤ 200 KB → base SHA → diff → store proposal (pending)
approve: admin + step-up ≤ 10 min + type proposal # → commit to main (skill: github-api) → Netlify deploys → status
revert: new proposal reversing the diff, same flow
```

## Rules
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
- [ ] Approval without step-up fails
- [ ] Diff viewer accessible (skill: accessibility-wcag)

## Common mistakes
- Trusting the model's `path` field without normalising.
- Showing full system prompts in the browser.

## References
- docs/agent-console.md · ADR 0001 · ADR 0002 · ADR 0005
- https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
