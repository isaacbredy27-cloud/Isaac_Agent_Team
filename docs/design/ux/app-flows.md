# App flows: screens, navigation and states

Owner: `ux-designer-apple-hig` (Wren). Written 2026-11-25. Task 1f of `docs/plans/app-build.md`.
Auth screens are in `auth-flows.md`. Copy lives in `apps/web/src/content/`.
Sources: `knowledge/ux-designer-apple-hig/` (HIG tab bars, sheets, accessibility; plainlanguage.gov), read 2026-11-25.

## Navigation

| Where | Items | Notes |
|---|---|---|
| Tab bar (bottom) | Jobs · Resume · Gaps · Agents | Navigation only. Single words. `aria-current="page"`. Agents shows for `super_admin` with MFA only. |
| Header | How it Works · Resources · Guide | Also in the footer on wide screens. |
| Footer | How it Works · Resources · Guide | Privacy line below. |
| Auth screens | none | Full pages, no tab bar. |

Actions (Upload, Save, Apply, Approve, Log out) live in the content, never in the tab bar.
Log out sits on the Resume tab. A first-time user lands on Resume (upload). A returning user with a profile lands on Jobs.

## Screens

| # | Screen | Job to be done | User does next | States |
|---|---|---|---|---|
| 1 | Resume: upload | Give the app a resume | Choose a file, then See my matches | idle · uploading · reading · error (size, type, empty, other) |
| 2 | Resume: review | Check what we found | Fix fields, then go to Jobs | ready · saving · saved · empty |
| 3 | Jobs | See which jobs fit | Open a job or Filters | loading · list · empty (no resume) · empty (filters) · empty (no jobs) · offline · error |
| 4 | Filters (sheet) | Narrow the list | Done or Cancel | medium and large detents, grabber, one sheet only |
| 5 | Job detail | Know why and decide | Apply or Save | loading · explanation loading · template fallback · gate notice · not found |
| 6 | Gaps | See skills worth learning | Open a gap, or a job | loading · list · none · empty (no resume) · error |
| 7 | Agents | Pick an agent | Open a chat | loading · list · empty · error |
| 8 | Chat | Ask an agent | Send, or Review proposal | idle · sending · streaming · proposal ready · error · rate limit · session ended |
| 9 | Proposal | Judge a change | Approve or Reject | pending · approving · approved · rejected · base changed · blocked path · error |
| 10 | Step-up (sheet) | Confirm it's you | Confirm and approve, or Cancel | idle · checking · wrong · too many tries · session ended |
| 11 | How it Works | Learn how scoring works | Upload your resume | static |
| 12 | Resources | Find the sources | Open a link | static |
| 13 | Guide (`/guide/`) | Set up and use the app | Follow the steps | static, no scripts |
| 14 | Offline page | Know what to do offline | Try again | static |
| 15 | Not available | Dead end that is not dead | Back to matches | static |

## Main flow

1. Resume: upload (no account needed to read it; see auth open question 9).
2. Resume: review fields.
3. Jobs: ranked list with "86 · Strong Match".
4. Job detail: why, what is missing, what to do next, Apply.
5. Gaps: skills to learn.

Goal: upload to first match in 60 seconds or less. Every state has a next action. No dead ends.

## Job detail rules

- Show the score as icon + number + words (● 86 · Strong Match). Screen reader: "86, Strong Match".
- Always show "Why this score". Never hide the rationale.
- Show the breakdown with weights from `docs/match-scoring.md` model D. A part not stated in the posting shows "Not stated in this posting, so it does not count."
- Any pay we did not read in the posting says "estimate".
- Weak and moderate matches get an honest, kind intro and a next step. Never "not qualified".
- A hard gate (license, clearance) shows in its own "One thing to know" block with a path forward.

## Agents flow (super_admin with MFA)

1. Log in, then MFA code (auth screen 8). First time: enrol (screen 7).
2. Agents list, grouped by Leadership, Domain, Experience, Platform, Quality.
3. Chat. A proposal appears as a card with "Review proposal".
4. Proposal: rationale, file list, diff (added and removed lines use a sign and a word, not color alone).
5. Reject: confirm with an optional reason. Nothing changes.
6. Approve: step-up sheet (auth screen 9) when the last check is older than the window (600 s). Then "Approved. Saved as <sha>." with a link and "Undo this change".
7. 409 `base_sha_changed`: "The code changed since this proposal. Ask the agent to update it."
Non-admins who open the URL see "This page isn't available" (auth screen 10).

## Sheets

Two sheets only: Filters and Step-up. One at a time. Each has a grabber, supports swipe down and Escape, and pairs Cancel with its primary button. Both are `<dialog>` with `showModal()`.

## Offline and errors

- Offline: banner "You're offline. You can still read your last results." Jobs and last scores stay readable. Upload and Agents need a connection and say so.
- Service worker never caches resume data, personal routes or console routes (ADR 0004).
- Errors say what happened and how to fix it. No codes, no blame words.

## Accessibility and layout

- Controls 44 pt or more. Text scales to 200%. Layout holds at 320 px, single column.
- Status changes (upload, results count, approval) use `aria-live="polite"`. Errors use `role="alert"`.
- Focus moves to the page title on route change.
- Band, diff and status never rely on color alone.
- Reduce Motion: no automatic animation.

## Open items

1. Password length `[N]` in `copy.auth.error.passwordShort` waits on the auth plan.
2. Google button size and wording wait on a read of Google's branding page (see `auth-flows.md`).
3. The Netlify and Google console links the lead named are not all cited in `docs/`. See the Resources note in the build report.
4. I have not run `copy-readability.mjs` on `copy.ts`. It reads JSON only. Someone should flatten the strings and run it.
