---
name: apple-liquid-glass-design
description: Apple Liquid Glass visual style on the web — glass only on the controls/navigation layer (tab bar, nav bar, sheets), never on content, regular vs clear variants, 35% dimming layer over bright content, color applied sparingly, tokens in CSS, backdrop-filter cost, Reduce Transparency and Increase Contrast fallbacks. Use for visual design, tokens and component styling.
metadata:
  owner: ui-designer-apple-liquid-glass
  backups: [ux-designer-apple-hig, mobile-pwa-expert]
  version: 1.0.0
---

# Apple Liquid Glass Design

## Purpose
Give the app Apple's Liquid Glass look on the web while keeping text legible and the phone fast.

## Use when
- Defining or changing design tokens or materials
- Styling navigation, tab bars or sheets
- Reviewing a visual change

## Inputs → Outputs
- Inputs: Wren's flows, brand direction, accessibility constraints.
- Outputs: Tokens (CSS), component specs, icon set, visual QA notes.

## Principles (Apple HIG, Materials)
- Liquid Glass forms "a distinct functional layer for controls and navigation elements … that floats above the content layer."
- **Don't use Liquid Glass in the content layer.** Job cards, lists and backgrounds use standard (opaque/frosted) materials.
- Use it sparingly — only the most important functional elements.
- **Regular** variant (blur + luminosity) for text-heavy surfaces; **clear** only over visually rich media, with a **35% dark dimming layer** if content is bright.
- Color: by default glass takes color from content; tint sparingly; for a primary action tint the background, not the label.

## Web implementation
```css
:root {
  --glass-bg: rgb(255 255 255 / 0.62);
  --glass-border: rgb(255 255 255 / 0.5);
  --glass-blur: 20px;
}
.glass {
  background: var(--glass-bg);
  backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  -webkit-backdrop-filter: blur(var(--glass-blur)) saturate(160%);
  border: 1px solid var(--glass-border);
}
@media (prefers-reduced-transparency: reduce) { .glass { background: var(--surface-opaque); backdrop-filter: none; } }
@media (prefers-contrast: more) { .glass { background: var(--surface-opaque); border-color: var(--text-primary); } }
@supports not (backdrop-filter: blur(1px)) { .glass { background: var(--surface-opaque); } }
```

## Score badge tokens
Green `#1B7F3B` · Amber text `#8A5A00` on `#FFF4D6` · Red `#B42318` — each with icon (● ◐ ○) and label; verify contrast in light/dark.

## Checklist
- [ ] Glass only on tab bar, top bar, sheets
- [ ] Text on glass passes 4.5:1 over worst-case content (skill: accessibility-wcag)
- [ ] Opaque fallbacks for reduced transparency / increased contrast / no support
- [ ] INP within budget on mid-range Android (skill: performance-optimization)
- [ ] Original icons only; no Apple logos or SF Symbols assets

## Common mistakes
- Glass on job cards or page backgrounds
- Clear glass behind text without a dimming layer
- No opaque fallback for reduced transparency or increased contrast
- Heavy blur on many elements at once (INP regressions)

## References
- https://developer.apple.com/design/human-interface-guidelines/materials
- https://developer.apple.com/design/human-interface-guidelines/color
- https://developer.mozilla.org/en-US/docs/Web/CSS/backdrop-filter
