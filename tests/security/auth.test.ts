// Synthetic tokens and IDs only. No network: the Supabase client is stubbed.
import { describe, it, expect, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "@netlify/functions";
import {
  AuthError, requireUser, requireRole, requireAal2, requireStepUp, withAuth,
  isE2EStubEnabled, setSupabaseClientFactory, STEP_UP_MAX_AGE_S, type AuthContext, type AuthDeps,
} from "../../netlify/functions/_lib/auth/index.ts";

const URL_ = "https://test-project.supabase.co";
const SUB = "3f9a0000-0000-4000-8000-000000000001";
const TOKEN = "aaa.bbb.ccc";
const now = () => Math.floor(Date.now() / 1000);
const env = { SUPABASE_URL: URL_, SUPABASE_PUBLISHABLE_KEY: "sb_publishable_TEST" };

type Opts = {
  claims?: Record<string, unknown>; alg?: string; claimsError?: boolean; claimsThrow?: boolean;
  row?: { role: unknown } | null; dbError?: boolean;
};
function fakeFactory(o: Opts = {}) {
  const seen: { token?: string; url?: string; eqId?: unknown } = {};
  const claims = { iss: `${URL_}/auth/v1`, role: "authenticated", sub: SUB, exp: now() + 300, aal: "aal1", amr: [], ...o.claims };
  const client = {
    auth: {
      getClaims: async (t: string) => {
        if (o.claimsThrow) throw new Error("jwks down");
        seen.token = t;
        return o.claimsError ? { data: null, error: new Error("bad") } : { data: { claims, header: { alg: o.alg ?? "ES256" }, signature: "" }, error: null };
      },
    },
    from: (table: string) => ({
      select: (cols: string) => ({
        eq: (col: string, v: unknown) => {
          expect([table, cols, col]).toEqual(["profiles", "role", "id"]);
          seen.eqId = v;
          return { maybeSingle: async () => (o.dbError ? { data: null, error: new Error("db") } : { data: o.row === undefined ? { role: "user" } : o.row, error: null }) };
        },
      }),
    }),
  };
  const deps: AuthDeps = { env, createClient: (url, _k, t) => { seen.url = url; seen.token = t; return client as unknown as SupabaseClient; } };
  return { deps, seen };
}
const req = (auth?: string) => new Request("https://example.test/api/x", { headers: auth ? { authorization: auth } : {} });
const code = async (p: Promise<unknown>) => { try { await p; return "ok"; } catch (e) { return e instanceof AuthError ? `${e.status}:${e.code}` : String(e); } };

describe("requireUser", () => {
  it("accepts a valid token and reads role from profiles", async () => {
    const { deps, seen } = fakeFactory({ row: { role: "super_admin" } });
    const ctx = await requireUser(req(`Bearer ${TOKEN}`), deps);
    expect(ctx).toMatchObject({ userId: SUB, role: "super_admin", aal: "aal1", stub: false });
    expect(seen).toMatchObject({ token: TOKEN, url: URL_, eqId: SUB });
  });
  it("no profiles row means user", async () => {
    const { deps } = fakeFactory({ row: null });
    expect((await requireUser(req(`Bearer ${TOKEN}`), deps)).role).toBe("user");
  });
  it.each([
    ["missing header", undefined, {}],
    ["not bearer", `Basic ${TOKEN}`, {}],
    ["malformed", "Bearer abc", {}],
    ["oversize", `Bearer ${"a".repeat(8200)}.b.c`, {}],
    ["getClaims error", `Bearer ${TOKEN}`, { claimsError: true }],
    ["wrong alg", `Bearer ${TOKEN}`, { alg: "HS256" }],
    ["wrong iss", `Bearer ${TOKEN}`, { claims: { iss: "https://evil.supabase.co/auth/v1" } }],
    ["wrong role claim", `Bearer ${TOKEN}`, { claims: { role: "service_role" } }],
    ["expired", `Bearer ${TOKEN}`, { claims: { exp: now() - 1 } }],
    ["non-uuid sub", `Bearer ${TOKEN}`, { claims: { sub: "admin" } }],
    ["anonymous", `Bearer ${TOKEN}`, { claims: { is_anonymous: true } }],
  ] as const)("401 on %s", async (_n, h, o) => {
    expect(await code(requireUser(req(h), fakeFactory(o as Opts).deps))).toBe("401:unauthorized");
  });
  it("503 on profiles error, getClaims throw, missing env", async () => {
    expect(await code(requireUser(req(`Bearer ${TOKEN}`), fakeFactory({ dbError: true }).deps))).toBe("503:auth_unavailable");
    expect(await code(requireUser(req(`Bearer ${TOKEN}`), fakeFactory({ claimsThrow: true }).deps))).toBe("503:auth_unavailable");
    const { deps } = fakeFactory();
    expect(await code(requireUser(req(`Bearer ${TOKEN}`), { ...deps, env: { SUPABASE_URL: URL_ } }))).toBe("503:auth_unavailable");
  });
  it("403 on unknown role value; role in JWT or metadata grants nothing", async () => {
    expect(await code(requireUser(req(`Bearer ${TOKEN}`), fakeFactory({ row: { role: "root" } }).deps))).toBe("403:forbidden");
    const { deps } = fakeFactory({ claims: { user_metadata: { role: "super_admin" }, app_metadata: { role: "super_admin" } } });
    expect((await requireUser(req(`Bearer ${TOKEN}`), deps)).role).toBe("user");
  });
  it("module-level factory override works and resets", async () => {
    const { deps } = fakeFactory({ row: { role: "super_admin" } });
    setSupabaseClientFactory(deps.createClient!);
    try { expect((await requireUser(req(`Bearer ${TOKEN}`), { env })).role).toBe("super_admin"); }
    finally { setSupabaseClientFactory(null); }
  });
});

const ctx = (p: Partial<AuthContext>): AuthContext =>
  ({ userId: SUB, role: "super_admin", aal: "aal2", amr: [], token: "t", supabase: null, stub: false, ...p });

describe("role, aal2, step-up", () => {
  it("requireRole", () => {
    expect(() => requireRole(ctx({ role: "user" }), "super_admin")).toThrow(expect.objectContaining({ status: 403, code: "forbidden" }));
    expect(() => requireRole(ctx({}), "super_admin")).not.toThrow();
  });
  it("requireAal2", () => {
    expect(() => requireAal2(ctx({ aal: "aal1" }))).toThrow(expect.objectContaining({ code: "mfa_required" }));
    expect(() => requireAal2(ctx({}))).not.toThrow();
  });
  it("requireStepUp boundary and method", () => {
    const t = 1_000_000;
    const at = (method: string, ts: number) => ctx({ amr: [{ method, timestamp: ts }] });
    expect(() => requireStepUp(at("totp", t - STEP_UP_MAX_AGE_S), t)).not.toThrow();
    for (const c of [at("totp", t - STEP_UP_MAX_AGE_S - 1), at("password", t), at("totp", t + 120), ctx({ amr: [] })])
      expect(() => requireStepUp(c, t)).toThrow(expect.objectContaining({ status: 403, code: "step_up_required" }));
  });
});

describe("withAuth", () => {
  const ok = async () => new Response("ok");
  const run = async (opts: Parameters<typeof withAuth>[1], o: Opts, h = `Bearer ${TOKEN}`) =>
    withAuth(ok, { ...opts, deps: fakeFactory(o).deps })(req(h), {} as Context);
  const sa = (aal: string, amr: unknown[] = []) => ({ row: { role: "super_admin" }, claims: { aal, amr } });

  it("returns JSON error with private, no-store", async () => {
    const r = await run({}, {}, "");
    expect(r.status).toBe(401);
    expect(r.headers.get("cache-control")).toBe("private, no-store");
    expect(r.headers.get("www-authenticate")).toBe("Bearer");
    expect(await r.json()).toEqual({ error: "unauthorized" });
  });
  it("user gets forbidden before any MFA hint", async () => {
    const r = await run({ superAdmin: true }, { row: { role: "user" }, claims: { aal: "aal1" } });
    expect([r.status, await r.json()]).toEqual([403, { error: "forbidden" }]);
  });
  it("aal1 super_admin gets mfa_required", async () => {
    const r = await run({ superAdmin: true }, sa("aal1"));
    expect([r.status, await r.json()]).toEqual([403, { error: "mfa_required" }]);
  });
  it("stale step-up gets step_up_required; fresh passes", async () => {
    const r = await run({ stepUp: true }, sa("aal2", [{ method: "totp", timestamp: now() - 601 }]));
    expect([r.status, await r.json()]).toEqual([403, { error: "step_up_required" }]);
    const r2 = await run({ stepUp: true }, sa("aal2", [{ method: "totp", timestamp: now() - 10 }]));
    expect(r2.status).toBe(200);
  });
  it("503 on db error", async () => {
    const r = await run({}, { dbError: true });
    expect([r.status, await r.json()]).toEqual([503, { error: "auth_unavailable" }]);
  });
});

describe("E2E stub", () => {
  afterEach(() => setSupabaseClientFactory(null));
  const stubEnv = (CONTEXT?: string) => ({ ...env, E2E_AUTH_STUB: "1", CONTEXT });
  it("is impossible outside dev/test contexts", () => {
    for (const c of ["production", "deploy-preview", "branch-deploy", undefined, "", "Production", "dev "])
      expect(isE2EStubEnabled(stubEnv(c))).toBe(false);
    expect(isE2EStubEnabled({ CONTEXT: "test", E2E_AUTH_STUB: "true" })).toBe(false);
    expect(isE2EStubEnabled(stubEnv("test"))).toBe(true);
  });
  it("production rejects stub tokens with 401", async () => {
    const { deps } = fakeFactory({ claimsError: true });
    expect(await code(requireUser(req("Bearer stub.super_admin.aal2.1"), { ...deps, env: stubEnv("production") }))).toBe("401:unauthorized");
  });
  it("test context accepts stub tokens", async () => {
    const ts = now() - 5;
    const c = await requireUser(req(`Bearer stub.super_admin.aal2.${ts}`), { env: stubEnv("test") });
    expect(c).toMatchObject({ role: "super_admin", aal: "aal2", stub: true, supabase: null });
    expect(() => requireStepUp(c)).not.toThrow();
    const u = await requireUser(req("Bearer stub.user.aal1.none"), { env: stubEnv("dev") });
    expect(() => requireRole(u, "super_admin")).toThrow(AuthError);
  });
});
