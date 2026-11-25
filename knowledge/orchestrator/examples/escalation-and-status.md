# Worked example: an escalation and a weekly status

## Escalation (level 3 → project lead)
```
ESCALATION L3 · Glass tab bar fails contrast over hero photos
Owner: ui-designer-apple-liquid-glass  ·  Raised by: accessibility-specialist (veto)  ·  Deadline: 2026-12-05
Question: Ship the clear-glass tab bar on the job-detail hero, or switch to regular glass?
Options: A) Regular glass everywhere (passes 4.5:1 on all tested backgrounds)
         B) Clear glass + 35% dimming layer on bright images (Apple HIG), extra QA per image
         C) Clear glass as designed (fails 4.5:1 on white/orange backgrounds)
Recommendation: A — knowledge/ui-designer-apple-liquid-glass/examples/glass-legibility.mjs shows regular passes everywhere; C fails.
Impact if delayed: job-detail release slips one week.
```
Only the project lead can override the accessibility veto (docs/expert-roster.md §8).

## Weekly status
- **Done:** Greenhouse connector (3 employers); scoring v D-1.0 with gates; install flow on Android.
- **In progress:** Lever connector (job-data-integration-expert, due Wed).
- **Blocked:** iOS install sheet copy — waiting on Wren's review (2 days).
- **Risks:** Netlify credits at 48% on day 14 (ADR 0003 alert at 60%).
- **Decisions needed:** Approve ADR 0006 draft (database trigger thresholds).
