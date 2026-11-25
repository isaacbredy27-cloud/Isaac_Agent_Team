# ADR 0005 — Agent ecosystem: orchestrator hub, skills-first, per-agent knowledge

Status: Accepted · Date: 2026-11-25 · Decider: project lead

## Context

Claude Code subagents run in their own context and return results to the conversation that started them. A subagent can only spawn others if its `tools` include `Agent`; skills listed in a subagent's `skills` field are preloaded in full. Claude Code's docs advise keeping descriptions short and moving detail into the system prompt, and keeping each `SKILL.md` under 500 lines.

## Decision

- **Hub and spoke.** The `orchestrator` coordinates all work. Specialists have no `Agent` or `SendMessage` tool, so they cannot spawn or message each other. They return results to the orchestrator, which routes the next step.
- **Skills-first.** Business knowledge, workflows, standards and checklists live in `.claude/skills/<name>/SKILL.md`. Agents reference skills instead of duplicating them. Each skill has one owner agent.
- **Per-agent knowledge.** Each agent has `knowledge/<agent-name>/docs/` (notes from official docs, each with a source link) and `examples/` (small worked examples, run where possible). Agents read their knowledge folder before answering.
- **Least privilege.** Read-only reviewers get no Bash. Only engineers get Bash. No agent gets network write tools.

## Consequences

- One place to update each standard.
- The orchestrator is a bottleneck by design; it batches independent work in parallel.
- `scripts/validate-agents.mjs` enforces structure in CI.
