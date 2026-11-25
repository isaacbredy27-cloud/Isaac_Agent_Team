// Worked example: good taxonomy entries and the checks every entry must pass (skill: skill-taxonomy).
// The aliases come from phrases seen in real Orlando postings (XLOOKUP/VBA at Berkadia; Deltek Costpoint/EVM at AMERICAN SYSTEMS).
// Run: node taxonomy-entry.mjs
import assert from "node:assert/strict";

const skills = {
  excel_advanced: { label: "Advanced Excel", category: "tool", aliases: ["excel", "ms excel", "pivot tables", "vlookup", "xlookup", "index match", "power query", "vba"], related: { financial_modeling: 0.5 } },
  financial_modeling: { label: "Financial modeling", category: "domain", aliases: ["financial model", "3 statement model", "three statement model", "dcf", "lbo model"], related: { excel_advanced: 0.5 } },
  deltek_costpoint: { label: "Deltek Costpoint", category: "tool", aliases: ["costpoint", "deltek costpoint"], related: { evm: 0.4 } },
  evm: { label: "Earned value management", category: "domain", aliases: ["evm", "earned value", "eac", "etc"], related: { deltek_costpoint: 0.4 } },
};

const KEEP = new Set("abcdefghijklmnopqrstuvwxyz0123456789 ");
const norm = (s) => [...s.normalize("NFKC").toLowerCase()].map((ch) => (KEEP.has(ch) ? ch : " ")).join("").split(" ").filter(Boolean).join(" ");

export function lookup(phrase) {
  const n = norm(phrase);
  for (const [id, s] of Object.entries(skills)) {
    if (norm(s.label) === n || s.aliases.map(norm).includes(n)) return id;
  }
  return null;
}

const seen = new Map();
for (const [id, s] of Object.entries(skills)) {
  for (const a of s.aliases.map(norm)) {
    assert.ok(!seen.has(a), `alias "${a}" duplicated in ${id} and ${seen.get(a)}`);
    seen.set(a, id);
  }
  for (const [r, w] of Object.entries(s.related)) {
    assert.ok(skills[r], `${id} links to unknown ${r}`);
    assert.ok(w >= 0.3 && w <= 0.8, `${id}→${r} weight ${w}`);
  }
}
assert.equal(lookup("XLOOKUP"), "excel_advanced");
assert.equal(lookup("Deltek Costpoint"), "deltek_costpoint");
assert.equal(lookup("3-statement model"), "financial_modeling");
assert.equal(lookup("underwater basket weaving"), null);
console.log("OK: aliases unique, related weights 0.3–0.8, real posting phrases map to canonical ids");
