# Resume Match Dashboard

Research date: 2026-11-24. Goal: a mobile-first dashboard that shows which Orlando finance jobs to apply for, and why.

## 1. Screens

| # | Screen | Purpose |
|---|---|---|
| 1 | Onboarding / Upload | Upload resume, set preferences |
| 2 | Profile review | Confirm parsed profile before scoring |
| 3 | Matches (home) | Ranked job list with filters |
| 4 | Job detail | Score breakdown, explanation, apply link |
| 5 | Saved | Saved opportunities, status tracking |
| 6 | Skill gaps | Aggregate gaps across top matches |
| 7 | Agent Console (admin) | See `agent-console.md` |

Bottom tab bar on mobile: **Matches · Saved · Skill gaps · Profile**. Side nav on ≥ 1024 px.

## 2. Upload flow

1. Drop zone plus "Choose file" button. Accept `.pdf,.docx`.
2. Client precheck: type and ≤ 5 MB. Show an inline error otherwise.
3. Preferences (optional): arrangement (on-site / hybrid / remote), minimum salary, willing to relocate, clearance, work authorization.
4. Progress states: Uploading → Reading resume → Building profile → Scoring jobs. Use a live region for screen readers.
5. Land on Profile review.

Privacy copy under the button: "We delete your file after reading it. You can delete your profile at any time."

## 3. Matches list

### 3.1 Job card (mobile)

```
┌──────────────────────────────────────────────┐
│ ● 86  Strong Match                ☆ Save     │
│ Senior Financial Analyst                     │
│ Example Co. · Orlando, FL · On-site          │
│ $95k–$120k (posted)  ·  Posted 7 days ago    │
│ ✓ Excel modeling  ✓ 4 yrs  ✗ Adobe Creative  │
│ [View details]                [Apply ↗]      │
└──────────────────────────────────────────────┘
```

- Score badge shows **number + text label + icon**, not color alone (WCAG 1.4.1).
  - Green: ● filled circle, "Strong Match".
  - Yellow: ◐ half circle, "Moderate Match".
  - Red: ○ outline circle, "Weak Match".
- Salary: show posted range. If none, show BLS local band in muted text: "Typical Orlando range $72k–$116k (BLS)". Label it as an estimate.
- Top 2 matched and top 1 missing requirement as chips.
- Hard-gate warning chip when a gate failed: "Requires Secret clearance".

### 3.2 Sorting

Default: score descending, then posted date. Options: newest, salary high→low.

### 3.3 Filters

Filter sheet (mobile) or left panel (desktop):

| Filter | Control | Values |
|---|---|---|
| Match score | Range slider + band toggles | 0–100; Green / Yellow / Red |
| Salary range | Two number inputs | Min / max; "Include jobs without salary" checkbox |
| Experience level | Checkboxes | Entry (0–2), Mid (3–5), Senior (6–9), Manager (10+) |
| Industry | Checkboxes | Defense & aerospace, Financial services, Hospitality & entertainment, Healthcare, Real estate, Government, Other |
| Work arrangement | Checkboxes | Remote, Hybrid, On-site |
| Posted within | Segmented | 24 h, 7 days, 30 days |
| Role | Checkboxes | From title taxonomy families |

- Filters apply instantly in the browser. Store them in the URL query so views are shareable and restorable.
- Show the active filter count on the filter button. Offer "Clear all".

## 4. Job detail

Sections in order:

1. **Header:** title, employer, location, arrangement, salary, posted date, **Apply** button (opens employer URL in new tab, `rel="noopener noreferrer"`).
2. **Score:** big score + band label. Horizontal bars for each sub-score with weight shown ("Required skills 24/30").
3. **Hard requirements:** each gate with the posting quote and pass/fail.
4. **Why this score:** headline + key strengths.
5. **Gaps:** missing skills, missing certifications, experience gap. Each tagged "Likely deal-breaker", "Possible", or "Unlikely".
6. **Resume improvements:** concrete edits. Copy button for each suggested bullet.
7. **Recommendation:** Apply now / Apply with tailoring / Stretch / Skip for now.
8. **Interview readiness:** level + prep topics.
9. **Company info:** employer name, industry, Orlando presence note, career site link. Sourced from the employer registry. No scraped reviews.

## 5. Saved opportunities

- Save from card or detail. Works offline (IndexedDB), syncs when online.
- Status per saved job: Interested → Applied → Interviewing → Offer / Rejected. Optional notes.
- With consent, status updates feed weight calibration (`match-scoring.md` §5.4).
- Alert when a saved job closes.

## 6. Skill-gap analysis

Aggregate missing requirements across the user's top 25 Green and Yellow matches.

```
Skill gaps across your top 25 matches
1. Adaptive Planning ............ missing in 9 jobs   [Learn ↗]
2. SQL .......................... missing in 7 jobs
3. CPA (preferred) .............. missing in 6 jobs
4. Power BI ..................... missing in 5 jobs
```

- Use a simple horizontal bar chart (count of jobs). Plain, readable, no calculated fields.
- Each row shows how many jobs would move up a band if the gap closed. The scoring module computes it by re-scoring with that skill added.
- Link to neutral learning resources (vendor docs, CFA Institute, AICPA). No affiliate links.

## 7. Visual design

- Colors (tokens on `:root`, dark mode supported):
  - Green `#1B7F3B` on white (contrast ≥ 4.5:1).
  - Yellow: use dark amber text `#8A5A00` on a light amber chip `#FFF4D6`. Pure yellow fails contrast.
  - Red `#B42318` on white.
- Never rely on color alone. Always pair with icon and text.
- Body text ≥ 16 px. Touch targets ≥ 44×44 px (beats WCAG 2.5.8's 24 px minimum).
- Respect `prefers-reduced-motion` and `prefers-color-scheme`.

## 8. Empty, loading and error states

| State | Message |
|---|---|
| No resume yet | "Upload your resume to see your matches." + upload button |
| No matches for filters | "No jobs match these filters." + Clear filters |
| Scoring in progress | Skeleton cards + "Scoring 214 jobs…" progress |
| Explanation unavailable | Template explanation from evidence + "Detailed explanation unavailable right now" |
| Offline | Banner: "You're offline. Showing results from 9:42 AM." |

## 9. Performance targets

- First load on mid-range Android over 4G: LCP ≤ 2.5 s, INP ≤ 200 ms, CLS ≤ 0.1.
- Job list virtualized beyond 50 items.
- JS bundle for the matches route ≤ 200 KB gzipped.

## 10. Acceptance criteria

- A user can upload, review, and see ranked matches in under 60 s for a typical resume.
- Every filter in §3.3 works alone and combined, and persists in the URL.
- Every card shows the band as text, icon and color.
- Salary shows "posted" or "estimate" explicitly.
- Saved jobs are visible offline.
- Skill-gap view lists the top 10 gaps with job counts.
- Passes the accessibility criteria in `testing-and-accessibility.md`.

## Sources

- WCAG 2.2 SC 2.5.8 Target Size (Minimum) and 2.5.5 Target Size (Enhanced). https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html
- BLS OEWS Orlando wage percentiles (see `orlando-finance-market.md`).
- Scoring and explanation contracts (see `match-scoring.md`).
