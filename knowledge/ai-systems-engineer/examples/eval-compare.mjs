// Worked example: compare a baseline and a candidate prompt on a frozen, labelled eval set, and gate the change.
// Metrics: required/preferred split accuracy, hard-gate recall (must be 100%). Run: node eval-compare.mjs
import assert from "node:assert/strict";

const gold = [ // synthetic labels for 4 postings
  { id: "p1", required: ["excel_advanced", "fpa"], preferred: ["anaplan"], gates: ["clearance:secret"] },
  { id: "p2", required: ["credit_analysis"], preferred: ["sql"], gates: [] },
  { id: "p3", required: ["deltek_costpoint"], preferred: ["evm"], gates: ["clearance:secret"] },
  { id: "p4", required: ["excel_advanced"], preferred: ["cpa"], gates: ["license:series_7"] },
];
const baseline = { // recorded outputs of prompt v3
  p1: { required: ["excel_advanced", "fpa", "anaplan"], preferred: [], gates: ["clearance:secret"] },
  p2: { required: ["credit_analysis"], preferred: ["sql"], gates: [] },
  p3: { required: ["deltek_costpoint", "evm"], preferred: [], gates: [] },
  p4: { required: ["excel_advanced"], preferred: ["cpa"], gates: ["license:series_7"] },
};
const candidate = { // recorded outputs of prompt v4
  p1: { required: ["excel_advanced", "fpa"], preferred: ["anaplan"], gates: ["clearance:secret"] },
  p2: { required: ["credit_analysis"], preferred: ["sql"], gates: [] },
  p3: { required: ["deltek_costpoint"], preferred: ["evm"], gates: ["clearance:secret"] },
  p4: { required: ["excel_advanced", "cpa"], preferred: [], gates: ["license:series_7"] },
};

export function evaluate(outputs) {
  let splitHits = 0, splitTotal = 0, gateHits = 0, gateTotal = 0;
  for (const g of gold) {
    const o = outputs[g.id];
    for (const s of g.required) { splitTotal++; if (o.required.includes(s)) splitHits++; }
    for (const s of g.preferred) { splitTotal++; if (o.preferred.includes(s)) splitHits++; }
    for (const x of g.gates) { gateTotal++; if (o.gates.includes(x)) gateHits++; }
  }
  return { splitAccuracy: +(splitHits / splitTotal).toFixed(3), gateRecall: +(gateHits / gateTotal).toFixed(3) };
}
const b = evaluate(baseline), c = evaluate(candidate);
const ship = c.gateRecall === 1 && c.splitAccuracy >= b.splitAccuracy - 0.01;
assert.deepEqual(b, { splitAccuracy: 0.778, gateRecall: 0.667 }); // 7 of 9 labelled skills; 2 of 3 gates
assert.deepEqual(c, { splitAccuracy: 0.889, gateRecall: 1 });     // 8 of 9; 3 of 3
assert.equal(ship, true);
console.log({ baseline: b, candidate: c, ship });
console.log("OK: candidate improves split accuracy 0.778 → 0.889 and reaches 100% gate recall → may ship (with lead's approval)");
