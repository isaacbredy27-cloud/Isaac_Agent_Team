---
name: accessibility-wcag
description: WCAG 2.2 AA for Finance Match Orlando — contrast 4.5:1 / 3:1 (large = 18 pt or 14 pt bold ≈ 24 px / 18.5 px), never color alone, target size ≥ 24×24 CSS px (we use 44×44), keyboard, focus, status messages, reduced motion/transparency, axe-core in Playwright, manual VoiceOver/TalkBack. Use for any UI change or accessibility review.
metadata:
  owner: accessibility-specialist
  backups: [qa-engineer, ux-designer-apple-hig]
  version: 1.0.0
---

# Accessibility (WCAG 2.2 AA)

## Use when
- Any UI, design token, copy or component change
- Release accessibility sign-off
- A user reports an assistive-technology problem

## Inputs → Outputs
- Inputs: Designs, built pages, axe results, AT test notes.
- Outputs: Pass/fail per success criterion, fix list with SC numbers, conformance report.

## Purpose
Everyone can find, understand and apply to jobs.

## Key criteria
| SC | Rule | Our standard |
|---|---|---|
| 1.4.1 | Color not the only cue | Band = icon + text + color |
| 1.4.3 | Text contrast 4.5:1; large text 3:1 | Thresholds not rounded (4.499 fails) |
| 1.4.11 | UI component contrast 3:1 | Focus rings, slider tracks, chips |
| 1.4.10 | Reflow at 320 px | Single column |
| 2.1.1 | Keyboard | Filters, sliders, diff viewer, chat |
| 2.4.7 / 2.4.11 | Focus visible / not obscured | Scroll padding under sticky bars |
| 2.5.8 | Target ≥ 24×24 CSS px | Primary controls 44×44 (Apple HIG default 44 pt) |
| 4.1.3 | Status messages | `aria-live` for upload, task progress, result counts |

## Contrast formula (W3C)
`(L1 + 0.05) / (L2 + 0.05)`; `L = 0.2126 R + 0.7152 G + 0.0722 B`; channel `c/12.92` if `c ≤ 0.04045`, else `((c+0.055)/1.055)^2.4`.

## Liquid Glass checks
- Measure text contrast over the **worst-case** content behind glass, or use the opaque fallback.
- Honour `prefers-reduced-transparency`, `prefers-contrast: more`, `prefers-reduced-motion`.

## Testing
- `@axe-core/playwright` with `withTags(['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa'])` on every route; 0 violations.
- Automated tests can't find everything: manual keyboard pass + VoiceOver (iOS) + TalkBack (Android) each release.

## Checklist
- [ ] Contrast checked in light, dark, increased contrast
- [ ] Icon+text on every status
- [ ] Keyboard path + visible focus
- [ ] Screen reader names ("86, Strong Match")
- [ ] axe 0 violations

## Best practices
- Review at design time, not after build
- Name every control the way a screen reader should say it
- Prefer native HTML elements over ARIA
- Test with the real device screen reader each release

## Common mistakes
- Trusting axe alone (it cannot see meaning or order)
- Rounding 4.49:1 up to pass
- Hiding focus outlines for looks
- Measuring contrast on glass over a plain background only

## References
- https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html
- https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- https://playwright.dev/docs/accessibility-testing
- https://developer.apple.com/design/human-interface-guidelines/accessibility
