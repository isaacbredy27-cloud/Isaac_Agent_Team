// Worked example: adverse-impact ratio on SYNTHETIC cohorts that differ only by a suspected proxy (employment gap).
// Rule: 29 CFR 1607.4(D) — ratio < 0.8 is evidence of adverse impact. Run: node four-fifths-check.mjs
import assert from "node:assert/strict";

export function impactRatio(groups) { // groups: { name: { selected, total } }, "selected" = Green matches
  const rates = Object.fromEntries(Object.entries(groups).map(([k, v]) => [k, v.selected / v.total]));
  const top = Math.max(...Object.values(rates));
  return Object.fromEntries(Object.entries(rates).map(([k, r]) => [k, { rate: +r.toFixed(3), ratio: +(r / top).toFixed(3), flag: r / top < 0.8 }]));
}

// Weights v1 (gap-neutral) vs a hypothetical v2 that learned to penalise gaps from biased outcome data.
const v1 = impactRatio({ noGap: { selected: 42, total: 100 }, gap: { selected: 40, total: 100 } });
const v2 = impactRatio({ noGap: { selected: 45, total: 100 }, gap: { selected: 30, total: 100 } });
assert.equal(v1.gap.flag, false);
assert.equal(v2.gap.flag, true);
console.log({ v1, v2 });
console.log(`OK: v1 ratio ${v1.gap.ratio} passes; v2 ratio ${v2.gap.ratio} < 0.8 → block weight change for review`);
