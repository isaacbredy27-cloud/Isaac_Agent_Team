---
name: system-architecture
description: Finance Match Orlando system architecture — static PWA + Netlify Functions + Blobs, module boundaries (apps/web, netlify/functions, packages/scoring|schemas|sources|resume|prompts, data/taxonomy), shared contracts, browser vs server split, storage interfaces, when to add a database or queue. Use for cross-module design or any change to boundaries or contracts.
metadata:
  owner: software-architect
  backups: [netlify-engineer, orchestrator]
  version: 1.0.0
---

# System Architecture

## Purpose
Keep module boundaries, contracts and storage choices clear so agents can work in parallel safely.

## Use when
- A change crosses modules
- Choosing storage, runtime or queue
- Contract changes

## Inputs → Outputs
- Inputs: Feature design, limits, ADRs.
- Outputs: Boundary decision, contract version, ADR draft.

## Shape
```
PWA (apps/web) ──/api──▶ Netlify Functions ──▶ Claude API · GitHub API · job sources
                     └─▶ Netlify Blobs (jobs, profiles, matches, tasks, proposals, audit)
```

## Boundaries
| Module | Owns | Must not |
|---|---|---|
| packages/schemas | Zod contracts | import anything app-specific |
| packages/scoring | pure scoring | I/O, model calls |
| packages/resume | parsing + normalization | storage |
| packages/sources | connectors | Claude calls |
| packages/prompts | prompt text + versions | business rules |
| netlify/functions | HTTP, auth, orchestration, I/O | UI code |
| apps/web | UI, offline, install | secrets, Claude, GitHub |

## Principles
- Code decides; models extract and explain.
- Storage behind interfaces (`JobRepo`, `ProfileRepo`) to swap Blobs for a DB later.
- Contracts versioned; breaking change = new version + ADR.
- Free-plan budget is an architectural constraint (ADR 0003).

## Revisit triggers
- > 20,000 active jobs or cross-user queries → database.
- Tasks > 15 min unchunkable or > 1,000/h → external queue.
- Store presence / native features → Capacitor.

## Checklist
- [ ] Boundaries respected (boundary check)
- [ ] Contracts versioned
- [ ] ADR linked

## Common mistakes
- Business logic in functions instead of packages
- Adding a database before a trigger fires

## References
- docs/netlify-architecture.md · docs/adr/
