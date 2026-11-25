---
name: job-posting-structured-data
description: Parsing schema.org JobPosting JSON-LD from employer career pages — title, description, datePosted, validThrough, hiringOrganization, jobLocation, jobLocationType TELECOMMUTE, employmentType, baseSalary (minValue/maxValue, unitText), identifier, educationRequirements, experienceRequirements.monthsOfExperience. Use for Tier 2 sources and any page parser.
metadata:
  owner: job-data-integration-expert
  backups: [resume-analysis-expert]
  version: 1.0.0
---

# JobPosting Structured Data

## Use when
- Parsing a Tier 2 career page
- Validating employer markup

## Inputs → Outputs
- Inputs: Posting page HTML.
- Outputs: Zero or more NormalizedJob candidates.

## Purpose
One portable parser for many ATS vendors and custom career sites.

## Extract
- Find `<script type="application/ld+json">`; parse each; accept objects or `@graph` arrays with `@type: "JobPosting"`.
- Map: `title`; `description` (HTML → text); `datePosted`; `validThrough` (past → closed); `hiringOrganization.name`; `jobLocation.address.{addressLocality,addressRegion}`; `jobLocationType === "TELECOMMUTE"` → remote; `employmentType`; `identifier.value` → requisitionId.
- Salary: `baseSalary.value.{value | minValue,maxValue}` with `unitText` (HOUR/DAY/WEEK/MONTH/YEAR) and `baseSalary.currency`.
- Experience: `experienceRequirements.monthsOfExperience / 12`. Education: `educationRequirements.credentialCategory`. `experienceInPlaceOfEducation: true` → education equivalence allowed.

## Rules
- Validate with Zod; drop malformed postings, log a count (no content).
- Google requires the structured data to match the visible page; if they differ, trust visible text for requirements.

## Checklist
- [ ] Handles object, array and @graph forms
- [ ] Salary unitText mapped
- [ ] validThrough in the past marks closed
- [ ] Zod validation

## Common mistakes
- Assuming one JSON-LD block per page
- Treating monthsOfExperience as years
- Trusting JSON-LD over visible text when they differ

## References
- https://developers.google.com/search/docs/appearance/structured-data/job-posting
- https://schema.org/JobPosting
