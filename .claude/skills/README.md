# Project skills

54 shared skills. Each is a folder with a `SKILL.md` (Claude Code project skill, invocable as `/<name>` and loadable by Claude). Agents preload the skills they depend on through their `skills:` frontmatter; any agent can also load other skills on demand.

## Skill responsibilities

Every skill holds **reusable knowledge or procedure** — business rules, technical workflows, standards, checklists — so agents don't duplicate it. Each skill states: Purpose · Use when · Inputs → Outputs · Best practices · Checklist (where useful) · Common mistakes · References. Each has one **owner** agent (keeps it accurate) and at least one **backup** (`metadata` in frontmatter).

## Catalog

| Domain | Skills (owner) |
|---|---|
| Decisions & process | `architecture-decisions` (software-architect, preloaded by all) · `system-architecture` · `documentation-standards` (software-architect) · `orchestration-patterns` (orchestrator) · `agent-design` (meta-agent) |
| Claude & AI | `claude-api` · `prompt-engineering` · `ai-evaluation` (ai-systems-engineer) · `match-explanations` (candidate-job-matching-expert) |
| Agent Console & GitHub | `agent-console` · `github-api` (agent-console-engineer) |
| Netlify & ops | `netlify-functions` · `netlify-deployment` · `background-jobs` · `observability` · `logging-and-monitoring` · `incident-response` (netlify-engineer) |
| PWA & front end | `pwa-installability` · `service-workers` · `performance-optimization` (mobile-pwa-expert) |
| Resume | `resume-parsing` · `pdf-processing` · `docx-processing` (resume-analysis-expert) |
| Finance domain | `finance-job-market-analysis` · `finance-career-paths` · `skill-taxonomy` (finance-job-market-specialist) |
| Matching | `candidate-job-scoring` · `skill-gap-analysis` · `search-ranking` · `recommendation-systems` (candidate-job-matching-expert) |
| Job data | `job-data-aggregation` · `greenhouse-integration` · `lever-integration` · `workday-integration` · `icims-integration` · `oracle-recruiting-cloud` · `usajobs-integration` · `job-posting-structured-data` (job-data-integration-expert) |
| Design & accessibility | `apple-liquid-glass-design` (Sable) · `apple-hig` · `ux-writing` (Wren) · `accessibility-wcag` (accessibility-specialist) |
| Security | `security-architecture` · `authentication` · `authorization` · `rate-limiting` · `secrets-management` · `prompt-injection-defense` · `audit-logging` (security-expert) |
| Privacy & compliance | `privacy-and-data-protection` · `source-terms-review` · `fairness-in-hiring` (privacy-compliance-specialist) |
| Testing | `testing-strategy` · `end-to-end-testing` (qa-engineer) |

## Reuse principles

1. **Write once.** If two agents need the same rule or procedure, it belongs in a skill. The validator fails on long lines duplicated across agent files.
2. **Reference, don't copy.** Agents list skills in `skills:` and name them in their body; they never paste skill text.
3. **Small and focused.** One topic per skill; under 500 lines (Claude Code guidance); most important rules at the top (only the start of a skill may survive compaction).
4. **Front-load the description.** The listing truncates `description` at 1,536 characters; lead with what it covers and when to use it.
5. **Preload deliberately.** Preloaded skills inject full content into every run of that agent. Preload what the agent uses on most tasks; load the rest on demand.
6. **Model-invocable.** Don't set `disable-model-invocation: true` on a skill an agent preloads — Claude Code can't preload it.
7. **Sources and dates.** Every external fact cites official docs with a read date. Project decisions cite ADRs.
8. **Owner keeps it true.** When docs or decisions change, the owner updates the skill and bumps `metadata.version`.

## Adding a skill

Ask the orchestrator → `meta-agent` drafts → owner reviews → `node scripts/validate-agents.mjs` passes → project lead approves.
