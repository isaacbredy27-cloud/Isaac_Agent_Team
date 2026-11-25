# Data inventory

Owner: privacy-compliance-specialist. Reviewed 2026-11-25. Not legal advice; counsel confirms.
Rules: ADR 0004 (resumes are never public and are used only for matching), ADR 0003 (Free plan, 24 h function logs).

First question for every row: do we need this data at all? If not, we do not collect it.

| # | Data | Where it lives | Retention | Delete path |
|---|---|---|---|---|
| 1 | Raw resume file | Function memory only, during `POST /api/resume` | Gone when the request ends | Nothing to delete |
| 2 | CandidateProfile | Browser `localStorage`, key `fmo.profile` only | Until the user deletes it | "Delete my data" button |
| 3 | Match results | Computed per request. Not stored on the server | None on the server | Nothing to delete |
| 4 | Jobs | Seed data. Greenhouse in-process cache, 2 h, when enabled | 30 days after a job closes | Retention sweep |
| 5 | Supabase auth data | Supabase (email, user ID, role, MFA factors) | See `docs/privacy/supabase-auth.md` | See that file |
| 6 | Agent chat | Sent to Anthropic, super_admin only | Not stored by us (see below) | Not applicable |
| 7 | Proposals | Netlify Blobs store `proposals` | Kept indefinitely | Open item (see below) |
| 8 | Console audit events | Netlify Blobs store `audit` | 1 year (audit-logging skill) | Sweep after 1 year |
| 9 | Anthropic API retention | Anthropic | To verify: check current commercial terms | See below |

## Notes by row

1. **Raw resume.** `resume.ts` and `match.ts` never write it to a store or a log. The Service Worker never caches `/api/resume`, `/api/match` or `/api/gaps` (`apps/web/public/sw.js`, `NETWORK_ONLY`).
2. **Profile.** It holds extracted skills and similar fields. It never leaves the browser except as the body of a match request. The key is `PROFILE_KEY` in `apps/web/src/app/profile.ts`. The button calls `removeItem`. A browser test must prove the key is gone after the click.
3. **Match results.** The server sends `private, no-store`. The Service Worker does not cache them. A browser may hold them in page memory only. Confirm that no component writes them to `localStorage`.
4. **Jobs.** Job postings are public employer data. The `/api/jobs` response is cached at the CDN and by the Service Worker. That is allowed, because it holds no personal data. Greenhouse stays off until `data/registry/terms/` holds a decision for it.
5. **Supabase.** Email and auth metadata only. No resume data goes to Supabase (ADR 0006).
6. **Agent chat.** `netlify/functions/agents-chat.ts` does not exist yet. Only `agents.ts` exists, and it lists agent names. No chat code stores prompts or replies. The audit helper `_lib/console/audit.ts` writes a hashed user ID, route, action and result. It never writes prompts. When chat ships, I re-review this row. Chat must never receive resume or profile data.
7. **Proposals.** Code and doc diffs, not personal data. I did not see user IDs in `_lib/console/proposals.ts`. Indefinite retention is a decision to confirm with the project lead. I suggest a 1-year limit to match the audit log.
8. **Audit.** Keys are `console/<date>/<time>-<uuid>`. Content-free by design.
9. **Anthropic.** Source: `knowledge/privacy-compliance-specialist/docs/vendor-data-handling.md`. It says to review Anthropic's current commercial terms and API data-retention page before launch. I have not done that yet. Status: **to verify**. Also keep personal data out of JSON schemas, because schemas are cached up to 24 h.

## Gaps and open items

- Delete-my-data covers `fmo.profile` only. The server holds no per-user resume data, so this is enough today. If any server store is added, the inventory and the deletion test must change first.
- `fmo.installDismissed` is a UI flag with no personal data. It is not removed by the button. That is acceptable.
- No Blobs retention sweep exists yet for `jobs`, `proposals` or `audit`. See `knowledge/privacy-compliance-specialist/examples/retention-sweep.mjs`.
- Outcome logging does not exist. Consent must come before it is built.
