---
name: ux-writing
description: UX writing for Finance Match Orlando — plain language (grade ≤ 8), short sentences, active voice, supportive tone for weak matches, error messages that say what happened and how to fix, privacy copy, labels and empty states. Use for any user-facing text.
metadata:
  owner: ux-designer-apple-hig
  backups: [finance-job-market-specialist, privacy-compliance-specialist]
  version: 1.0.0
---

# UX Writing

## Purpose
Words that help job seekers act quickly and feel respected.

## Use when
- Any user-facing text: labels, errors, empty states, explanations, privacy copy

## Inputs → Outputs
- Inputs: Screen, state, intent.
- Outputs: Strings in apps/web/src/content with grade ≤ 8.

## Rules
- Short sentences, active voice, everyday words. Grade ≤ 8 for job-seeker screens.
- Lead with the action: "Upload your resume to see your matches."
- Errors: what happened + how to fix. "This file is over 5 MB. Save it as a smaller PDF and try again."
- Weak matches: honest and kind. "This role needs a Series 7 license. Here's how to get started."
- Numbers with meaning: "86 · Strong Match", "Typical Orlando range $72k–$116k (BLS estimate)".
- Say "estimate" for any salary we did not read in the posting.
- Privacy line under upload: "We delete your file after reading it. You can delete your profile at any time." (ADR 0004)

## Glossary
Match score · Strong / Moderate / Weak Match · Skill gap · Saved · Apply (opens employer site).

## Checklist
- [ ] Grade ≤ 8
- [ ] Sentences ≤ 20 words
- [ ] 'Estimate' on non-posted salary
- [ ] No blame words

## Common mistakes
- Jargon ('authentication failed')
- Blaming the user
- Hiding bad news in weak-match copy

## References
- https://www.plainlanguage.gov/guidelines/
- https://developer.apple.com/design/human-interface-guidelines/writing
