---
name: end-to-end-testing
description: Playwright end-to-end testing — device projects (iPhone/WebKit, Pixel/Chromium, desktop), web-first assertions, getByRole locators, isolated tests, page.route mocks for third parties, offline and reduced-motion emulation, axe scans, traces on first retry (--trace off locally by default). Use when writing or debugging e2e tests.
metadata:
  owner: qa-engineer
  backups: [mobile-pwa-expert, accessibility-specialist]
  version: 1.0.0
---

# End-to-End Testing (Playwright)

## Purpose
Prove the critical user journeys work in real browsers on phone and desktop.

## Use when
- Adding or changing a user-facing flow
- Debugging a flaky or failing e2e test

## Inputs → Outputs
- Inputs: Built app (local or Deploy Preview), journey list, mocks.
- Outputs: Passing tests across device projects, axe results, traces on failure.

## Config sketch
```ts
import { defineConfig, devices } from "@playwright/test";
export default defineConfig({
  retries: process.env.CI ? 1 : 0,
  use: { baseURL: process.env.BASE_URL ?? "http://localhost:8888", trace: "on-first-retry" },
  projects: [
    { name: "iphone", use: { ...devices["iPhone 13"] } },
    { name: "pixel", use: { ...devices["Pixel 7"] } },
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
  ],
});
```

## Practices (Playwright docs)
- Test user-visible behaviour; prefer `getByRole`, `getByLabel`, `getByText`.
- Web-first assertions: `await expect(locator).toBeVisible()` (auto-wait).
- Isolate tests (own storage/cookies).
- Don't test third parties: mock Claude, GitHub and job boards with `page.route`.
- Traces on first retry in CI; locally run with `--trace off` and enable to debug.
- Emulate: `offline: true`, `colorScheme: "dark"`, `reducedMotion: "reduce"`, `contrast: "more"`, `locale`, `timezoneId: "America/New_York"`.

## Critical journeys
Upload → review → matches · each filter + URL persistence · job detail + Apply new tab · save → offline → visible · install (Chromium installability API; iOS sheet in WebKit) · admin console chat → proposal → approve (mocked) · user blocked from admin · delete my data.

## Checklist
- [ ] Role-based locators
- [ ] Third parties mocked
- [ ] Runs on iPhone, Pixel and desktop projects
- [ ] axe scan included
- [ ] No sleeps; web-first assertions only

## Common mistakes
- CSS selectors tied to implementation
- `waitForTimeout` instead of assertions
- Hitting live Claude or job boards in CI
- Traces on for every test (slow)

## References
- https://playwright.dev/docs/best-practices
- https://playwright.dev/docs/emulation
- https://playwright.dev/docs/accessibility-testing
