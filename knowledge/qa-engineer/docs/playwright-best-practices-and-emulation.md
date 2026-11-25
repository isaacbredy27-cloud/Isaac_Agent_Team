# Playwright — best practices and emulation

Sources (read 2026-11-25): https://playwright.dev/docs/best-practices · https://playwright.dev/docs/emulation

## Best practices
- **Test user-visible behavior** — not function names or CSS classes.
- **Isolate tests** — each with its own storage, cookies and data.
- **Avoid testing third-party dependencies** — "Only test what you control"; mock with the Network API (`page.route`).
- **Use locators** (auto-wait, retry); prefer user-facing attributes (`getByRole`, `getByLabel`, `getByText`).
- **Web-first assertions**: `await expect(page.getByText('welcome')).toBeVisible()` waits; `isVisible()` does not.
- **Debug CI with the trace viewer**, traces "on the first retry of a failed test"; "We don't recommend setting this to on … it's very performance heavy." Consider sharding.

## Emulation (from the docs' snippets)
- Devices: `...devices['iPhone 13']`, `...devices['Desktop Chrome']`; set `viewport` or `isMobile` **after** spreading the device.
- `locale: 'en-GB'`, `timezoneId: 'Europe/Paris'`; `permissions: ['geolocation']`, `geolocation: {...}`.
- `colorScheme: 'dark'` (or `page.emulateMedia({ colorScheme: 'dark' })`).
- `reducedMotion: 'reduce'`, `forcedColors: 'active'`, `contrast: 'more'`.
- `offline: true` (or `context.setOffline(true)`).
