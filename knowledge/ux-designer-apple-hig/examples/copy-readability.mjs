// Worked example: check UX copy against our standards — Flesch-Kincaid grade ≤ 8, ≤ 20 words per sentence,
// no blame words. Run: node copy-readability.mjs
import { readFileSync } from "node:fs";
import assert from "node:assert/strict";

const syllables = (w) => { w = w.toLowerCase().replace(/[^a-z]/g, ""); if (w.length <= 3) return 1;
  w = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "").replace(/^y/, ""); return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length); };
export function grade(text) {
  const sentences = text.split(/[.!?]+/).filter((s) => s.trim()).length;
  const words = text.split(/\s+/).filter((w) => /[a-z]/i.test(w));
  const syl = words.reduce((a, w) => a + syllables(w), 0);
  return 0.39 * (words.length / sentences) + 11.8 * (syl / words.length) - 15.59;
}
const copy = JSON.parse(readFileSync(new URL("./copy-catalog.json", import.meta.url)));
const rows = Object.entries(copy).map(([key, text]) => ({ key, grade: +grade(text).toFixed(1), longest: Math.max(...text.split(/[.!?]/).map((s) => s.split(/\s+/).filter(Boolean).length)) }));
for (const r of rows) { assert.ok(r.grade <= 8, `${r.key} grade ${r.grade}`); assert.ok(r.longest <= 20, r.key); }
assert.ok(!Object.values(copy).some((t) => /\b(invalid|illegal|failed you|you must)\b/i.test(t)), "no blaming language");
assert.ok(grade("Utilization of the aforementioned functionality necessitates comprehensive authentication procedures.") > 12, "sanity: jargon scores high");
console.table(rows);
console.log(`OK: ${rows.length} strings at grade ≤ 8 with sentences ≤ 20 words`);
