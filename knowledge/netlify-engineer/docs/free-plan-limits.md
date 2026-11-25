# Netlify Free plan — limits that shape operations (ADR 0003)

Source: https://www.netlify.com/pricing/ (read 2026-11-25).

| Item | Free |
|---|---|
| Included credits per month (deploys, compute, forms, bandwidth, web requests) | **300 credit limit** |
| Functions log retention | **24-hour history** |
| Rate limiting | Code-based rules |
| Basic authentication headers | Not included |
| Team management | Not included |

"When a site reaches its monthly usage limits, it enters a paused state until the start of the next billing cycle. Please note that if one project exceeds its limits, **all projects on your account will be paused**."

Operational rules: CDN-cache `/api/jobs`; poll sources every 2 hours; weekly credit check with alerts at 60%/80%; persist error and audit events to Blobs.
