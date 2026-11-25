# Netlify env vars, Blobs, headers, build hooks, rate limits

Sources (read 2026-11-24/25): https://docs.netlify.com/build/environment-variables/overview/ · https://docs.netlify.com/build/functions/environment-variables/ · https://docs.netlify.com/build/data-and-storage/netlify-blobs/ · https://docs.netlify.com/manage/routing/headers/ · https://docs.netlify.com/build/configure-builds/build-hooks/ · https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/

## Environment variables
- Set via UI/CLI/API (stored on Netlify) or `netlify.toml` (stored in git). "We recommend using the Netlify UI, CLI, or API … to avoid storing sensitive values in your repository."
- Values per deploy context: Production, Deploy Previews, Branch deploys, Preview server, Local development.
- **Scopes** (Builds, Functions, Runtime, Post processing) are Pro/Enterprise only.
- "Contains secret values" enables Secrets Controller protections; changes appear in the team audit log.
- Keys: alphanumeric + `_`, start with a letter, ≤ 255 chars; values ≤ 5,000 chars.
- In functions: `process.env.VARIABLE_NAME`. Runtime read-only vars: `URL`, `SITE_NAME`, `SITE_ID`. **"Environment variables declared in netlify.toml are not available to serverless functions."** Values apply at deploy time — redeploy to apply changes.

## Netlify Blobs
- API: `getStore`, `getDeployStore`, `get`, `getWithMetadata`, `getMetadata`, `set`, `setJSON(key, value, { metadata, onlyIfMatch, onlyIfNew })`, `list({ directories, paginate, prefix })`, `listStores`, `delete`, `deleteAll`.
- Consistency: eventual by default — "updates and deletions … propagated to all edge locations within 60 seconds"; strong consistency per store or per call. "If multiple write calls to the same key are issued, the last write wins."
- Site-wide stores (`getStore`) persist across deploys; deploy stores (`getDeployStore`) follow one deploy.
- Limits: object ≤ 5 GB; metadata ≤ 2 KB; store name ≤ 64 bytes (no `/` or `:`); key ≤ 600 bytes, no leading `/`; list pages ≤ 1,000. Encrypted at rest and in transit. Not available to Go functions.

## Headers
```toml
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
```
Also supported in a `_headers` file; multi-value headers concatenate.

## Build hooks
POST to the unique hook URL; optional `trigger_branch`, `trigger_title`, `clear_cache=true`.

## Rate limiting
- Code-based rules: **all plans**; UI-based rules: Enterprise with HP Edge.
- In the function's `config` only (not `netlify.toml`); requires `path`.
- `rateLimit: { windowLimit, windowSize (s, max 180), aggregateBy: ["ip","domain"], action: "rate_limit" | "rewrite", to }`.
- Limits: 100 rules per ruleset; 2 rulesets per project (published / unpublished).
