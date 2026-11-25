// Worked example: enforce module boundaries from skill system-architecture by scanning imports.
// packages/scoring must be pure (no I/O, no SDKs); apps/web must never import server SDKs or read secrets.
// Run: node boundary-check.mjs
import assert from "node:assert/strict";

const RULES = {
  "packages/scoring": { forbid: [/^node:(fs|http|https|net|child_process)$/, /^@netlify\//, /^@anthropic-ai\//, /^fs$/], forbidText: [/process\.env/, /\bfetch\(/] },
  "packages/schemas": { forbid: [/^@netlify\//, /^@anthropic-ai\//], forbidText: [] },
  "apps/web": { forbid: [/^@anthropic-ai\//, /^@netlify\/blobs$/], forbidText: [/process\.env\.(ANTHROPIC|GITHUB|DATA_KEY|INTERNAL)/] },
};
const importsOf = (src) => [...src.matchAll(/(?:import\s[^'"]*from\s*|import\s*\(\s*|require\(\s*)['"]([^'"]+)['"]/g)].map((m) => m[1]);

export function check(files) {
  const problems = [];
  for (const [path, src] of Object.entries(files)) {
    const rule = Object.entries(RULES).find(([p]) => path.startsWith(p + "/"))?.[1];
    if (!rule) continue;
    for (const imp of importsOf(src)) if (rule.forbid.some((r) => r.test(imp))) problems.push(`${path}: forbidden import ${imp}`);
    for (const r of rule.forbidText) if (r.test(src)) problems.push(`${path}: forbidden use ${r}`);
  }
  return problems;
}

const sample = {
  "packages/scoring/score.ts": `import { z } from "zod";\nimport type { MatchResult } from "../schemas/match";\nexport const score = () => 1;`,
  "packages/scoring/bad.ts": `import { readFileSync } from "node:fs";\nconst k = process.env.ANTHROPIC_API_KEY;`,
  "apps/web/src/app/explain.ts": `import Anthropic from "@anthropic-ai/sdk";`,
  "netlify/functions/match.ts": `import Anthropic from "@anthropic-ai/sdk";\nconst k = process.env.ANTHROPIC_API_KEY;`,
};
const problems = check(sample);
assert.deepEqual(problems, [
  "packages/scoring/bad.ts: forbidden import node:fs",
  "packages/scoring/bad.ts: forbidden use /process\\.env/",
  "apps/web/src/app/explain.ts: forbidden import @anthropic-ai/sdk",
]);
console.log(problems);
console.log("OK: pure scoring and client/server split enforced; functions may use the SDK and secrets");
