# Testing and Accessibility

Research date: 2026-11-24. Goal: a test strategy and acceptance criteria that agents can implement and verify.

## 1. Tooling

| Layer | Tool | Why |
|---|---|---|
| Unit | Vitest | Fast, TypeScript-native, works with Vite |
| Component | Vitest + Testing Library | Tests behaviour, encourages accessible queries |
| Integration (functions) | Vitest + `@netlify/functions` handlers called directly; Blobs via Netlify CLI local mode | No network; deterministic |
| API mocks | MSW (Mock Service Worker) | Mock Claude, GitHub and job sources at HTTP level |
| End-to-end | Playwright | Chromium, WebKit (Safari engine) and Firefox; mobile device emulation |
| Accessibility (automated) | `@axe-core/playwright` | WCAG rule checks inside e2e flows |
| Performance | Lighthouse CI | Performance, accessibility, best practices budgets |
| PWA installability | DevTools Protocol `Page.getInstallabilityErrors` via Playwright | Lighthouse 12 removed the PWA category |
| LLM quality | Labelled eval sets + scripted runs | Extraction and explanation accuracy |

## 2. Unit tests

Must cover:

- **Scoring module (highest priority).** Each sub-score formula, weight redistribution, gate caps, band edges (59/60, 79/80), rounding, role-family presets. Property tests: score always 0–100; adding a matched skill never lowers the score.
- Taxonomy mapping: aliases, related edges, unknown terms.
- Date math: overlapping positions, "present".
- Path allow-list and deny-list validator (traversal, absolute paths, encoded `..`).
- Secret-pattern scanner.
- Zod schemas for all model outputs.

Target: ≥ 95% line coverage for `packages/scoring` and the validators; ≥ 80% overall.

## 3. Integration tests

- `/api/resume`: PDF and DOCX fixtures → profile (Claude mocked with recorded responses).
- `/api/jobs`: filters, pagination, cache headers.
- `/api/match/:id`: score + explanation; fallback when Claude fails.
- Ingestion connectors: recorded Greenhouse, Lever, USAJOBS and JSON-LD responses (contract tests).
- Proposal flow: create → validate → approve → GitHub calls (mocked) in the correct order; stale-base rejection.
- Background worker: idempotency under retry; lease; checkpoint resume.
- Auth: every protected route returns 401/403 correctly.
- Retention job: deletes exactly the expired keys.

## 4. End-to-end tests (Playwright)

Run against `netlify dev` locally and against each Deploy Preview in CI. Pass `--trace off` by default; enable traces only to debug a failure.

Critical journeys:

1. Upload resume → review profile → see ranked matches.
2. Apply each filter alone and combined; reload keeps filters.
3. Open a job; see score bars, gates, explanation; click Apply opens employer URL in new tab.
4. Save a job; go offline (`context.setOffline(true)`); saved list still shows.
5. Install flow: Chromium installability errors empty; iOS instructions sheet appears in WebKit when not standalone.
6. Admin: open Agent Console, chat (Claude mocked), receive proposal, review diff, approve (GitHub mocked).
7. User cannot open admin routes.
8. Delete my data.

Device matrix (emulated in CI):

- iPhone 15 (WebKit), Pixel 7 (Chromium), iPad Mini (WebKit), Desktop Chrome 1440×900, Desktop Firefox.

Real-device checks before each release:

- iPhone on iOS 18 and iOS 26 (Safari, Add to Home Screen, VoiceOver).
- Android on current Chrome (install prompt, TalkBack).

## 5. Accessibility standard

Target **WCAG 2.2 Level AA**.

Key criteria for this app:

| Criterion | Requirement | How we meet it |
|---|---|---|
| 1.1.1 Non-text content | Text alternatives | Icons in score badges have text labels |
| 1.3.1 Info and relationships | Semantic structure | Real headings, lists, `<table>` for score bars data, labelled form controls |
| 1.4.1 Use of color | Color not the only cue | Band = icon + text + color |
| 1.4.3 Contrast (minimum) | 4.5:1 text, 3:1 large text | Token palette checked; amber uses dark text on light chip |
| 1.4.10 Reflow | No 2-D scroll at 320 px | Single-column layout on narrow screens |
| 1.4.11 Non-text contrast | 3:1 for UI components | Focus rings, slider tracks, chips |
| 2.1.1 Keyboard | All functions by keyboard | Filters, sliders, diff viewer, chat |
| 2.4.3 Focus order | Logical | DOM order matches visual order |
| 2.4.7 / 2.4.11 Focus visible / not obscured | Visible focus, not hidden by sticky bars | `:focus-visible` outline; scroll-padding for sticky headers |
| 2.5.8 Target size (minimum) | ≥ 24×24 CSS px or spacing exception | We use ≥ 44×44 px for primary controls (2.5.5 enhanced target) |
| 3.3.1 / 3.3.3 Error identification and suggestion | Clear errors | Upload errors say what and how to fix |
| 4.1.2 Name, role, value | Accessible names | Custom controls use native elements or correct ARIA |
| 4.1.3 Status messages | Announced without focus | `aria-live` for upload progress, task progress, filter result counts |

