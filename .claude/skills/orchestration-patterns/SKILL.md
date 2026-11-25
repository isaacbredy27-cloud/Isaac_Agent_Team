---
name: orchestration-patterns
description: How the orchestrator runs the team — hub-and-spoke delegation (specialists never talk to each other), task briefs with full context, parallel fan-out of independent work, sequential chains for dependent steps, review gates and vetoes, escalation chain to the project lead, status reports. Use when planning, delegating or integrating work.
metadata:
  owner: orchestrator
  backups: [software-architect, meta-agent]
  version: 1.0.0
---

# Orchestration Patterns

## Purpose
Run 16 specialists as one team: right owner, right order, nothing lost between hand-offs.

## Use when
- Planning or delegating any multi-agent work
- Routing reviews, conflicts and escalations

## Inputs → Outputs
- Inputs: Goal from the project lead, current status.
- Outputs: Task briefs, wave plan, integrated result, status report.

## Hub and spoke (ADR 0005)
Specialists return results to the orchestrator. The orchestrator decides the next step and passes the needed context. Subagents start with a fresh context, so every brief must stand alone.

## Task brief template
```
Task: <one sentence>
Owner: <agent>   Reviewers: <agents>   Due: <date>
Context: <links to docs/ADRs/files; key facts>
Inputs: <files, data>
Done when: <acceptance criteria>
Constraints: <paths you may edit; ADRs that apply>
Return: <exact shape of the report>
```

## Patterns
- **Parallel fan-out:** independent tasks (e.g., Sable tokens + Wren flows + JDI connector) run at once. Up to ~5 at a time keeps review manageable.
- **Chain:** dependent steps (schema → scoring → explanations → UI) run in order; pass outputs forward.
- **Review gate:** implementer → reviewer(s) → QA → (security/privacy/a11y veto if relevant).
- **Isolate noisy work:** test runs and doc research go to a subagent; only summaries return.
- **Direct work:** small single-file edits — don't delegate.

## Escalation (docs/expert-roster.md §8)
Owner → peer resolution via orchestrator (1 day) → domain authority (1 day) → orchestrator recommendation → project lead. Vetoes (security, privacy, accessibility) only the lead overrides, in writing.

## Status report (weekly)
Done · In progress · Blocked (with owner) · Risks · Decisions needed (from the lead).

## Best practices
- Every brief stands alone (subagents start fresh)
- Parallelise independent work; chain dependent work
- Route vetoes up, never around

## Checklist
- [ ] One owner per task
- [ ] Acceptance criteria stated
- [ ] Reviewers named
- [ ] Docs updated at integration

## Common mistakes
- Letting specialists coordinate directly
- Briefs that say 'as discussed'
- Delegating trivial single-file edits

## References
- https://code.claude.com/docs/en/sub-agents (delegation, chaining, parallel research)
- https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices (subagent orchestration)
