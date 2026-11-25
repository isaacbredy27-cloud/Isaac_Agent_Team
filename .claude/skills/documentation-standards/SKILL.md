---
name: documentation-standards
description: Documentation standards — plain language, short sentences, active voice, one topic per file, docs/ layout, ADRs for decisions, sources with links and dates for every external fact, update docs in the same change as behaviour, README indexes. Use when writing or reviewing any Markdown in docs/, knowledge/, .claude/ or CLAUDE.md.
metadata:
  owner: software-architect
  backups: [orchestrator, meta-agent]
  version: 1.0.0
---

# Documentation Standards

## Purpose
Keep project docs short, sourced, current and easy to find.

## Use when
- Writing or editing any Markdown
- Behaviour or a decision changes

## Inputs → Outputs
- Inputs: A change and its context.
- Outputs: Updated doc in the right folder, with sources and dates.

## Style
- Plain language; sentences under ~20 words; active voice; no filler.
- Lead with the answer; then details.
- Tables for comparisons; code blocks for commands and config.
- Use the glossary terms (Match score, Strong/Moderate/Weak Match, proposal, gate).

## Structure
| Folder | Holds |
|---|---|
| `docs/` | research and architecture (one topic per file) |
| `docs/adr/` | decisions (Nygard: Title, Status, Context, Decision, Consequences) |
| `docs/runbooks/`, `docs/incidents/` | ops |
| `.claude/agents/`, `.claude/skills/` | agent team |
| `knowledge/<agent>/` | per-agent sourced notes and examples |

## Rules
- Every external fact has a source link and the date read.
- Change behaviour → update docs in the same commit.
- Decision changed → new ADR; old one marked superseded.
- Each folder has a README index.
- No secrets, no personal data, no real resumes.

## Checklist
- [ ] Source link and date for each external fact
- [ ] Folder README index updated
- [ ] ADR added if a decision changed
- [ ] No secrets or personal data

## Common mistakes
- Docs updated in a later PR (they drift)
- Copying vendor docs instead of linking and summarising
- Editing an accepted ADR instead of superseding it

## References
- https://adr.github.io/
- https://www.plainlanguage.gov/guidelines/