Screen-reader specifics:

- Score badge reads "86, Strong Match".
- Sub-score bars read "Required skills, 24 of 30".
- Streaming chat: announce "Agent is responding" once, then the final message; do not announce every token.
- Diff viewer: each line exposes "added", "removed" or "unchanged" in text, not color only.

Keyboard specifics:

- Skip link to main content.
- Filter sheet traps focus while open; `Esc` closes; focus returns to the trigger.
- Range slider supports arrow keys and Page Up/Down.

## 6. Performance testing

Lighthouse CI budgets (mobile preset, simulated throttling):

| Metric | Budget |
|---|---|
| Performance score | ≥ 90 |
| Accessibility score | 100 |
| Best practices score | ≥ 95 |
| LCP | ≤ 2.5 s |
| CLS | ≤ 0.1 |
| Total blocking time | ≤ 200 ms |
| JS per route (gzipped) | ≤ 200 KB |

Field data: collect Core Web Vitals (LCP, INP, CLS) with the `web-vitals` library, anonymized, no PII.

Load tests (k6 or Artillery, against a staging deploy):

- `/api/jobs`: 50 RPS for 5 min, p95 < 300 ms (CDN cached).
- `/api/match/:id`: 10 RPS, p95 < 800 ms excluding first explanation.

## 7. LLM evaluation

| Eval | Set | Metric | Gate |
|---|---|---|---|
| Resume extraction | 50 labelled resumes | Field accuracy | ≥ 95% titles/dates; ≥ 95% cert recall |
| Job requirement extraction | 100 labelled Orlando postings | Required vs preferred split accuracy; gate recall | ≥ 90%; gate recall 100% on clearance/licence |
| Explanations | 50 match results | Evidence-consistency check; recruiter rating 1–5 | 0 unsupported skills; mean ≥ 4 |
| Model or effort change | Same sets | Must not regress beyond 1 point | Required before switching models |

Run evals in CI nightly with recorded inputs. Live Claude calls cost money; get owner approval for the budget.

## 8. Mobile responsiveness

- Breakpoints: 320, 375, 768, 1024, 1440 px.
- No horizontal scroll at 320 px.
- Safe-area insets respected in standalone mode (`env(safe-area-inset-*)`).
- Test portrait and landscape.
- Test 200% text zoom.

## 9. CI pipeline

```
on: pull_request
  lint + typecheck
  unit + component (Vitest)
  integration (Vitest + MSW)
  build + secret scan of dist/
  Netlify Deploy Preview
  e2e (Playwright, mocked Claude/GitHub) + axe
  Lighthouse CI against Deploy Preview
  installability check (CDP)
on: nightly
  LLM evals (recorded + small live sample)
  dependency audit
```

All gates must pass before merge to `main`.

## 10. Definition of done (per feature)

- Unit and integration tests added; coverage thresholds hold.
- E2E journey updated if the feature is user-facing.
- axe reports 0 violations on touched pages.
- Keyboard-only walkthrough done.
- VoiceOver or TalkBack spot check done for new components.
- Lighthouse budgets hold.
- Docs in `docs/` updated if behaviour changed.

## Sources

- W3C, Understanding SC 2.5.8 Target Size (Minimum), Level AA, 24×24 CSS px; 2.5.5 uses 44×44. https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- Lighthouse changelog 12.0.0 (PWA category removed). https://github.com/GoogleChrome/lighthouse/blob/main/changelog.md
- Chrome DevTools Protocol, `Page.getInstallabilityErrors`. https://chromedevtools.github.io/devtools-protocol/tot/Page/#method-getInstallabilityErrors
- Progressive Web Apps, "Auditing PWAs after Lighthouse dropped the PWA category". https://progressivewebapps.com/blog/auditing-pwas-after-lighthouse-dropped-the-pwa-category/
- WCAG 2.2 (W3C Recommendation). https://www.w3.org/TR/WCAG22/
