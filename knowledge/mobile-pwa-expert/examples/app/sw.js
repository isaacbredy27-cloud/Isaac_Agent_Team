// Minimal service worker following MDN's lifecycle + our route rules (skill: service-workers).
const SHELL = "shell-v1";
const SHELL_URLS = ["/", "/index.html", "/manifest.webmanifest", "/icons/icon-192.png"];
const NETWORK_ONLY = [/^\/api\/(resume|profile|agents|proposals|admin)/];

self.addEventListener("install", (event) => event.waitUntil(caches.open(SHELL).then((c) => c.addAll(SHELL_URLS))));
self.addEventListener("activate", (event) => event.waitUntil(
  caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== SHELL).map((k) => caches.delete(k))))));
self.addEventListener("fetch", (event) => {
  const url = new URL(event.request.url);
  if (event.request.method !== "GET" || NETWORK_ONLY.some((r) => r.test(url.pathname))) return; // network only, never cached
  event.respondWith(caches.match(event.request).then((hit) => hit ?? fetch(event.request).catch(() => caches.match("/index.html"))));
});
