import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@netlify/blobs", () => import("./blobs-mock"));
import { resetBlobs } from "./blobs-mock";
import approve from "../../netlify/functions/proposals-approve";
import { saveNewProposal, getProposal } from "../../netlify/functions/_lib/console/proposals";
import { commitMessage } from "../../netlify/functions/_lib/console/github";
import { hashSub } from "../../netlify/functions/_lib/console/audit";
import reject from "../../netlify/functions/proposals-reject";
import { getStore } from "./blobs-mock";

const BASE = "a".repeat(40);
const NEW = "c".repeat(40);
const ORIGIN = "https://console.test";
const SUPER = "00000000-0000-4000-8000-0000000000a1"; // stub super_admin userId
const now = () => Math.floor(Date.now() / 1000);

let head = BASE;
let calls: string[] = [];
let lastCommitBody: { message?: string; parents?: string[] } = {};

function mockGitHub() {
  vi.stubGlobal("fetch", async (url: string, init: RequestInit = {}) => {
    const u = new URL(url);
    const method = init.method ?? "GET";
    calls.push(`${method} ${u.pathname.replace("/repos/o/r", "")}`);
    const body = init.body ? JSON.parse(String(init.body)) : {};
    const send = (status: number, o: unknown) => new Response(JSON.stringify(o), { status, headers: { "content-type": "application/json" } });
    if (method === "GET" && u.pathname.endsWith("/git/ref/heads/main")) return send(200, { object: { sha: head } });
    if (method === "GET" && u.pathname.includes("/git/commits/")) return send(200, { tree: { sha: "tree0" } });
    if (method === "POST" && u.pathname.endsWith("/git/blobs")) return send(201, { sha: "blob1" });
    if (method === "POST" && u.pathname.endsWith("/git/trees")) return send(201, { sha: "tree1" });
    if (method === "POST" && u.pathname.endsWith("/git/commits")) { lastCommitBody = body; return send(201, { sha: NEW }); }
    if (method === "PATCH" && u.pathname.endsWith("/git/refs/heads/main")) {
      if (body.force !== false) return send(422, {});
      head = body.sha;
      return send(200, {});
    }
    return send(404, {});
  });
}

async function seed() {
  return saveNewProposal({
    agent: "orchestrator",
    title: "Update plan",
    rationale: "test",
    files: [{ path: "docs/plans/app-build.md", action: "update", before: "a\n", after: "b\n" }],
    diff: "-a\n+b\n",
    baseSha: BASE,
    status: "pending",
    requestedBy: SUPER,
    createdAt: new Date().toISOString(),
  });
}

const call = (id: string, opts: { confirm?: string; token?: string; origin?: string | null; body?: unknown } = {}) => {
  const headers: Record<string, string> = { authorization: `Bearer ${opts.token ?? `stub.super_admin.aal2.${now()}`}`, "content-type": "application/json" };
  if (opts.origin !== null) headers.origin = opts.origin ?? ORIGIN;
  const req = new Request(`${ORIGIN}/api/proposals/${id}/approve`, {
    method: "POST",
    headers,
    body: JSON.stringify(opts.body ?? { confirm: opts.confirm ?? id }),
  });
  return approve(req, { params: { id } } as never);
};

