# Vendor data handling — notes for the data inventory

## Netlify Blobs
Source: https://docs.netlify.com/build/data-and-storage/netlify-blobs/ (read 2026-11-24)
- "Blobs are encrypted at rest and in transit."
- Site-wide stores persist across deploys; deploy-specific stores are deleted with their deploy. We keep personal data only in site-wide stores, keyed by hashed user ID.
- Eventual consistency by default (≤ 60 s); deletions also propagate within 60 seconds — a deleted profile can be served from an edge cache briefly unless strong consistency is used. Use `consistency: "strong"` for profile reads and deletes.
- "Netlify Blobs is not currently supported as part of HIPAA-compliant hosting offerings."

## Netlify plan (ADR 0003)
Source: https://www.netlify.com/pricing/ (read 2026-11-25) — Free plan function logs are kept 24 hours. Never log personal data; audit events go to Blobs.

## Claude API — structured outputs
Source: https://platform.claude.com/docs/en/build-with-claude/structured-outputs (read 2026-11-25)
- With zero data retention, "prompts and responses are processed with ZDR … However, the JSON schema itself is temporarily cached for up to 24 hours since last use."
- "PHI must not be included in JSON schema definitions" — schemas are cached separately. Rule for us: **no personal data in schema names, enums, consts or patterns**; personal data only in message content.
- Review Anthropic's current commercial terms and API data-retention page before launch and record the result in `docs/privacy/`.

## Job sources
See `source-terms-review` skill: terms URL, robots.txt, storage and redisplay limits recorded per source in `data/registry/terms/`.
