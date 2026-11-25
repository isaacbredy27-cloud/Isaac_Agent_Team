// Service worker (skill: service-workers, ADR 0004). Plain JS, no build step.
// Bump VERSION on each release so old caches are deleted.
const VERSION = "v1";
const SHELL_CACHE = `shell-${VERSION}`;
const DATA_CACHE = `data-${VERSION}`;
const SHELL_URLS = ["/", "/offline.html", "/offline.css", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];
// Private routes: never read from or written to a cache.
const NETWORK_ONLY = /^\/api\/(resume|match|gaps|profile|agents|proposals|admin)(\/|$)/;

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(SHELL_CACHE).then((c) => c.addAll(SHELL_URLS)));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== SHELL_CACHE && k !== DATA_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "skipWaiting") self.skipWaiting();
});

async function navigate(request) {
  try {
    const res = await fetch(request);
    if (res.ok && new URL(request.url).pathname === "/") {
      const copy = res.clone();
      caches.open(SHELL_CACHE).then((c) => c.put("/", copy));
    }
    return res;
  } catch {
    // Offline: serve the cached app shell (client routes work), else the offline page.
    return (await caches.match("/")) || (await caches.match("/offline.html"));
  }
}

async function staleWhileRevalidate(request) {
  const cache = await caches.open(DATA_CACHE);
  const hit = await cache.match(request);
  const fresh = fetch(request)
    .then((res) => {
      if (res.ok && !res.headers.has("Set-Cookie")) cache.put(request, res.clone());
      return res;
    })
    .catch(() => undefined);
  return hit || (await fresh) || Response.error();
}

async function cacheFirst(request) {
  const hit = await caches.match(request);
  if (hit) return hit;
  const res = await fetch(request);
  if (res.ok) {
    const copy = res.clone();
    caches.open(SHELL_CACHE).then((c) => c.put(request, copy));
  }
  return res;
}

self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);
  if (request.method !== "GET" || url.origin !== self.location.origin) return;
  if (NETWORK_ONLY.test(url.pathname)) return; // browser default: network only
  if (url.pathname.startsWith("/guide/")) return;
  if (request.mode === "navigate") {
    event.respondWith(navigate(request));
  } else if (url.pathname === "/api/jobs") {
    event.respondWith(staleWhileRevalidate(request));
  } else if (url.pathname.startsWith("/api/")) {
    return;
  } else if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(cacheFirst(request));
  }
});