beforeEach(() => {
  resetBlobs();
  head = BASE;
  calls = [];
  vi.stubEnv("E2E_AUTH_STUB", "1");
  vi.stubEnv("CONTEXT", "test");
  vi.stubEnv("GITHUB_TOKEN", "test-token");
  vi.stubEnv("GITHUB_REPO", "o/r");
  vi.stubEnv("GITHUB_API_BASE", "https://gh.test");
  mockGitHub();
});
afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("POST /api/proposals/:id/approve", () => {
  it("commits atomically when base SHA is current, approver from claims", async () => {
    const p = await seed();
    const res = await call(p.id, { body: { confirm: p.id, approver: "attacker" } });
    expect(res.status).toBe(200);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(await res.json()).toEqual({ commitSha: NEW, commitUrl: `https://github.com/o/r/commit/${NEW}` });
    expect(calls).toEqual(["GET /git/ref/heads/main", `GET /git/commits/${BASE}`, "POST /git/blobs", "POST /git/trees", "POST /git/commits", "PATCH /git/refs/heads/main"]);
    expect(lastCommitBody.parents).toEqual([BASE]);
    expect(lastCommitBody.message).toBe(commitMessage({ agent: "orchestrator", title: "Update plan", id: p.id, approverSub: SUPER }));
    expect(lastCommitBody.message).toContain(`Approved-by: ${hashSub(SUPER)}`);
    expect(lastCommitBody.message).not.toContain(SUPER);
    const audit = getStore("audit");
    const events = await Promise.all((await audit.list()).blobs.map((b) => audit.get(b.key)));
    expect(events).toContainEqual(expect.objectContaining({ action: "approve", result: "approved", details: { stepUpAt: expect.any(Number) } }));
    expect(JSON.stringify(events)).not.toContain(SUPER);
    expect((await getProposal(p.id))?.proposal).toMatchObject({ status: "committed", reviewer: SUPER, commitSha: NEW });
  });

  it("returns 409 base_sha_changed and writes nothing when main moved", async () => {
    const p = await seed();
    head = "b".repeat(40);
    const res = await call(p.id);
    expect(res.status).toBe(409);
    expect(await res.json()).toEqual({ error: "base_sha_changed" });
    expect(calls).toEqual(["GET /git/ref/heads/main"]);
    expect((await getProposal(p.id))?.proposal.status).toBe("stale");
  });

  it("needs a fresh TOTP step-up", async () => {
    const p = await seed();
    const res = await call(p.id, { token: `stub.super_admin.aal2.${now() - 601}` });
    expect(res.status).toBe(403);
    expect(await res.json()).toEqual({ error: "step_up_required" });
    expect(calls).toEqual([]);
  });

  it("returns forbidden for a user and mfa_required at aal1", async () => {
    const p = await seed();
    expect(await (await call(p.id, { token: `stub.user.aal2.${now()}` })).json()).toEqual({ error: "forbidden" });
    expect(await (await call(p.id, { token: `stub.super_admin.aal1.${now()}` })).json()).toEqual({ error: "mfa_required" });
    expect(calls).toEqual([]);
  });

  it("rejects a mismatched confirm number and a foreign or missing Origin", async () => {
    const p = await seed();
    expect((await call(p.id, { confirm: "999" })).status).toBe(400);
    expect(await (await call(p.id, { origin: "https://evil.test" })).json()).toEqual({ error: "bad_origin" });
    expect(await (await call(p.id, { origin: null })).json()).toEqual({ error: "bad_origin" });
    expect(calls).toEqual([]);
  });

  it("returns 503 not_configured without GitHub env, and on Deploy Previews", async () => {
    const p = await seed();
    vi.stubEnv("GITHUB_TOKEN", "");
    expect((await call(p.id)).status).toBe(503);
    vi.stubEnv("GITHUB_TOKEN", "test-token");
    vi.stubEnv("CONTEXT", "deploy-preview");
    // Stub auth is off outside dev/test, so a Deploy Preview rejects the stub token outright.
    expect([401, 503]).toContain((await call(p.id)).status);
    expect(calls).toEqual([]);
  });

  it("blocks secrets in content at approve time (422 content_blocked)", async () => {
    const p = await seed();
    const store = getStore("proposals");
    const key = `p/${p.id.padStart(8, "0")}`;
    const raw = (await store.get(key)) as { files: Array<{ after?: string }> };
    raw.files[0]!.after = "token=github_pat_ABCDEFGHIJKLMNOPQRSTUVWX";
    await store.setJSON(key, raw);
    const res = await call(p.id);
    expect(res.status).toBe(422);
    expect(await res.json()).toEqual({ error: "content_blocked" });
    expect(calls).toEqual([]);
  });

  it("reject requires a matching Origin", async () => {
    const p = await seed();
    const req = (origin?: string) =>
      reject(new Request(`${ORIGIN}/api/proposals/${p.id}/reject`, {
        method: "POST",
        headers: { authorization: `Bearer stub.super_admin.aal2.${now()}`, ...(origin ? { origin } : {}) },
        body: "{}",
      }), { params: { id: p.id } } as never);
    expect(await (await req()).json()).toEqual({ error: "bad_origin" });
    expect(await (await req("https://evil.test")).json()).toEqual({ error: "bad_origin" });
    expect(await (await req(ORIGIN)).json()).toEqual({ status: "rejected" });
  });

  it("cannot approve twice", async () => {
    const p = await seed();
    expect((await call(p.id)).status).toBe(200);
    expect((await call(p.id)).status).toBe(409);
  });
});
