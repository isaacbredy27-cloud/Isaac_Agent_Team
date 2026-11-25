# Plan: build the MVP app and make it deploy-ready

Owner: `orchestrator` (Morgan). Created 2026-11-25. Status: **Planned.**

## Goal

Build Finance Match Orlando, the Agents page and the info pages. Deploy to Netlify from `main`.
The lead asked for `netlify.toml`, functions and `package*.json` in this build.
CLAUDE.md normally routes those through a human PR. The lead's request covers this one build.
security-expert still reviews them (Wave 3).

## Done when

1. Screens work: upload resume, Orlando finance jobs, match scores with explanations, skill gaps, recommendations.
2. PWA installs (manifest, icons, service worker) and shows an offline fallback page.
3. Agents page lists every agent in `.claude/agents` (name, model, personality, knowledge).
4. Chat uses that agent's own prompt, knowledge folder and model, server-side only.
5. Proposals show a diff. Approve commits to `main` (ADR 0002). Reject discards.
6. Supabase login: email+password and Continue with Google. Only `super_admin` + aal2 opens the console.
7. Approve also needs TOTP step-up within 600 s (docs/agent-console.md §4.1). This is stricter than the brief; docs win.
8. How it Works and Resources pages are linked in the header or footer. Resources lists every relied-on link.
9. Resumes are never stored server-side, logged or cached (ADR 0004). The profile lives in the browser only.
10. `ANTHROPIC_API_KEY` and `GITHUB_TOKEN` exist only as Netlify env vars. No secret has a client prefix.
11. `npm run build`, unit tests, Playwright e2e (phone layout, mocked GitHub Approve) and `netlify dev` all pass locally.

## Stack

One root `package.json` (npm, no workspaces). Vite + React + TS in `apps/web` (publish `apps/web/dist`).
Functions: TS, modern `(req, context)` API, `config.path`, in `netlify/functions`.
Packages: `schemas` (Zod), `scoring` (pure), `sources`, `resume`. Data: `data/taxonomy`, `data/jobs`.
Jobs: synthetic seed `data/jobs/seed.json` plus Greenhouse behind `JOBS_GREENHOUSE=1`.
Resume: unpdf (PDF), mammoth (DOCX), plain text, then keyword extraction against the taxonomy.
Claude extraction and explanations are optional. They run only when the key exists and a flag is on.

## Contracts (fixed; Wave 1 codes them in `packages/schemas`)

All responses are JSON. Personal and console routes send `Cache-Control: private, no-store`.
Errors are `{ "error": "<code>" }` only.

| Route | Method | Auth | Request | Response |
|---|---|---|---|---|
| `/api/jobs` | GET | none | `?q=&since=` | `{ jobs: Job[], source: "seed"\|"mixed", fetchedAt }` (CDN-cached, 2 h) |
| `/api/resume` | POST | none | multipart `file` ≤ 5 MB, or `{ text }` | `{ profile: CandidateProfile }` (nothing stored) |
| `/api/match` | POST | none | `{ profile, jobIds?: string[] }` | `{ results: MatchResult[] }` |
| `/api/agents` | GET | SA+aal2 | — | `{ agents: AgentSummary[] }` |
| `/api/agents/chat` | POST | SA+aal2 | `{ agent, conversationId?, message }` | SSE stream: `text`, `proposal{id}`, `done`, `error` |
| `/api/proposals` | GET | SA+aal2 | `?status=pending` | `{ proposals: Proposal[] }` |
| `/api/proposals/:id/approve` | POST | SA+aal2+step-up | `{}` | `{ commitSha, commitUrl }` or 409 `base_sha_changed` |
| `/api/proposals/:id/reject` | POST | SA+aal2 | `{ reason? }` | `{ status: "rejected" }` |

