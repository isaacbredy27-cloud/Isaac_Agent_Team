// Worked example: the caching-strategy table as a pure, testable function (skill: service-workers, ADR 0004).
// Run: node sw-route-strategy.mjs
import assert from "node:assert/strict";

export function strategyFor(method, pathname) {
  if (method !== "GET") return "network-only";
  if (/^\/api\/(resume|profile|agents|proposals|admin)(\/|$)/.test(pathname)) return "network-only"; // private: never cached
  if (/^\/api\/jobs\/[^/]+$/.test(pathname)) return "network-first";
  if (pathname === "/api/jobs") return "stale-while-revalidate";
  if (/^\/api\/match\//.test(pathname)) return "network-first-clear-on-signout";
  if (/\.(js|css|woff2|png|svg|webmanifest)$/.test(pathname)) return "cache-first";
  return "network-first-offline-page";
}

const cases = [
  ["POST", "/api/resume", "network-only"], ["GET", "/api/profile", "network-only"], ["GET", "/api/agents/chat", "network-only"],
  ["GET", "/api/proposals/7", "network-only"], ["GET", "/api/jobs", "stale-while-revalidate"], ["GET", "/api/jobs/lever:x:1", "network-first"],
  ["GET", "/api/match/abc", "network-first-clear-on-signout"], ["GET", "/assets/app.3f9a.js", "cache-first"], ["GET", "/saved", "network-first-offline-page"],
];
for (const [m, p, want] of cases) assert.equal(strategyFor(m, p), want, `${m} ${p}`);
console.log(`OK: ${cases.length} routes map to the documented strategies; private routes are network-only`);
