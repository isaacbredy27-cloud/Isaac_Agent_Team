# Run the app locally

Owner: netlify-engineer. Verified 2026-11-25 in the build sandbox.

## Why two options

`netlify dev` starts an Edge Functions proxy. That step downloads Deno. In a sandbox without that download it dies with
`Failed to handle request to / Error: fetch failed` (`netlify-cli/dist/lib/edge-functions/proxy.js`).
`netlify dev --help` lists no option to turn edge functions off (checked 2026-11-25, netlify-cli 27.x). The app has no edge functions.

## Option A: `netlify dev` (normal machine with internet)

```bash
npm ci
npm run build:manifest
npx netlify dev
```

## Option B: `npm run serve:local` (sandbox, offline, CI smoke)

```bash
npm ci
npm run build                      # writes apps/web/dist
CONTEXT=dev E2E_AUTH_STUB=1 E2E_FAKE_CLAUDE=1 \
SUPABASE_URL=https://example.supabase.co SUPABASE_PUBLISHABLE_KEY=sb_publishable_test \
npm run serve:local                # http://localhost:8888 (PORT overrides)
```

What `scripts/serve-local.mjs` does:
- Bundles each `netlify/functions/*.ts` with esbuild into `.netlify/local-functions/` (git-ignored).
- Mounts each function at its `config.path`. `:id` goes to `context.params`.
- Starts the `BlobsServer` from `@netlify/blobs/server`. Data lives in `.netlify/local-blobs/`.
  It sets `NETLIFY_BLOBS_CONTEXT` so `getStore` works unchanged.
- Serves `apps/web/dist`. Real files first. `/guide/` maps to `guide/index.html`. Other paths fall back to `index.html`.
- Does not emulate rate limits, CDN cache headers or `netlify.toml` headers.

The stub login works only when `CONTEXT` is `dev` or `test`. Never set the test flags in production.

## Smoke results (2026-11-25)

Stub token: `stub.super_admin.aal2.<unix seconds now>`.

| Request | Result |
|---|---|
| `GET /` | 200, HTML ("Finance Match Orlando") |
| `GET /guide/` | 200, HTML ("Guide") |
| `GET /api/jobs` | 200, `{"jobs":[{"id":"seed-001","title":"Staff Accountant",...` (seed jobs) |
| `POST /api/resume` `{"text":"Staff accountant, 4 years. GAAP, ..."}` | 200, `{"profile":{"skills":["excel","gaap",...],"titles":["staff_accountant"],"yearsExperience":4,...}}` |
| `POST /api/match` `{"profile":{...}}` | 200, `{"results":[{"jobId":"seed-001","score":97,"band":"Strong",...` |
| `POST /api/gaps` `{"profile":{...}}` | 200, `{"gaps":[{"gap":"Accounts receivable",...` |
| `GET /api/agents` (no token) | 401 `{"error":"unauthorized"}` |
| `GET /api/agents` (stub token) | 200, 18 agents |
| `POST /api/agents/chat` (stub token) | 200 SSE: `text` events, then `{"type":"proposal","id":"1"}`, then `{"type":"done"}` |

Note: `/api/match` and `/api/gaps` expect `{"profile": {...}}`, not the bare profile (bare profile gives 400).
