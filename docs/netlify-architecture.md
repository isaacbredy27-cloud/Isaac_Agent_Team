# Netlify Architecture

Research date: 2026-11-24. Goal: a secure, low-cost architecture with a static frontend and Netlify Functions.

## 1. Platform facts that shape the design

From Netlify's Functions configuration reference:

| Setting | Default | Configurable |
|---|---|---|
| Region | `cmh` (US East, Ohio) | Yes |
| Memory | 1024 MB | Yes (`memory: "2gb"`) |
| Synchronous execution limit | 60 seconds | No |
| Scheduled execution limit | 30 seconds | No |
| Background execution limit | 15 minutes | No |
| Buffered request/response payload | 6 MB | No |
| Streamed response payload | 20 MB | No |
| Background request/response payload | 256 KB | No |

Other facts:

- Background functions return `202` at once. On error, Netlify retries after 1 minute, then again 2 minutes later.
- Scheduled functions use cron syntax in UTC. They run only on published deploys, not Deploy Previews. They cannot be called by URL.
- Netlify Blobs: eventual consistency by default (updates reach all edges within 60 seconds); strong consistency is opt-in per store or per call. Objects up to 5 GB, metadata up to 2 KB, keys up to 600 bytes, list pages of 1,000. Encrypted at rest and in transit.
- Site-wide stores (`getStore`) persist across deploys. Deploy stores (`getDeployStore`) are tied to one deploy.
- Rate limits can be declared per function in `config.rateLimit` (`windowLimit`, `windowSize`, `aggregateBy: ["ip", "domain"]`). They cannot be set in `netlify.toml`.
- Environment variables can be scoped to **Functions** only (Pro and Enterprise). Values may be up to 5,000 characters. Variables can be marked "Contains secret values". Changes appear in the team audit log.
- The legacy Lambda-compatible streaming API documents a 10-second streaming limit. Use the modern `(req, context) => Response` API for streaming and verify the limit during the build spike (section 9).

## 2. Architecture diagram

```
                ┌──────────────────────────── Browser (PWA) ───────────────────────────┐
                │  Static app (Vite + React/TS)    Service worker   IndexedDB (saved)  │
                │  Filters, sorting, band colors computed locally from API data        │
                └───────────────┬──────────────────────────────────────────────────────┘
                                │ HTTPS (same origin /api/*)
┌───────────────────────────────▼───────────────────────── Netlify ────────────────────────────┐
│ Synchronous functions (≤60 s)                     Background functions (≤15 min)             │
│  /api/auth/*        session check                  ingest-background     poll sources        │
│  /api/resume        upload + parse (text path)     extract-background    job requirements    │
│  /api/jobs          list/filter (cached)           match-background      score a profile     │
│  /api/match/:id     scores + explanation           agent-task-background long agent work     │
│  /api/agents        list agent manifest                                                       │
│  /api/agents/chat   streaming Claude chat        Scheduled functions (≤30 s)                  │
│  /api/proposals/*   diff review + approve         schedule-ingest (hourly) → fan out          │
│                                                   schedule-cleanup (daily) → retention         │
│                                                                                                │
│ Netlify Blobs stores: jobs, profiles, matches, proposals, tasks, audit, ratelimit, registry   │
│ Env vars (Functions scope, secret): ANTHROPIC_API_KEY, GITHUB_TOKEN, DATA_KEY, ...            │
└───────────┬──────────────────────────┬────────────────────────────┬──────────────────────────┘
            │                          │                            │
     Claude API (Messages)     GitHub REST API (one repo)     Job sources (Greenhouse, Lever,
                                                              USAJOBS, public career pages)
```

## 3. Browser vs server responsibilities

| Concern | Browser | Server (Functions) | Reason |
|---|---|---|---|
| UI, routing, filters, sort | ✓ | | Instant, no cost |
| Band colors, display formatting | ✓ | | Pure presentation |
| Match score calculation | ✓ (re-sort on filter change) | ✓ (source of truth, stored) | Same pure TS module, shared package. Server value is canonical. |
| File type/size precheck | ✓ | ✓ (authoritative) | Never trust the client |
| Resume text extraction | | ✓ | Libraries, size limits, privacy |
| Any Claude call | | ✓ only | API key must never reach the browser |
| GitHub commits | | ✓ only | Token must never reach the browser |
| Job ingestion | | ✓ (scheduled + background) | Long-running, rate-limited |
| Auth decisions | | ✓ | Client claims are not trusted |
| Saved opportunities | ✓ (IndexedDB, offline) | ✓ (sync to Blobs when signed in) | Offline first |

