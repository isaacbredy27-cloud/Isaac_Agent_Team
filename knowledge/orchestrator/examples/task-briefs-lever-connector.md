# Worked example: briefs for "Add Lever employers and show salary ranges"

Plan: one chain (schema → connector → UI) with two parallel side tasks.

```
Wave 1 (parallel): software-architect [salary field in NormalizedJob]  ·  privacy-compliance-specialist [Lever terms record]
Wave 2:            job-data-integration-expert [Lever connector]
Wave 3 (parallel): mobile-pwa-expert [salary display]  ·  ux-designer-apple-hig [salary copy]
Wave 4:            qa-engineer [tests + release report]
```

## Brief — job-data-integration-expert
```
Task: Add a Lever connector and ingest the Orlando employers listed in data/registry/employers.json with ats=lever.
Owner: job-data-integration-expert   Reviewers: security-expert, qa-engineer   Due: 2026-12-03
Context: docs/job-data-sources.md §3.2; skill lever-integration; ADR 0003 (poll every 2 h); fixture knowledge/job-data-integration-expert/examples/fixtures/lever-postings.json
Inputs: NormalizedJob v1.1 (adds salary.source) from software-architect, wave 1
Done when: contract test passes on the recorded fixture; createdAt (ms) → ISO; salaryRange mapped; workplaceType mapped; dedupe holds
Constraints: edit only packages/sources/**, tests/sources/**, netlify/functions/ingest-*; no new dependencies
Return: files changed, test output summary, open questions
```

## Brief — ux-designer-apple-hig
```
Task: Write copy for posted vs estimated salary on job cards and detail.
Owner: ux-designer-apple-hig   Reviewers: finance-job-market-specialist, accessibility-specialist
Context: skill ux-writing; skill finance-job-market-analysis (BLS bands); knowledge/finance-job-market-specialist/examples/salary-estimate.mjs
Done when: strings added to apps/web/src/content/; grade ≤ 8; "estimate" is explicit
Return: the strings and where each appears
```
