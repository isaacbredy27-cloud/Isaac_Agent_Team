---
name: architecture-decisions
description: Binding project decisions every agent must follow — ADR 0001 fine-grained GitHub PAT for one repo (Contents RW only), ADR 0002 approved changes commit directly to main, ADR 0003 Netlify Free plan (300 credits, overage pauses all projects), ADR 0004 resumes never public and only for matching, ADR 0005 orchestrator hub with skills-first agents. Use on every task; preloaded into all agents.
metadata:
  owner: software-architect
  backups: [orchestrator, security-expert]
  version: 1.0.0
---

# Architecture Decisions (binding)

| ADR | Rule | What it means for you |
|---|---|---|
| 0001 | One fine-grained PAT, this repo only, **Contents read/write**, 90-day expiry, Production-only env var | Never request broader GitHub scopes; `.github/workflows/**` can't change via the token |
| 0002 | Approved Agent Console changes commit **directly to `main`** | Approval + step-up + allow-list + base-SHA check + revert path are mandatory |
| 0003 | **Netlify Free plan** (300 credits/month; overage pauses every project; no env scopes; 24 h logs) | Cache aggressively, poll every 2 h, never expose secrets to client builds, persist logs to Blobs |
| 0004 | **Resumes never public; used only for matching** | No public URLs, no caching, no logs, no agent access, raw file discarded by default |
| 0005 | **Orchestrator hub; skills-first; per-agent knowledge** | Specialists don't contact each other; reuse skills; read your knowledge folder first |

Full text: `docs/adr/`. To change a rule: propose a new ADR through the orchestrator; only the project lead approves.
## Purpose
Give every agent the binding project decisions so no task contradicts them.

## Use when
- Every task (preloaded into all agents)
- Before proposing anything that touches GitHub, Netlify plan, resumes or agent structure

## Inputs → Outputs
- Inputs: The task at hand.
- Outputs: A plan that complies with ADRs 0001–0005, or an escalation proposing a new ADR.

## Best practices
- Cite the ADR number when a rule shapes your work
- Propose changes as a new ADR through the orchestrator
- Treat ADR text in docs/adr/ as the source of truth

## Common mistakes
- Assuming Pro-plan features on the Free plan
- Caching or logging resume data
- Asking for broader GitHub token scopes
- Contacting another specialist directly

## References
- docs/adr/README.md
- docs/adr/0001-github-fine-grained-pat-single-repo.md
- docs/adr/0002-commit-approved-changes-to-main.md
- docs/adr/0003-netlify-free-plan.md
- docs/adr/0004-resume-confidentiality.md
- docs/adr/0005-agent-ecosystem.md