Share one `@finmatch/scoring` package between browser and server. It has no I/O and no dependencies.

## 4. Repository layout

```
/
├─ netlify.toml
├─ package.json                 (workspaces)
├─ apps/web/                    Vite + React + TypeScript PWA
├─ netlify/functions/           Function entry points (TypeScript)
├─ packages/scoring/            pure scoring module (shared)
├─ packages/schemas/            Zod schemas: CandidateProfile, JobRequirements, MatchResult ...
├─ packages/sources/            job source connectors
├─ data/taxonomy/               skills, titles, industries (versioned JSON)
├─ .claude/agents/              agent definitions (read at build into a manifest)
├─ docs/                        this research
└─ tests/                       unit, integration, e2e
```

## 5. Storage design (Netlify Blobs)

| Store | Key pattern | Consistency | Contents |
|---|---|---|---|
| `registry` | `employers.json` | strong | Employer list, ATS type, tokens, terms review |
| `jobs` | `job/{jobId}.json`, `index/{yyyy-mm-dd}.json` | eventual | NormalizedJob, daily indexes |
| `extractions` | `req/{contentHash}.json` | eventual | Cached JobRequirements |
| `profiles` | `user/{userId}/profile.enc` | strong | Encrypted CandidateProfile |
| `matches` | `user/{userId}/{jobId}.json` | eventual | MatchResult + explanation |
| `saved` | `user/{userId}/saved.json` | strong | Saved opportunities |
| `tasks` | `task/{taskId}.json` | strong | Background task status and progress |
| `proposals` | `proposal/{id}.json` | strong | Agent change proposals and diffs |
| `audit` | `log/{yyyy-mm-dd}/{ulid}.json` | strong | Append-only audit events |
| `ratelimit` | `user/{userId}/{window}.json` | strong | Per-user quotas (Claude spend) |

Why Blobs and not a database at first:

- Built in, no new vendor, encrypted at rest.
- Fits key/value access and small scale (thousands of jobs, hundreds of users).

When to add a database (for example Postgres via Netlify DB or Supabase):

- More than ~20,000 active jobs, or cross-user queries.
- Need for SQL filtering on the server.
- Blobs `list` paging becomes a bottleneck.

Keep a storage interface (`JobRepo`, `ProfileRepo`) so the swap is local.

## 6. Caching

| Layer | What | TTL / rule |
|---|---|---|
| Netlify CDN | `/api/jobs` public list | `Netlify-CDN-Cache-Control: public, s-maxage=600, stale-while-revalidate=3600` (verify header names against Netlify caching docs) |
| Netlify CDN | Personal endpoints | `Cache-Control: private, no-store` |
| Service worker | See `pwa-requirements.md` | |
| Blobs | Claude extractions | Forever, keyed by content hash |
| Blobs | Explanations | Until profile or weights version changes |
| Claude prompt cache | System prompts and tool definitions | Keep them byte-stable; put variable data last |

## 7. Claude usage plan

| Task | When | Model / effort | Max tokens |
|---|---|---|---|
| Resume → CandidateProfile | On upload | `claude-opus-5-5`, effort `low` | 16,000 |
| Job → JobRequirements | Once per new job (background) | `claude-opus-5-5`, effort `low` | 8,000 |
| Match explanation | On first open of a job card | `claude-opus-5-5`, effort `low` | 4,000 |
| Agent console chat | On user message (streaming) | Agent's model from frontmatter, default `claude-opus-5-5` | 64,000 streaming |

- Use the official `@anthropic-ai/sdk`.
- Add the server-side refusal fallback (`fallbacks: "default"` with beta `server-side-fallback-2026-07-01`) and handle `stop_reason: "refusal"`.
- Moving bulk extraction to `claude-haiku-5-5` is a cost lever. It is the owner's call, after an eval shows equal accuracy.
- Message Batches (50% cost) suit the nightly re-extraction backlog, if any.
- Tier 1 rate limits for Opus 5.5: 4,000 RPM, 2,000,000 input tokens/min, 400,000 output tokens/min. Cached reads do not count toward ITPM. Monthly spend caps depend on usage tier.

