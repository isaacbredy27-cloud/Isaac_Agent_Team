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

## Auth tests (Supabase Auth, ADR 0006)
Synthetic users in a test Supabase project only. Required before the Agent Console ships:
- 401 without a token, with an expired token, wrong `alg` or wrong `iss`.
- 403 `forbidden` for `user` on every `agents-*` and `proposals-*` route (same body).
- 403 `mfa_required` for an aal1 `super_admin`; 403 `step_up_required` when the TOTP is older than 600 s.
- A role in `user_metadata` or the request body grants nothing.
- RLS: user A cannot read B's `profiles` row; `authenticated` cannot insert, update or delete `profiles`.
- Sign-up creates a `profiles` row with role `user`; deleting the auth user cascades.
- e2e: sign up, log in, log out, forgot password, Continue with Google (mocked with `page.route`).
- Secret scan fails on `sb_secret_` and `service_role` JWTs.

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
