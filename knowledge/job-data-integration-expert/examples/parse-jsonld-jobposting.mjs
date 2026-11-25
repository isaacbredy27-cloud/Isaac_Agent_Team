// Worked example: extract a schema.org JobPosting from a career page's JSON-LD (Tier 2 sources).
// The HTML below follows Google's documented JobPosting example, adapted to an Orlando finance role.
// Run: node parse-jsonld-jobposting.mjs
import assert from "node:assert/strict";

const html = `<!doctype html><html><head><title>Senior Financial Analyst</title>
<script type="application/ld+json">
{ "@context": "https://schema.org/", "@type": "JobPosting",
  "title": "Senior Financial Analyst",
  "description": "<p>Own the monthly variance analysis. Bachelor's degree required. CPA preferred.</p>",
  "identifier": { "@type": "PropertyValue", "name": "Example Co", "value": "R-00250" },
  "datePosted": "2026-11-17", "validThrough": "2027-01-17T00:00",
  "employmentType": "FULL_TIME",
  "hiringOrganization": { "@type": "Organization", "name": "Example Co" },
  "jobLocation": { "@type": "Place", "address": { "@type": "PostalAddress", "addressLocality": "Orlando", "addressRegion": "FL", "addressCountry": "US" } },
  "baseSalary": { "@type": "MonetaryAmount", "currency": "USD", "value": { "@type": "QuantitativeValue", "minValue": 85000, "maxValue": 105000, "unitText": "YEAR" } },
  "educationRequirements": { "@type": "EducationalOccupationalCredential", "credentialCategory": "bachelor degree" },
  "experienceRequirements": { "@type": "OccupationalExperienceRequirements", "monthsOfExperience": "36" },
  "experienceInPlaceOfEducation": false }
</script></head><body>…</body></html>`;

export function extractJobPostings(html, now = new Date()) {
  const blocks = [...html.matchAll(/<script[^>]+type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)].map((m) => m[1]);
  const out = [];
  for (const b of blocks) {
    let data; try { data = JSON.parse(b); } catch { continue; }
    const nodes = Array.isArray(data) ? data : data["@graph"] ?? [data];
    for (const n of nodes.filter((x) => x?.["@type"] === "JobPosting")) {
      const v = n.baseSalary?.value ?? {};
      out.push({
        title: n.title,
        requisitionId: n.identifier?.value,
        employerName: n.hiringOrganization?.name,
        city: n.jobLocation?.address?.addressLocality, state: n.jobLocation?.address?.addressRegion,
        remote: n.jobLocationType === "TELECOMMUTE",
        postedAt: n.datePosted,
        closed: n.validThrough ? new Date(n.validThrough) < now : false,
        salary: n.baseSalary ? { min: v.minValue ?? v.value, max: v.maxValue ?? v.value, period: v.unitText, currency: n.baseSalary.currency, source: "posted" } : undefined,
        minYears: n.experienceRequirements?.monthsOfExperience ? Number(n.experienceRequirements.monthsOfExperience) / 12 : undefined,
        education: n.educationRequirements?.credentialCategory,
        educationEquivalence: n.experienceInPlaceOfEducation === true,
        descriptionText: String(n.description ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim(),
      });
    }
  }
  return out;
}

const [job] = extractJobPostings(html, new Date("2026-11-25"));
assert.equal(job.requisitionId, "R-00250");
assert.equal(job.minYears, 3);
assert.deepEqual(job.salary, { min: 85000, max: 105000, period: "YEAR", currency: "USD", source: "posted" });
assert.equal(job.closed, false);
console.log(JSON.stringify(job, null, 2));
console.log("OK: JSON-LD JobPosting parsed (3 yrs, bachelor, $85k–$105k, open)");