Types (Zod, `packages/schemas`):
- `Job { id, title, company, location, remote, postedAt, url, source, description, skills[] }`
- `CandidateProfile { skills[], titles[], certifications[], yearsExperience, education[] }`
- `MatchResult { jobId, score 0–100, band: "Strong"|"Moderate"|"Weak", evidence[], gaps[], explanation, recommendation }`
- `AgentSummary { name, description, model, personality, group, knowledge: { docs[], examples[] } }`
- `Proposal { id, agent, title, rationale, files[{ path, before?, after }], diff, baseSha, status, createdAt }`

Auth helper, `netlify/functions/_lib/auth/index.ts` (shape from docs/security/supabase-auth.md):
```ts
requireUser(req: Request): Promise<AuthContext>        // throws AuthError(401|403|503, code)
requireRole(ctx: AuthContext, role: "super_admin"): void
requireAal2(ctx: AuthContext): void
requireStepUp(ctx: AuthContext, now?: number): void
withAuth(handler, opts: { superAdmin?: true; stepUp?: true }): (req, context) => Promise<Response>
// withAuth catches AuthError and returns Response { error } with private, no-store
```
Browser env: `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY` (public). Server-only: `ANTHROPIC_API_KEY`,
`GITHUB_TOKEN`, `GITHUB_REPO`, `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `JOBS_GREENHOUSE`, `GITHUB_API_BASE` (tests).

## Wave 1 — contracts and foundations (parallel, no dependencies)

| # | Owner | May edit | Inputs | Done when | Reviewers |
|---|---|---|---|---|---|
| 1a | software-architect | `packages/schemas/**` | Contracts above | Zod schemas + types export; unit test passes | candidate-job-matching-expert, agent-console-engineer |
| 1b | netlify-engineer | `package.json`, `package-lock.json`, `tsconfig*.json`, `netlify.toml`, `.gitignore`, `.nvmrc`, `netlify/functions/_lib/platform/**` | Stack, deps list from this plan | `npm ci` works; Node 22; scripts `dev build test e2e lint typecheck`; JSON/CORS/cache helpers | security-expert |
| 1c | security-expert | `netlify/functions/_lib/auth/**`, `config/agent-paths.json`, `tests/security/**` | Contract above; docs/security/supabase-auth.md | Helpers + allow-list; tests cover 401/403/aal2/step-up/503 | supabase-auth-engineer |
| 1d | finance-job-market-specialist | `data/taxonomy/**` | docs/ finance taxonomy notes | `skills.v1.json` with synonyms and weights; validates | resume-analysis-expert |
| 1e | ui-designer-apple-liquid-glass (Sable) | `apps/web/src/design/**`, `apps/web/public/icons/**` | Skill liquid-glass | Tokens, glass components, icons 192/512/maskable; contrast ≥ 4.5:1 | accessibility-specialist |
| 1f | ux-designer-apple-hig (Wren) | `apps/web/src/content/**`, `apps/web/public/guide/**`, `docs/design/ux/**` | auth-flows.md; lead's link list | Screen flow, all copy, How it Works + Resources content, `/guide/` page | accessibility-specialist |
| 1g | supabase-auth-engineer | `supabase/**`, `apps/web/src/auth/**`, `tests/auth/**` | auth-flows.md; ADR 0006 | Migration (profiles, trigger, RLS); auth client, sign-in/up/reset/Google/MFA screens | security-expert |

Seed data `data/jobs/**` has no owner. Morgan assigns it to job-data-integration-expert (Wave 2).

## Wave 2 — features (parallel, needs Wave 1 contracts)

| # | Owner | May edit | Inputs | Done when | Reviewers |
|---|---|---|---|---|---|
| 2a | job-data-integration-expert | `packages/sources/**`, `netlify/functions/jobs-*`, `data/jobs/**`, `data/registry/employers.json`, `tests/sources/**` | 1a, 1b | `/api/jobs` serves ≥ 30 synthetic seed jobs; Greenhouse connector passes fixture test behind flag | security-expert |
| 2b | resume-analysis-expert | `packages/resume/**`, `netlify/functions/resume-*`, `tests/resume/**` | 1a, 1b, 1d | `/api/resume` parses PDF/DOCX/text to `CandidateProfile`; no storage, no logs | privacy-compliance-specialist, security-expert |
| 2c | candidate-job-matching-expert | `packages/scoring/**`, `netlify/functions/match-*`, `tests/scoring/**` | 1a, 1d, 2a seed | Pure scoring, bands, gaps, template explanations, recommendations; ≥ 95% coverage | finance-job-market-specialist |
| 2d | agent-console-engineer | `apps/web/src/console/**`, `netlify/functions/agents-*`, `netlify/functions/proposals-*`, `netlify/functions/_lib/console/**`, `scripts/build-agent-manifest.*`, `tests/console/**` | 1a, 1b, 1c | Manifest built at build time (server-only bundle); chat streams; proposals in Blobs; Approve does base-SHA check + one commit | security-expert, ai-systems-engineer |
| 2e | ai-systems-engineer | `packages/prompts/**` | 1a | Optional extract/explain prompts `*.v1.ts`; untrusted text gets no tools | security-expert |
| 2f | mobile-pwa-expert | `apps/web/src/app/**`, `apps/web/src/sw.ts`, `apps/web/index.html`, `apps/web/vite.config.*`, `apps/web/public/manifest.webmanifest`, `apps/web/public/offline.html` | 1a, 1e, 1f, 1g | Router, all screens, header/footer links, profile in browser storage, SW + offline page | ux-designer-apple-hig, ui-designer-apple-liquid-glass |

## Wave 3 — reviews, QA and deploy readiness (parallel)

| # | Owner | May edit | Inputs | Done when | Reviewers |
|---|---|---|---|---|---|
| 3a | Named reviewers above | none (return findings) | Wave 2 diffs | Each returns pass or a fix list | — |
| 3b | security-expert | none | All functions, `netlify.toml` | Veto check: no secret in client bundle; auth on every console route; CSP | — |
| 3c | privacy-compliance-specialist | `docs/privacy/**` | 2b, 2f | ADR 0004 check; data inventory updated | — |
| 3d | accessibility-specialist | `tests/a11y/**` | Built app | axe passes on every screen; veto check | — |
| 3e | qa-engineer | `tests/e2e/**`, `tests/integration/**`, `playwright.config.*`, `vitest.config.*` | Built app | Playwright (Chromium, iPhone viewport): upload → jobs → scores; console login stub; Approve with mocked GitHub API via `GITHUB_API_BASE`; offline page | — |
| 3f | netlify-engineer | `README.md`, `docs/runbooks/**`, `netlify.toml` | Built app | `netlify dev` proof (routes respond); README: local run, deploy steps, env vars, Supabase + Google setup | security-expert |

## Wave 4 — fixes and commit

- Morgan routes each fix list to the path owner. Owners fix in their own paths only.
- qa-engineer reruns lint, typecheck, unit, e2e. Never skip a test to go green.
- Main session runs `node scripts/validate-agents.mjs`, `npm run build`, then commits to `main` and pushes.
- Commit message: imperative summary, blank line, why. No `.env*`, secrets or real resumes.

## Root dependencies (1b pins; any addition needs a reason)

react, react-dom, react-router-dom, vite, @vitejs/plugin-react, typescript, zod, @netlify/functions,
@netlify/blobs, @anthropic-ai/sdk, @octokit/rest, @supabase/supabase-js, unpdf, mammoth, diff,
vitest, @playwright/test, @axe-core/playwright, eslint, netlify-cli (dev).

## Risks and decisions needed

1. **`/guide/` does not exist yet.** Wren builds a static guide page. Lead: confirm content, or point to the source.
2. **ADR 0006 is still Proposed.** Building on Supabase assumes the lead approves it.
3. **Lead must set up** Supabase project, Google OAuth client, the PAT (ADR 0001) and env vars in the Netlify UI.
4. **Free-plan credits (ADR 0003).** Chat and Approve are the cost drivers. Rate limits stay on.
5. **Optional Claude resume extraction** sends resume text to Anthropic. Default off until privacy approves.
6. **Unowned paths** (`package.json`, `README.md`, `data/jobs/**`, `_lib/console/**`) are assigned above for this build only.
