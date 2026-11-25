# Finance Match Orlando — Research Index

Research date: 2026-11-24. Status: research complete; ready for build hand-off.

Finance Match Orlando is an installable web app (PWA) on Netlify. Users upload a resume. The app collects recent Orlando-area finance jobs, scores each one against the resume, and explains the score.

## Documents

| # | Document | Answers |
|---|---|---|
| 1 | [orlando-finance-market.md](orlando-finance-market.md) | Who hires, which roles, pay (BLS May 2025), what qualifications matter |
| 2 | [job-data-sources.md](job-data-sources.md) | Where jobs come from, legally and reliably |
| 3 | [resume-analysis.md](resume-analysis.md) | PDF/DOCX parsing and the candidate profile schema |
| 4 | [match-scoring.md](match-scoring.md) | Scoring algorithm, weighting models, bands, explanation engine |
| 5 | [pwa-requirements.md](pwa-requirements.md) | Install on iPhone and Android, offline, caching |
| 6 | [netlify-architecture.md](netlify-architecture.md) | Functions, Blobs, caching, deploy workflow, cost |
| 7 | [resume-match-dashboard.md](resume-match-dashboard.md) | Screens, filters, cards, skill gaps |
| 8 | [agent-console.md](agent-console.md) | Agent list, chat, propose → diff → approve → commit → deploy |
| 9 | [security.md](security.md) | Auth, roles, secrets, allow-lists, injection, retention |
| 10 | [long-running-jobs.md](long-running-jobs.md) | Background work, queue, retries, progress |
| 11 | [testing-and-accessibility.md](testing-and-accessibility.md) | Test plan, WCAG 2.2 AA, performance budgets |
| 12 | [expert-roster.md](expert-roster.md) | The 17-agent team: roles, skills matrix, RACI, escalation, agent lifecycle and standards |

## Architecture decisions

1. **Static PWA + Netlify Functions.** No separate server. (`netlify-architecture.md`)
2. **Netlify Blobs for storage in phase 1**, behind repository interfaces so a database can replace it later.
3. **Claude only server-side.** API key in Netlify env vars, Functions scope, marked secret.
4. **Code scores; Claude extracts and explains.** Scores are deterministic and versioned. (`match-scoring.md`)
5. **Weighting model D:** gated, with seniority alignment and role-family presets.
6. **Job data from official APIs first** (Greenhouse, Lever, SmartRecruiters, Ashby, USAJOBS), then public JSON-LD on career pages. No LinkedIn/Indeed/Glassdoor scraping.
7. **Scheduled → background fan-out** for ingestion. Blob-backed task queue with leases and checkpoints. (`long-running-jobs.md`)
8. **Agent changes need human approval.** Fine-grained GitHub token, one repo, Contents write only. Path allow-list. Atomic commit via Git Data API. Netlify redeploys on push. (`agent-console.md`)
9. **MFA for admins.** Auth0 extension recommended for admin accounts. (`security.md`)
10. **PWA first; Capacitor later** only if store presence or native features become requirements. (`pwa-requirements.md`)

## Key numbers

| Fact | Value | Source |
|---|---|---|
| Orlando financial & investment analysts | 3,110 jobs; mean $98,990 | BLS OEWS May 2025 |
| Orlando financial managers | 6,190 jobs; mean $163,860 | BLS OEWS May 2025 |
| Netlify sync / background / scheduled limits | 60 s / 15 min / 30 s | Netlify docs |
| Netlify payloads | 6 MB buffered, 20 MB streamed, 256 KB background | Netlify docs |
| Blobs propagation (eventual) | ≤ 60 s | Netlify docs |
| Claude Opus 5.5 Tier 1 limits | 4,000 RPM; 2M ITPM; 400k OTPM | Claude docs |
| GitHub PAT limits | 5,000 req/h; 80 writes/min | GitHub docs |
| WCAG 2.5.8 minimum target | 24×24 CSS px (we use 44×44) | W3C |

## Implementation plan for the agent team

