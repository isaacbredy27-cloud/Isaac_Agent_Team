# JobPosting structured data — notes

Sources: https://developers.google.com/search/docs/appearance/structured-data/job-posting (last updated 2026-09-08) and https://schema.org/JobPosting (read 2026-11-24).

- Employers embed `<script type="application/ld+json">` with `"@type": "JobPosting"`.
- Google-required for eligibility: `title`, `description`, `datePosted`, `hiringOrganization`, and `jobLocation` (or remote markup).
- `jobLocationType: "TELECOMMUTE"` marks work-from-home jobs; pair with `applicantLocationRequirements`.
- `baseSalary`: `MonetaryAmount` with `currency` and `value` (`QuantitativeValue` with `value` **or** `minValue`/`maxValue`, and `unitText` one of `HOUR`, `DAY`, `WEEK`, `MONTH`, `YEAR`). "The actual base salary … as provided by the employer (not an estimate)."
- `validThrough`: expiry date; omit if unknown; remove or past-date filled jobs.
- `identifier`: `{ "@type": "PropertyValue", "name": …, "value": "1234567" }` — the employer's ID.
- Beta education/experience: `educationRequirements.credentialCategory` (e.g. "bachelor degree"), `experienceRequirements.monthsOfExperience`, and `experienceInPlaceOfEducation` (true = either satisfies).
