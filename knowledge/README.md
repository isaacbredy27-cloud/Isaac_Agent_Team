# Agent knowledge

Each agent in `.claude/agents/` has a folder here: `knowledge/<agent-name>/`.

- `docs/` — reference notes taken from official documentation. Every note names its source link and the date it was read.
- `examples/` — two or three small, correct worked examples that show what good looks like. Every `.mjs` example runs and asserts its own result.

Every agent file has a **Before you answer** section: read every file in your knowledge folder first, and prefer it over memory (ADR 0005).

## Run the examples

```bash
cd knowledge
npm install
node run-examples.mjs
```

Results are written to [RESULTS.md](RESULTS.md). Last run: 35 of 35 passed (2026-11-25, Node 22).

What the examples touch for real:

| Example | Real system exercised |
|---|---|
| agent-console-engineer/claude-sdk-auth-error.mjs | Claude API (`api.anthropic.com`) via `@anthropic-ai/sdk`, invalid key → typed 401 |
| agent-console-engineer/github-commit-flow.mjs | GitHub REST API read of this repo's `main` ref; write flow against a local mock |
| job-data-integration-expert/normalize-*.mjs | Recorded real Greenhouse (figma board) and Lever (leverdemo) API responses |
| mobile-pwa-expert/installability-check.mjs | Real Chromium: `Page.getInstallabilityErrors`, service worker, offline reload |
| qa-engineer/e2e-matches.mjs, accessibility-specialist/target-size-and-axe.mjs | Real Chromium + axe-core WCAG scans |
| ui-designer-apple-liquid-glass/reduced-transparency-fallback.mjs | Real Chromium with `prefers-contrast: more` emulation |
| resume-analysis-expert/extract-text.mjs | `unpdf` and `mammoth` on synthetic PDF/DOCX resumes (ADR 0004: never real resumes) |

Examples that need no network (scoring, queues, validators) use in-memory fakes that mirror the documented API shapes.

## Rules

- Notes quote or closely paraphrase official docs; mark project decisions as such.
- Use synthetic personal data only.
- Owner of the structure: `meta-agent`. Each agent's domain notes are reviewed by that agent's owner skill.
- Refresh notes when the source changes; update the "read" date.