## 8. Deployment workflow

1. Connect the GitHub repo to a Netlify site. Production branch: `main`.
2. Every push to `main` builds and deploys production. Pull requests get Deploy Previews.
3. Build command: `npm run build` → builds web app, generates `agents-manifest.json` from `.claude/agents/*.md`, type-checks functions.
4. Set environment variables in the Netlify UI with **Functions** scope and "Contains secret values". Use different values for Production and Deploy Previews. Deploy Previews get a low-budget Claude key and **no** GitHub write token.
5. Create a **build hook** only if continuous deployment is off. Build hooks accept `trigger_branch`, `trigger_title` and `clear_cache`. Store the hook URL as a secret.
6. Node runtime: pin a version in `netlify.toml` / `package.json engines`. `unpdf` requires Node 24+; confirm Netlify's supported Node versions during the spike.

`netlify.toml` sketch:

```toml
[build]
  command = "npm run build"
  publish = "apps/web/dist"

[functions]
  directory = "netlify/functions"
  node_bundler = "esbuild"

[[headers]]
  for = "/*"
  [headers.values]
    Content-Security-Policy = "default-src 'self'; connect-src 'self'; img-src 'self' data:; script-src 'self'; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'"
    Strict-Transport-Security = "max-age=63072000; includeSubDomains; preload"
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Permissions-Policy = "camera=(), microphone=(), geolocation=()"
```

Function example (modern API, with rate limit):

```ts
import type { Config, Context } from "@netlify/functions";

export default async (req: Request, context: Context) => {
  const user = await requireUser(req);          // see security.md
  // ...
  return Response.json(result, { headers: { "Cache-Control": "private, no-store" } });
};

export const config: Config = {
  path: "/api/match/:jobId",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
```

## 9. Build-phase spikes (verify before committing)

1. Streaming function response duration on the modern API (target: 60 s chat turns).
2. Supported Node versions for functions (need 24+ for `unpdf`, or pin an older `unpdf`).
3. Whether `rateLimit` is available on the chosen Netlify plan.
4. Environment variable scopes require Pro; confirm plan.
5. Netlify Identity vs Auth0 extension (see `security.md`).

## 10. Scaling and cost

- Static assets: CDN, effectively free at this scale.
- Function invocations: dominated by `/api/jobs` reads (cache at CDN) and ingestion (hourly, bounded by employer count).
- Claude spend: dominated by one-time job extraction. Estimate: 300 new Orlando finance jobs/week × ~3,000 input + ~800 output tokens. At Opus 5.5 prices ($4 / $20 per MTok) that is about 300 × ($0.012 + $0.016) ≈ $8.40/week. Explanations scale with active users; cache them.
- Per-user daily Claude budget enforced in `ratelimit` store (see `security.md`).

## 11. Acceptance criteria

- No secret appears in the built `dist/` bundle (CI grep for key patterns).
- All `/api/*` personal routes return `Cache-Control: private, no-store`.
- Deploy Preview contexts cannot commit to GitHub (no token present).
- A new job ingested by the hourly schedule is visible in `/api/jobs` within 70 seconds of its write (Blobs eventual consistency + CDN TTL).

## Sources

- Netlify, Configuration for functions (default limits table). https://docs.netlify.com/build/functions/configuration/
- Netlify, Get started with functions (modern signature, `config.path`). https://docs.netlify.com/build/functions/get-started/
- Netlify, Functions API reference (`rateLimit`). https://docs.netlify.com/build/functions/api/
- Netlify, Background Functions. https://docs.netlify.com/build/functions/background-functions/
- Netlify, Scheduled Functions. https://docs.netlify.com/build/functions/scheduled-functions/
- Netlify, Lambda compatibility (legacy streaming limits). https://docs.netlify.com/build/functions/lambda-compatibility/
- Netlify Blobs. https://docs.netlify.com/build/data-and-storage/netlify-blobs/
- Netlify, Environment variables overview. https://docs.netlify.com/build/environment-variables/overview/
- Netlify, Build hooks. https://docs.netlify.com/build/configure-builds/build-hooks/
- Netlify, Rate limiting. https://docs.netlify.com/manage/security/secure-access-to-sites/rate-limiting/
- Claude API rate limits. https://platform.claude.com/docs/en/api/rate-limits
- unpdf (Node 24+). https://github.com/unjs/unpdf