Suggested agents (create in `.claude/agents/`): `product-lead`, `frontend-engineer`, `functions-engineer`, `scoring-engineer`, `data-sources-engineer`, `qa-accessibility`, `security-reviewer`.

### Phase 0 — Foundations (week 1)

- Monorepo skeleton (`apps/web`, `netlify/functions`, `packages/*`, `data/taxonomy`).
- `netlify.toml`, security headers, CI (lint, typecheck, Vitest, secret scan).
- Spikes: streaming duration, Node version for `unpdf`, plan features (rate limits, env scopes), auth provider.
- Owner: functions-engineer, security-reviewer.

### Phase 1 — Core matching (weeks 2–4)

- Zod schemas: CandidateProfile, JobRequirements, MatchResult, MatchExplanation.
- `packages/scoring` with model D, gates, presets. Full unit tests.
- Resume upload + parse + profile review screen.
- Greenhouse, Lever and USAJOBS connectors; scheduled ingestion; requirement extraction.
- Matches list, filters, job detail with score bars and template explanations.
- Owners: scoring-engineer, data-sources-engineer, frontend-engineer.

### Phase 2 — Explanations, PWA, saved jobs (weeks 5–6)

- Claude explanations with evidence check and caching.
- Manifest, icons, service worker, offline saved jobs, install UX (Android prompt, iOS sheet).
- Skill-gap view.
- Accessibility pass to WCAG 2.2 AA; Lighthouse budgets in CI.
- Owners: frontend-engineer, qa-accessibility.

### Phase 3 — Agent Console (weeks 7–8)

- Agent manifest build step; console UI; streaming chat.
- `propose_change` tool, validation, diff review, step-up approval, Git Data API commit, deploy status.
- Audit log viewer.
- Owners: functions-engineer, security-reviewer.

### Phase 4 — Coverage and hardening (weeks 9–10)

- JSON-LD career-page connector for Workday/iCIMS/Oracle employers (with terms review per employer).
- Retention jobs, delete-my-data, monitoring and alerts.
- Real-device testing; LLM eval sets; outcome logging for weight calibration.

## Open decisions for the owner

1. **Auth provider:** Auth0 (MFA) for admins only, or for all users?
2. **Model cost lever:** keep `claude-opus-5-5` (default) for extraction, or approve an eval to test `claude-haiku-5-5`?
3. **Netlify plan:** env var scopes need Pro or above; confirm rate-limit availability.
4. **Commit target:** commit approved changes straight to `main` (simple) or to `agent/*` branches with a preview step (safer)?
5. **Aggregator licence:** pay for a licensed jobs feed for Workday/Oracle employers, or rely on JSON-LD pages?
6. **Push notifications:** phase 2 or later?

## Research method and limits

- Official docs were read on 2026-11-24 through a web scraping service because the build container's network blocked several hosts directly.
- Some pages could not be fully read: Adzuna developer overview, O*NET occupation summary, and parts of the USAJOBS header requirements. Those items are flagged "verify during build".
- Netlify Identity's status comes from a community forum summary of a Netlify blog edit, not a Netlify staff post.
- Market data mixes official BLS statistics with a one-day sample of live postings. The posting sample is evidence of who hires, not a complete census.

## Sources (primary)

- MDN Progressive Web Apps guides — https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps
- Netlify docs: Functions configuration, Background, Scheduled, Blobs, Environment variables, Build hooks, Rate limiting, Identity — https://docs.netlify.com/
- Claude API docs: rate limits, PDF support, streaming, tool use, structured outputs — https://platform.claude.com/docs/
- GitHub REST docs: repository contents, Git trees, rate limits, fine-grained PATs — https://docs.github.com/en/rest
- Greenhouse Job Board API — https://developers.greenhouse.io/job-board.html
- Lever Postings API — https://github.com/lever/postings-api
- USAJOBS API — https://developer.usajobs.gov/
- Google JobPosting structured data — https://developers.google.com/search/docs/appearance/structured-data/job-posting
- BLS OEWS — https://www.bls.gov/oes/
- W3C WCAG 2.2 — https://www.w3.org/TR/WCAG22/
