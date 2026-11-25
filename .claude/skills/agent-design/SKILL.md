---
name: agent-design
description: Designing and maintaining Claude Code subagents and skills for this project — file format and frontmatter (name, description, tools, model, skills, color), short descriptions, least-privilege tools, no Agent/SendMessage for specialists, skills-first content, knowledge folders, Before-you-answer section, eval suites, lifecycle and versioning. Use when creating, changing, evaluating or retiring an agent or skill.
metadata:
  owner: meta-agent
  backups: [ai-systems-engineer, orchestrator]
  version: 1.0.0
---

# Agent Design

## Purpose
Keep every agent specialised, least-privileged and backed by shared skills and its own knowledge folder.

## Use when
- Creating, changing, evaluating or retiring an agent or skill
- An agent misbehaves or overlaps another

## Inputs → Outputs
- Inputs: Role request, roster, skills matrix, eval results.
- Outputs: Agent file, skill files, knowledge folder, eval suite, validator pass.

## Claude Code facts (code.claude.com/docs/en/sub-agents, /skills)
- Project subagents: `.claude/agents/*.md`, YAML frontmatter + Markdown body (= system prompt). Only `name` and `description` required. Unknown fields are ignored silently.
- Useful fields: `tools`, `disallowedTools`, `model` (`opus`, full ID, `inherit`), `skills` (full content preloaded at startup, first 32), `color`, `effort`, `maxTurns`, `memory`, `isolation`.
- A subagent spawns others only if its `tools` include `Agent`. Omit it for specialists.
- Combined descriptions over 15,000 tokens trigger a startup warning: keep descriptions short; detail goes in the body.
- Skills: `.claude/skills/<name>/SKILL.md`; `description` + `when_to_use` truncated at 1,536 chars in the listing; keep SKILL.md < 500 lines; skills with `disable-model-invocation: true` cannot be preloaded.

## Project standards
- Agent file sections: Before you answer · Mission · When to invoke · You own · You must not · How you work · Success criteria · Collaboration · Skills · Console profile.
- Knowledge: `knowledge/<agent>/docs` (sourced notes) + `examples` (2–3, run where possible).
- One owner per skill; agents reference skills, never copy them.
- Tools: reviewers get Read/Grep/Glob (+ Edit/Write for their docs); engineers add Bash; only the orchestrator has Agent.
- Version agents (semver in Console profile); run eval suite on change (skill: ai-evaluation).

## Lifecycle
Propose → design → review (architect paths, security tools, ai-systems prompt) → test (≥ 10 golden, 3 boundary, 3 injection) → pilot → activate → evaluate quarterly → improve → deprecate → retire (move to docs/agents/archive).

## Checks
`node scripts/validate-agents.mjs` must pass.

## Best practices
- Short description (when to use); detail in the body
- Move any text two agents share into a skill
- Grant tools only for the job; reviewers get no Bash
- Every agent preloads architecture-decisions

## Checklist
- [ ] `node scripts/validate-agents.mjs` passes
- [ ] ≥ 10 golden, 3 boundary, 3 injection eval tasks
- [ ] Security approved tools; architect approved paths
- [ ] Knowledge folder has sourced docs and runnable examples

## Common mistakes
- Inventing frontmatter fields (Claude Code ignores unknown fields silently)
- Giving a specialist the Agent tool
- Copying skill text into agent bodies
- Adding `memory`, which silently grants Write/Edit

## References
- https://code.claude.com/docs/en/sub-agents
- https://code.claude.com/docs/en/skills
- docs/expert-roster.md §9–§13 · ADR 0005
