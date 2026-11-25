// Worked example: turn task dependencies into parallel "waves" (fan-out) and detect cycles — how the orchestrator
// decides what can run at once and what must be chained. Run: node plan-waves.mjs
import assert from "node:assert/strict";

export function waves(tasks) {
  const remaining = new Map(tasks.map((t) => [t.id, new Set(t.dependsOn)]));
  const out = [];
  while (remaining.size) {
    const ready = [...remaining].filter(([, deps]) => deps.size === 0).map(([id]) => id).sort();
    if (!ready.length) throw new Error("dependency cycle: " + [...remaining.keys()].join(", "));
    out.push(ready);
    for (const id of ready) remaining.delete(id);
    for (const deps of remaining.values()) for (const id of ready) deps.delete(id);
  }
  return out;
}

const plan = [
  { id: "schema-salary", owner: "software-architect", dependsOn: [] },
  { id: "lever-terms", owner: "privacy-compliance-specialist", dependsOn: [] },
  { id: "lever-connector", owner: "job-data-integration-expert", dependsOn: ["schema-salary", "lever-terms"] },
  { id: "salary-ui", owner: "mobile-pwa-expert", dependsOn: ["lever-connector"] },
  { id: "salary-copy", owner: "ux-designer-apple-hig", dependsOn: ["schema-salary"] },
  { id: "qa-release", owner: "qa-engineer", dependsOn: ["salary-ui", "salary-copy"] },
];
const w = waves(plan);
assert.deepEqual(w, [["lever-terms", "schema-salary"], ["lever-connector", "salary-copy"], ["salary-ui"], ["qa-release"]]);
assert.throws(() => waves([{ id: "a", dependsOn: ["b"] }, { id: "b", dependsOn: ["a"] }]), /cycle/);
w.forEach((ids, i) => console.log(`wave ${i + 1}: ${ids.map((id) => `${id} (${plan.find((t) => t.id === id).owner})`).join(" ∥ ")}`));
console.log(`OK: ${plan.length} tasks scheduled in ${w.length} waves; cycles rejected`);
