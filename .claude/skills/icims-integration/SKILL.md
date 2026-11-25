---
name: icims-integration
description: iCIMS career portals (careers-{company}.icims.com/jobs/{id}/{slug}/job) — public posting pages, JSON-LD first, iframe-wrapped content, polite polling and terms review. Use when an Orlando employer (e.g., AMERICAN SYSTEMS, Reyes Beverage Group) posts on iCIMS.
metadata:
  owner: job-data-integration-expert
  backups: [privacy-compliance-specialist]
  version: 1.0.0
---

# iCIMS Integration

## Purpose
Ingest jobs from employer career portals hosted on iCIMS, within their terms.

## Use when
- Adding an iCIMS employer
- An iCIMS page stops parsing

## Inputs → Outputs
- Inputs: Portal URL and terms decision.
- Outputs: NormalizedJob records with full requirement text.

## Facts
- Posting URL: `https://careers-{company}.icims.com/jobs/{id}/{slug}/job`; apply adds `?mode=apply`.
- Job content is often inside an iframe (`in_iframe=1`); request the iframe URL.
- Requisition ID = numeric `{id}` in the path.

## Approach (Tier 2)
Same as Workday: registry + terms review → list page ≤ every 2 hours → JSON-LD first → normalize → contract test.
iCIMS pages frequently state hybrid rules and clearances in body text ("3 days in office", "Active Secret Clearance") — pass the full text to requirement extraction so hard gates are caught.

## Best practices
- Terms review first
- Fetch only new posting pages
- JSON-LD before HTML parsing

## Checklist
- [ ] `allowed: true` in registry
- [ ] Contract test on a saved page
- [ ] Gate phrases reach extraction

## Common mistakes
- Parsing the outer page instead of the iframe
- Polling every posting every run

## References
- docs/job-data-sources.md §3.6
- Live examples 2026-11-24: careers-americansystems.icims.com/jobs/5199, careers-reyesbeveragegroup.icims.com/jobs/38574
