# WCAG 2.2 — contrast (1.4.3) and target size (2.5.8)

Sources (read 2026-11-24/25): https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html · https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html

## 1.4.3 Contrast (Minimum), AA
- Text and images of text: at least **4.5:1**; large-scale text **3:1**. Exceptions: incidental (inactive, decorative, invisible), logotypes.
- Large = 18 point, or 14 point bold; "1pt = 1.333px, therefore 14pt and 18pt are equivalent to approximately 18.5px and 24px."
- Thresholds are not rounded: "4.499:1 would not meet the 4.5:1 threshold."
- Contrast ratio `(L1 + 0.05) / (L2 + 0.05)`, L1 = lighter. Relative luminance `L = 0.2126 R + 0.7152 G + 0.0722 B`, each channel `c/12.92` if `c ≤ 0.04045`, else `((c + 0.055)/1.055)^2.4` (the old 0.03928 value "has no practical effect").

## 2.5.8 Target Size (Minimum), AA
- "The size of the target for pointer inputs is at least 24 by 24 CSS pixels", except: Spacing (24 px circles don't intersect), Equivalent control, Inline in text, User-agent controlled, Essential.
- 2.5.5 Target Size (Enhanced) uses 44 × 44 CSS px — "authors are encouraged to aim for" it for important controls. Our standard: 44 × 44 for primary controls.
