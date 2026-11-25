# Auth rate limits and Free plan — notes

Sources (read 2026-11-25):
- https://supabase.com/docs/guides/auth/rate-limits (page updated 2026-10-26)
- https://supabase.com/pricing (read 2026-11-25)
- https://supabase.com/docs/guides/auth/passwords (page updated 2026-11-17)

## Auth rate limits
| Action | Limit |
|---|---|
| Emails, built-in SMTP | 2 per hour (change with custom SMTP or a Send Email hook) |
| Sign up and sign in | 30 requests per 5 minutes (burst 30), configurable |
| Token refresh | 150 per 5 minutes (burst 30), configurable |
| Verify | 30 per 5 minutes, configurable |
| OTP | 60 s per user between sends |
| MFA challenge and verify | 15 per minute (burst 30), not configurable |

## Free plan (pricing page)
- "50,000 monthly active users".
- "Limit of 2 active projects."
- "Free projects are paused after 1 week of inactivity."
- "Basic Multi-Factor Auth: Included in free".
- Leaked password protection: "Not included in free" (Pro and above).
- Auth audit log retention: "24 hours".

## What it means for us
- A paused project blocks every login. Plan a weekly keep-alive or accept the pause. Decision: project lead (ADR 0003 spirit).
- 2 emails per hour limits sign-up confirmation and password reset. Custom SMTP is the fix; it may cost money, so the lead decides.
- Supabase auth logs last 24 hours. Our own audit goes to Blobs (1 year) and `private.role_changes`.
- Any paid plan or add-on needs the project lead.
