# Project agents

Claude Code project subagents for Finance Match Orlando. Claude Code skips this README because it has no `name` frontmatter.

## Agents and responsibilities

| Agent | Responsibility | Owns (paths) | Veto |
|---|---|---|---|
| `orchestrator` | Plans, delegates, integrates, reports; coordinates all work | `docs/plans/**` | — |
| `meta-agent` | Builds, evaluates and retires agents and skills | `.claude/agents/**`, `.claude/skills/**`, `knowledge/**`, `tests/agents/**`, `scripts/validate-agents.mjs` | — |
| `software-architect` | System design, contracts, ADRs, docs | `docs/*.md`, `docs/adr/**`, `packages/schemas/**` | — |
| `finance-job-market-specialist` | Orlando market, salaries, roles, taxonomy content | `data/taxonomy/**`, `docs/market/**` | — |
| `resume-analysis-expert` | Upload validation, PDF/DOCX parsing, profiles | `packages/resume/**`, `netlify/functions/resume-*`, `tests/resume/**` | — |
| `candidate-job-matching-expert` | Scoring, ranking, gaps, recommendations | `packages/scoring/**`, `netlify/functions/match-*`, `tests/scoring/**` | — |
| `job-data-integration-expert` | Job-source connectors and ingestion | `packages/sources/**`, `netlify/functions/jobs-*`, `netlify/functions/ingest-*`, `data/registry/employers.json`, `tests/sources/**` | — |
| `ai-systems-engineer` | Prompts, model use, LLM evals, Claude cost | `packages/prompts/**`, `tests/evals/**` | — |
| `ui-designer-apple-liquid-glass` (Sable) | Visual system, Liquid Glass, tokens, icons | `apps/web/src/design/**`, `apps/web/public/icons/**`, `docs/design/visual/**` | — |
| `ux-designer-apple-hig` (Wren) | Flows, navigation, states, copy | `apps/web/src/content/**`, `docs/design/ux/**` | — |
| `mobile-pwa-expert` | PWA front end, service worker, install, performance | `apps/web/src/app/**`, `apps/web/src/sw.ts`, manifest, `index.html`, Vite config, `tests/web/**` | — |
| `accessibility-specialist` | WCAG 2.2 AA conformance and AT testing | `tests/a11y/**`, `docs/accessibility/**` | release (WCAG) |
| `netlify-engineer` | Platform, deploys, env vars, jobs, monitoring, incidents | `netlify.toml`, `netlify/functions/_lib/platform/**`, `ops-*`, `worker-*`, `schedule-*`, `docs/runbooks/**`, `docs/incidents/**` | — |
| `agent-console-engineer` | Console chat, proposals, approvals, commits | `apps/web/src/console/**`, `netlify/functions/agents-*`, `proposals-*`, `scripts/build-agent-manifest.*`, `tests/console/**` | — |
| `security-expert` | Threat model, auth, secrets, limits, audit | `netlify/functions/_lib/auth/**`, `config/agent-paths.json`, `docs/security/**`, `tests/security/**` | release (security), agent tools, token scope |
| `privacy-compliance-specialist` | Data protection, retention, consent, source terms | `docs/privacy/**`, `data/registry/terms/**` | release (privacy), enabling sources |
| `qa-engineer` | Test strategy, CI gates, e2e, release report | `tests/e2e/**`, `tests/integration/**`, Playwright/Vitest config | — |

The validator (`scripts/validate-agents.mjs`) rejects any overlap between these path patterns.

## Ownership boundaries

- One owner per path. To change another owner's files, ask the orchestrator to route the request.
- Top-level research docs (`docs/*.md`) are edited by `software-architect`; domain agents send updates through the orchestrator.
- In the Agent Console, the global allow/deny lists also apply: functions, `netlify.toml`, `package*.json` and `.github/**` are always denied there (ADR 0002).

## How to invoke

- **Default:** `claude --agent orchestrator` — the orchestrator delegates to specialists with the `Agent` tool (allowlisted in its frontmatter).
- **Directly:** `@"security-expert (agent)" review this diff`, or name the agent in plain language. Use for single-domain questions.
- **Automatic:** Claude Code delegates by `description`; keep descriptions short and specific.
- Specialists cannot spawn or message other agents. Their results always return to the caller.

## File structure (each agent)

Frontmatter (Claude Code fields only): `name`, `description`, `tools`, `model: opus`, `color`, `skills`. Body sections: Before you answer · Mission · When to invoke · You own · You must not · How you work · Success criteria · Collaboration · Skills · Console profile (a `yaml console-profile` block read by the Agent Console manifest: display name, persona, personality, group, responsibilities, escalation, version, status, human owner).

Why the console metadata lives in the body: Claude Code ignores unknown frontmatter fields silently, so app-only metadata stays out of the frontmatter.

## Validate

```bash
node scripts/validate-agents.mjs
```
