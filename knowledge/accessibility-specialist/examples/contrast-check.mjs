// Worked example: WCAG 1.4.3 contrast for our score-badge tokens (W3C formula, no rounding).
// Run: node contrast-check.mjs
import assert from "node:assert/strict";

const lin = (c) => { c /= 255; return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * lin(n >> 16) + 0.7152 * lin((n >> 8) & 255) + 0.0722 * lin(n & 255); };
export const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

assert.equal(ratio("#000000", "#FFFFFF").toFixed(1), "21.0");
const tokens = [
  ["Strong Match text", "#1B7F3B", "#FFFFFF", 4.5],
  ["Moderate Match text", "#8A5A00", "#FFF4D6", 4.5],
  ["Weak Match text", "#B42318", "#FFFFFF", 4.5],
  ["Pure yellow on white (rejected)", "#FFD60A", "#FFFFFF", 4.5],
];
const rows = tokens.map(([name, fg, bg, min]) => ({ name, ratio: +ratio(fg, bg).toFixed(2), pass: ratio(fg, bg) >= min }));
assert.deepEqual(rows.map((r) => r.pass), [true, true, true, false]);
console.table(rows);
console.log("OK: green/amber/red badge tokens pass 4.5:1; pure yellow fails, so amber uses dark text on a light chip");
