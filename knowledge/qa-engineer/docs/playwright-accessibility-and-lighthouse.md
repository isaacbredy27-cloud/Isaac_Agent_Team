# Accessibility testing in Playwright; Lighthouse PWA removal

Sources (read 2026-11-25): https://playwright.dev/docs/accessibility-testing · https://github.com/GoogleChrome/lighthouse/blob/main/changelog.md · https://progressivewebapps.com/blog/auditing-pwas-after-lighthouse-dropped-the-pwa-category/

## @axe-core/playwright
```js
import AxeBuilder from '@axe-core/playwright';
const results = await new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze();
expect(results.violations).toEqual([]);
```
- `.include(selector)` to scan part of a page (wait for the UI state first); `.exclude(selector)` for a known issue; `.disableRules(['duplicate-id'])` temporarily.
- "Note that automated testing cannot detect all types of WCAG violations."

## Lighthouse
- 12.0.0 (2024-04-22): "As per Chrome's updated Installability Criteria, Lighthouse has removed the PWA category."
- Replacement: DevTools Application → Manifest → Installability, or CDP `Page.getInstallabilityErrors` in CI; Lighthouse CI for performance, accessibility, best practices, SEO.
