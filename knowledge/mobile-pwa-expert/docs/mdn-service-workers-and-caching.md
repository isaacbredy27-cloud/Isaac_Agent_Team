# Service workers and caching — notes

Sources (read 2026-11-24/25): https://developer.mozilla.org/en-US/docs/Web/API/Service_Worker_API/Using_Service_Workers · https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Caching · https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Offline_and_background_operation

## Lifecycle
- Must be served over HTTPS (localhost allowed).
- `register("/sw.js", { scope: "/" })`; default scope = the worker file's directory; can't register a scope broader than the path allows (unless `Service-Worker-Allowed`).
- `install` → populate cache inside `event.waitUntil(...)`; if the promise rejects, install fails.
- First worker activates immediately; a **new version waits** until pages controlled by the old one close; `skipWaiting()` activates early; `clients.claim()` takes over open pages.
- `activate` → delete caches not in the keep list ("A PWA should clean up any old versions of its cache in the service worker's activate event").
- `fetch` → `event.respondWith(...)`; clone a response before caching ("request and response streams can only be read once"); always return a `Response` (fallback e.g. 408).

## Strategies (MDN Caching guide)
- Cache first (precache): for resources "certain to need, that will not change for this version" — the app shell.
- Stale-while-revalidate: "when responsiveness is important, and freshness is somewhat important but not essential."
- Network first: "important to get the most fresh response possible, but … a cached resource is better than nothing."
- Storage is limited; browsers may evict; "eviction of cached data is a very rare event."

## Background limits (Chrome)
Worker may stop if idle 30 s, running sync JS 30 s, or a `waitUntil()` promise exceeds 5 minutes. Periodic background sync is Chromium-only; push on iOS needs Home Screen install.
