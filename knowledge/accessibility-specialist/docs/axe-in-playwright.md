# Automated accessibility scans — notes

Source: https://playwright.dev/docs/accessibility-testing (read 2026-11-25)

- `@axe-core/playwright`: `new AxeBuilder({ page }).withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa']).analyze()`; assert `violations` equals `[]`.
- Scan revealed UI after interacting and waiting; `.include()` to scope; `.exclude()` / `.disableRules()` only temporarily for known issues.
- "Automated testing cannot detect all types of WCAG violations" → manual keyboard, VoiceOver and TalkBack passes are still required.
