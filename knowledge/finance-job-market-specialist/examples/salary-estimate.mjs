// Worked example: show an honest salary estimate when a posting has none, from BLS OEWS Orlando percentiles.
// Rule: analyst roles show the 25th–75th percentile band; senior roles show median–90th. Always labelled as an estimate.
// Run: node salary-estimate.mjs
import assert from "node:assert/strict";

const OEWS_ORLANDO_MAY2025 = { // series OEUM0036740000000{SOC}{11..15}; annual wages
  "13-2051": { p10: 61600, p25: 71890, median: 90020, p75: 115570, p90: 140150, mean: 98990 },
};
const SOC_FOR_TITLE = { financial_analyst: "13-2051", senior_financial_analyst: "13-2051", fpa_analyst: "13-2051" };
const k = (n) => `$${Math.round(n / 1000)}k`;

export function salaryDisplay(job) {
  if (job.salary?.source === "posted") return { text: `${k(job.salary.min)}–${k(job.salary.max)} (posted)`, estimate: false };
  const soc = SOC_FOR_TITLE[job.titleNormalized];
  const w = OEWS_ORLANDO_MAY2025[soc];
  if (!w) return { text: "Salary not listed", estimate: false };
  const senior = job.titleNormalized.startsWith("senior");
  const lo = senior ? w.median : w.p25;
  const hi = senior ? w.p90 : w.p75;
  return { text: `Typical Orlando range ${k(lo)}–${k(hi)} (BLS, May 2025, estimate)`, estimate: true, soc };
}

const posted = salaryDisplay({ titleNormalized: "financial_analyst", salary: { source: "posted", min: 80000, max: 95000 } });
const analyst = salaryDisplay({ titleNormalized: "financial_analyst" });
const senior = salaryDisplay({ titleNormalized: "senior_financial_analyst" });
assert.equal(posted.text, "$80k–$95k (posted)");
assert.equal(analyst.text, "Typical Orlando range $72k–$116k (BLS, May 2025, estimate)");
assert.equal(senior.text, "Typical Orlando range $90k–$140k (BLS, May 2025, estimate)");
console.log([posted, analyst, senior]);
console.log("OK: posted pay shown as posted; missing pay shown as a labelled BLS estimate band");
