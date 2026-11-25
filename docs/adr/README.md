# Architecture Decision Records

Each file records one decision, its context and its consequences. Format: Nygard (Title, Status, Context, Decision, Consequences), per https://adr.github.io/.

| ADR | Title | Status | Date |
|---|---|---|---|
| [0001](0001-github-fine-grained-pat-single-repo.md) | GitHub access uses one fine-grained PAT restricted to this repository | Accepted | 2026-11-25 |
| [0002](0002-commit-approved-changes-to-main.md) | Approved agent changes are committed directly to `main` | Accepted | 2026-11-25 |
| [0003](0003-netlify-free-plan.md) | Deploy and operate on the Netlify Free plan | Accepted | 2026-11-25 |
| [0004](0004-resume-confidentiality.md) | Resumes are never public and are used only for matching | Accepted | 2026-11-25 |
| [0005](0005-agent-ecosystem.md) | Agent ecosystem: orchestrator hub, skills-first, per-agent knowledge | Accepted | 2026-11-25 |
| [0006](0006-supabase-auth.md) | Use Supabase Auth with profiles-based roles | Proposed (awaiting project lead) | 2026-11-25 |

Rules:

- A new ADR is required for any change to these decisions. Mark the old one `Superseded by NNNN`.
- Every agent preloads the `architecture-decisions` skill, which summarises these ADRs.
- Owner: `software-architect`. The human project lead approves every ADR.
- A `Proposed` ADR is not binding until the lead marks it `Accepted`. Work may plan against it but must not ship on it.
