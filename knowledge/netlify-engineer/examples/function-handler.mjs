// Worked example: a modern Netlify Function handler, exercised locally with real Web Request/Response objects (Node 22).
// Shows: config export with path + rateLimit, auth first, Zod-free input validation, private no-store caching,
// no secrets in responses. Run: node function-handler.mjs
import assert from "node:assert/strict";

const handler = async (req, context) => {
  if (req.method !== "GET") return new Response("Method Not Allowed", { status: 405, headers: { Allow: "GET" } });
  const auth = req.headers.get("authorization") ?? "";
  if (!auth.startsWith("Bearer ")) return Response.json({ error: "unauthorized" }, { status: 401 });
  const jobId = context.params?.jobId ?? "";
  if (!/^[a-z0-9:_-]{3,120}$/i.test(jobId)) return Response.json({ error: "invalid jobId" }, { status: 400 });
  const body = { jobId, score: 86, band: "green", weightsVersion: "D-1.0" };
  return Response.json(body, { headers: { "Cache-Control": "private, no-store" } });
};
export default handler;
export const config = { path: "/api/match/:jobId", rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] } };

const call = (init, params) => handler(new Request("https://finmatch.example/api/match/x", init), { params });
assert.equal((await call({ method: "POST" }, {})).status, 405);
assert.equal((await call({ headers: {} }, { jobId: "lever:demo:1" })).status, 401);
assert.equal((await call({ headers: { authorization: "Bearer t" } }, { jobId: "../etc" })).status, 400);
const ok = await call({ headers: { authorization: "Bearer t" } }, { jobId: "lever:demo:1" });
assert.equal(ok.status, 200);
assert.equal(ok.headers.get("cache-control"), "private, no-store");
assert.ok(config.rateLimit.windowSize <= 180, "Netlify max windowSize is 180 s");
console.log(await ok.json());
console.log("OK: handler returns 405/401/400/200 correctly with private no-store caching");
