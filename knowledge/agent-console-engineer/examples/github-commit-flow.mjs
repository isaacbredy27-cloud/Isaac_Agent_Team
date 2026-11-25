// Worked example: atomic commit to main with the Git Data API (ADR 0002).
// Part 1 calls the REAL public GitHub API (read-only, unauthenticated) to show the ref shape.
// Part 2 runs the full write flow against a local mock server: ref → commit → blobs → tree → commit → PATCH ref (force:false),
// plus the stale-base guard.
// Run: node github-commit-flow.mjs
import http from "node:http";
import assert from "node:assert/strict";

const H = { Accept: "application/vnd.github+json", "X-GitHub-Api-Version": "2026-03-10", "User-Agent": "finmatch-knowledge-example" };

// Part 1 — real read
try {
  const r = await fetch("https://api.github.com/repos/isaacbredy27-cloud/Isaac_Agent_Team/git/ref/heads/main", { headers: H });
  const ref = await r.json();
  console.log(`real GET ref: status=${r.status} ref=${ref.ref} object.type=${ref.object?.type} sha=${ref.object?.sha?.slice(0, 7)}`);
} catch (e) { console.log("real GET skipped:", e.cause?.code ?? e.message); }

// Part 2 — write flow against a mock
let headSha = "aaa111"; const calls = [];
const server = http.createServer((req, res) => {
  let body = ""; req.on("data", (c) => (body += c)); req.on("end", () => {
    calls.push(`${req.method} ${req.url}`); const j = body ? JSON.parse(body) : {};
    const send = (s, o) => { res.writeHead(s, { "content-type": "application/json" }); res.end(JSON.stringify(o)); };
    if (req.method === "GET" && req.url.endsWith("/git/ref/heads/main")) return send(200, { ref: "refs/heads/main", object: { sha: headSha, type: "commit" } });
    if (req.method === "GET" && req.url.includes("/git/commits/")) return send(200, { sha: headSha, tree: { sha: "tree000" } });
    if (req.method === "POST" && req.url.endsWith("/git/blobs")) return send(201, { sha: "blob" + calls.length });
    if (req.method === "POST" && req.url.endsWith("/git/trees")) { assert.equal(j.base_tree, "tree000"); return send(201, { sha: "tree111" }); }
    if (req.method === "POST" && req.url.endsWith("/git/commits")) { assert.deepEqual(j.parents, [headSha]); return send(201, { sha: "ccc333" }); }
    if (req.method === "PATCH" && req.url.endsWith("/git/refs/heads/main")) { assert.equal(j.force, false); if (j.sha !== "ccc333") return send(422, { message: "Validation failed" }); headSha = j.sha; return send(200, { ref: "refs/heads/main", object: { sha: j.sha } }); }
    send(404, { message: "Not Found" });
  });
});
await new Promise((r) => server.listen(0, r));
const base = `http://127.0.0.1:${server.address().port}/repos/OWNER/REPO`;
const gh = async (method, path, body) => { const r = await fetch(base + path, { method, headers: { ...H, Authorization: "Bearer TOKEN", "content-type": "application/json" }, body: body && JSON.stringify(body) }); const j = await r.json(); if (!r.ok) throw Object.assign(new Error(j.message), { status: r.status }); return j; };

export async function commitProposal(p) {
  const ref = await gh("GET", "/git/ref/heads/main");
  const head = ref.object.sha;
  if (head !== p.baseCommitSha && p.changedSinceBase) return { status: "stale" };
  const { tree } = await gh("GET", `/git/commits/${head}`);
  const entries = [];
  for (const f of p.files) {
    if (f.action === "delete") { entries.push({ path: f.path, mode: "100644", type: "blob", sha: null }); continue; }
    const blob = await gh("POST", "/git/blobs", { content: Buffer.from(f.content).toString("base64"), encoding: "base64" });
    entries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const newTree = await gh("POST", "/git/trees", { base_tree: tree.sha, tree: entries });
  const commit = await gh("POST", "/git/commits", { message: `agent(${p.agent}): ${p.title}\n\nProposal: #${p.id}\nApproved-by: ${p.approver}`, tree: newTree.sha, parents: [head] });
  await gh("PATCH", "/git/refs/heads/main", { sha: commit.sha, force: false });
  return { status: "committed", sha: commit.sha };
}

const proposal = { id: 7, agent: "candidate-job-matching-expert", title: "Lower education weight", approver: "lead", baseCommitSha: "aaa111", changedSinceBase: false,
  files: [{ path: "packages/scoring/weights.json", action: "update", content: "{\"education\":10}" }, { path: "docs/old.md", action: "delete" }] };
const result = await commitProposal(proposal);
assert.deepEqual(result, { status: "committed", sha: "ccc333" });
assert.deepEqual(calls, ["GET /repos/OWNER/REPO/git/ref/heads/main", "GET /repos/OWNER/REPO/git/commits/aaa111", "POST /repos/OWNER/REPO/git/blobs", "POST /repos/OWNER/REPO/git/trees", "POST /repos/OWNER/REPO/git/commits", "PATCH /repos/OWNER/REPO/git/refs/heads/main"]);
const stale = await commitProposal({ ...proposal, id: 8, baseCommitSha: "aaa111", changedSinceBase: true }); // main is now ccc333
assert.equal(stale.status, "stale");
server.close();
console.log("OK: atomic commit flow verified (6 calls in order, force:false, parents=[head]); stale proposal blocked");
