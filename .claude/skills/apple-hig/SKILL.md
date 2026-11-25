---
name: apple-hig
description: Apple Human Interface Guidelines applied to a web PWA — tab bars for navigation (not actions, single-word labels, always visible), sheets (one at a time, medium/large detents, grabber, Cancel with Done), 44×44 pt controls (28 min), Dynamic Type, Reduce Motion, color guidance. Use for flows, navigation, sheets and interaction design.
metadata:
  owner: ux-designer-apple-hig
  backups: [ui-designer-apple-liquid-glass, mobile-pwa-expert]
  version: 1.0.0
---

# Apple HIG (for our PWA)

## Use when
- Designing a screen, navigation, sheet or control
- Translating an iOS pattern to the web

## Inputs → Outputs
- Inputs: Feature goal, user task, platform constraints.
- Outputs: Flow and interaction spec using HIG patterns with web equivalents.

## Purpose
Feel native on iPhone while staying usable on Android and desktop.

## Navigation
- Tab bar: **navigation, not actions**; keep visible across sections; single-word labels (Matches · Saved · Gaps · Profile); badges only for critical info; explain empty sections.
- Tab bar floats on Liquid Glass above content (skill: apple-liquid-glass-design).

## Sheets (filters, install instructions)
- One sheet at a time; close one before opening another.
- Detents: medium (~half) + large; include a grabber (also works with VoiceOver).
- Pair Done with Cancel; support swipe to dismiss; confirm if unsaved changes.
- Keep sheet tasks brief.

## Controls and text
- Control size: default 44×44 pt, minimum 28×28 pt (iOS). We use 44.
- Let text scale to 200%.
- Contrast table (HIG): ≤ 17 pt 4.5:1; 18 pt or bold 3:1.
- Reduce Motion: cut automatic and repetitive animation.

## Color
- Don't use color alone; use the same color for one meaning only; supply light, dark and increased-contrast variants.

## Web translation
| HIG | Web |
|---|---|
| Tab bar | fixed `<nav>` with `aria-current="page"` |
| Sheet + detents | `<dialog>` with CSS heights 50vh / 90vh |
| Dynamic Type | `rem` units, respect browser zoom |
| SF Symbols | original SVG icons (SF Symbols licensing doesn't cover web use) |

## Best practices
- Navigation in the tab bar, actions in the content
- One sheet at a time
- 44 pt targets
- Support Dynamic Type equivalents (rem, zoom) and Reduce Motion

## Checklist
- [ ] Tab bar labels are single words
- [ ] Sheets have Cancel with Done and a grabber
- [ ] Every state (empty, loading, error) designed
- [ ] Works on Android and desktop too

## Common mistakes
- Putting actions in the tab bar
- Stacking sheets
- Copying SF Symbols or Apple branding
- Designing only for iPhone

## References
- https://developer.apple.com/design/human-interface-guidelines/tab-bars
- https://developer.apple.com/design/human-interface-guidelines/sheets
- https://developer.apple.com/design/human-interface-guidelines/accessibility
- https://developer.apple.com/design/human-interface-guidelines/color
