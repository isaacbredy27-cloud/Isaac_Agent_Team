---
name: testing-strategy
description: Test strategy for Finance Match Orlando — Vitest unit and integration tests, MSW mocks for Claude/GitHub/job sources, coverage targets (scoring ≥ 95%), CI gates, definition of done, never skipping or quarantining tests. Use when writing or reviewing tests or the CI pipeline.
metadata:
  owner: qa-engineer
  backups: [software-architect]
  version: 1.0.0
---

# Testing Strategy

## Purpose
Catch defects early with fast, behaviour-focused tests and clear CI gates.

## Use when
- Writing tests
- Changing CI
- Deciding release readiness

## Inputs → Outputs
- Inputs: Acceptance criteria, code changes.
- Outputs: Tests, CI results, release report.

## Layers
| Layer | Tool | Scope |
|---|---|---|
| Unit | Vitest | scoring, taxonomy, validators, date math |
| Component | Vitest + Testing Library | UI behaviour via roles |
| Integration | Vitest + MSW | functions with mocked Claude/GitHub/sources |
| E2E | Playwright (skill: end-to-end-testing) | user journeys, offline, install |
| A11y | @axe-core/playwright | every route |
| Perf | Lighthouse CI | budgets |
| LLM | eval runner (skill: ai-evaluation) | extraction/explanations |

## Targets
Scoring + validators ≥ 95% lines; overall ≥ 80%; flaky rate < 1%; CI ≤ 15 min.

## CI gates (all required on PRs and on pushes to main)
lint → typecheck → unit → integration → build + secret scan → e2e + axe → Lighthouse CI → installability check.

## Rules
- Test behaviour, not implementation.
- Synthetic data only (ADR 0004).
- Never skip, disable or quarantine a test to go green; fix or escalate.
- A bug fix includes a test that fails without the fix.

## Definition of done
Tests added · coverage holds · axe 0 · keyboard pass · docs updated · ADR if a decision changed.

## Checklist
- [ ] Each acceptance criterion has a test
- [ ] Coverage targets hold
- [ ] No skipped tests
- [ ] Synthetic data only

## Common mistakes
- Testing implementation details
- Mocking so much that nothing real is tested
- Quarantining a flaky test instead of fixing it

## References
- https://vitest.dev/guide/ · https://mswjs.io/docs/
- docs/testing-and-accessibility.md
