// Worked example: is text on our regular glass legible over worst-case content? Composite the glass colour over
// backgrounds that scroll beneath the tab bar, then check WCAG 4.5:1. Also shows when Apple's 35% dimming is needed
// for a CLEAR (highly translucent) variant. Run: node glass-legibility.mjs
import assert from "node:assert/strict";

const hex = (h) => [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16));
const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = ([r, g, b]) => 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
const over = (fg, a, bg) => fg.map((c, i) => Math.round(c * a + bg[i] * (1 - a)));

const worstBackgrounds = { white: "#FFFFFF", brandNavy: "#0B1F33", mediumGray: "#777777", sunsetPhoto: "#E8823A" };
const regularGlass = { rgb: [255, 255, 255], alpha: 0.72 };   // --glass-bg (light) — blur ignored: conservative
const clearGlass = { rgb: [255, 255, 255], alpha: 0.15 };
const text = hex("#111418");

const check = (glass, dim = 0) => Object.fromEntries(Object.entries(worstBackgrounds).map(([k, bg]) => {
  let base = hex(bg); if (dim) base = over([0, 0, 0], dim, base);
  return [k, +ratio(text, over(glass.rgb, glass.alpha, base)).toFixed(2)];
}));
const regular = check(regularGlass);
assert.ok(Object.values(regular).every((r) => r >= 4.5), JSON.stringify(regular));
const clear = check(clearGlass);
assert.ok(Object.values(clear).some((r) => r < 4.5), "clear glass fails somewhere → not for text-heavy UI");
console.log({ regularGlassDarkText: regular, clearGlassDarkText: clear });
console.log("OK: regular glass keeps dark text ≥ 4.5:1 over every worst-case background; clear glass does not → use regular for tab/nav bars");
