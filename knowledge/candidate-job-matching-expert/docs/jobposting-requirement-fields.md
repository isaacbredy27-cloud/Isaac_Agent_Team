# Requirement fields in job postings — notes

Sources (read 2026-11-24): https://schema.org/JobPosting · https://developers.google.com/search/docs/appearance/structured-data/job-posting

- `experienceRequirements` → `OccupationalExperienceRequirements` with `monthsOfExperience` (e.g. "36"). Divide by 12 for the experience band minimum.
- `educationRequirements` → `EducationalOccupationalCredential` with `credentialCategory` (e.g. "bachelor degree").
- `experienceInPlaceOfEducation` (Boolean): "If true, indicates that satisfying one of these requirements is sufficient." → our education equivalence flag.
- `baseSalary` is "the actual base salary … as provided by the employer (not an estimate)" → `salary.source = "posted"`.
- Also useful: `skills`, `qualifications`, `responsibilities`, `industry`, `occupationalCategory` (O*NET-SOC code), `securityClearanceRequirement`, `eligibilityToWorkRequirement`, `jobLocationType: "TELECOMMUTE"`.
- Most real postings put requirements in free text; Claude extraction fills `JobRequirements` and must quote any hard gate.
