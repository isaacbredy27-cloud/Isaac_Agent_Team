---
name: service-workers
description: Service worker design for Finance Match Orlando — lifecycle (install, activate, fetch), versioned caches, strategy per route (precache shell, stale-while-revalidate jobs list, network-first details, network-only for uploads, admin and personal data), update flow and offline saved jobs. Use for sw.js, caching or offline work.
metadata:
  owner: mobile-pwa-expert
  backups: [netlify-engineer, security-expert]
  version: 1.0.0
---

# Service Workers

## Inputs → Outputs
- Inputs: Route list, build ID.
- Outputs: sw.ts with versioned caches and per-route strategies.

## Purpose
Fast repeat loads and a useful offline mode without caching private data wrongly.

## Use when
- Editing `apps/web/src/sw.ts` or caching rules.
- Debugging stale content after a deploy.

## Lifecycle (MDN)
- `install`: `event.waitUntil(caches.open("shell-v<build>").then(c => c.addAll(SHELL)))`.
- `activate`: delete caches not in the keep-list. Waiting worker activates when old pages close; `skipWaiting()` only after the user taps "Reload".
- `fetch`: `event.respondWith(strategy(event.request))`. Clone responses before caching.
- Must be HTTPS. Scope defaults to the worker's directory; serve `/sw.js` from root.

## Route strategies
| Route | Strategy |
|---|---|
| Hashed JS/CSS, icons, fonts | Precache / cache-first |
| `GET /api/jobs` | Stale-while-revalidate |
| `GET /api/jobs/:id` | Network-first, cache fallback |
| `GET /api/match/*` | Network-first, cleared on sign-out |
| `/api/resume*`, `/api/profile*`, `/api/agents*`, `/api/proposals*`, `/api/admin*`, any non-GET | **Network-only, never cached** (ADR 0004) |
| Navigations offline | Offline page |

## Checklist
- [ ] Cache names include build ID
- [ ] Old caches removed in `activate`
- [ ] Sensitive routes network-only (test asserts cache is empty)
- [ ] Offline e2e: saved jobs visible with network off
- [ ] Update banner works

## Common mistakes
- Caching responses that carry `Authorization` or `Set-Cookie`.
- Empty `fetch` handler "for installability" (costs a worker start, no benefit).
- Chrome stops idle workers after 30 s; long `waitUntil` > 5 min is killed.

## Best practices
- Version caches with the build
- Network-only for private routes
- Ask before activating a new worker

## References
- https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching
- https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation
