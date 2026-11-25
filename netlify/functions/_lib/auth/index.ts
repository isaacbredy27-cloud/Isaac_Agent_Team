// Auth helpers for Netlify Functions (ADR 0006, docs/security/supabase-auth.md §4).
// Owner: security-expert. Order on protected routes (skill agent-console §Access):
// requireUser -> requireRole -> requireAal2 -> requireStepUp -> requireLiveUser.
//
// E2E STUB (tests only). With E2E_AUTH_STUB=1 AND CONTEXT set to exactly "dev" or "test",
// a bearer token `stub.<role>.<aal>.<amrTs>` is accepted without Supabase:
//   role  = user | super_admin
//   aal   = aal1 | aal2
//   amrTs = unix seconds of a TOTP step-up, or "none" (amr becomes [{method:"password"}])
// e.g. `Bearer stub.super_admin.aal2.1764090000`.
// The stub is OFF when CONTEXT is unset, "production", "deploy-preview", "branch-deploy" or anything else.
// Deploy Previews are public URLs, so they are excluded on purpose. Netlify dev sets CONTEXT=dev;
// Playwright and Vitest set CONTEXT=test explicitly. Never set E2E_AUTH_STUB in the Netlify UI.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Context } from "@netlify/functions";
import { z } from "zod";

export const STEP_UP_MAX_AGE_S = 600;
const MAX_TOKEN_BYTES = 8192;
const CLOCK_SKEW_S = 60;
const STUB_CONTEXTS = new Set(["dev", "test"]);

const Role = z.enum(["user", "super_admin"]);
export type Role = z.infer<typeof Role>;
export type AuthErrorCode = "unauthorized" | "forbidden" | "mfa_required" | "step_up_required" | "auth_unavailable";
export type AmrEntry = { method: string; timestamp: number };

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403 | 503, public readonly code: AuthErrorCode) {
    super(code);
    this.name = "AuthError";
  }
}

export type AuthContext = {
  userId: string;
  role: Role;
  aal: "aal1" | "aal2";
  amr: AmrEntry[];
  token: string;
  /** Per-request client bound to the caller's token. `null` only in E2E stub mode. */
  supabase: SupabaseClient | null;
  stub: boolean;
};

export type SupabaseClientFactory = (url: string, publishableKey: string, token: string) => SupabaseClient;
export type AuthDeps = { createClient?: SupabaseClientFactory; env?: Record<string, string | undefined> };

/** Default: a fresh client per request, never module-level (warm functions share module scope). */
export const defaultClientFactory: SupabaseClientFactory = (url, key, token) =>
  createClient(url, key, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  });

let factoryOverride: SupabaseClientFactory | null = null;
/** Test seam. Pass `null` to restore the default. */
export function setSupabaseClientFactory(f: SupabaseClientFactory | null): void {
  factoryOverride = f;
}

/** True only when stubbing is explicitly enabled in a local or test context. Never in production. */
export function isE2EStubEnabled(env: Record<string, string | undefined> = process.env): boolean {
  return env.E2E_AUTH_STUB === "1" && typeof env.CONTEXT === "string" && STUB_CONTEXTS.has(env.CONTEXT);
}

const BEARER = /^Bearer ([A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+)$/;
const STUB = /^Bearer stub\.(user|super_admin)\.(aal1|aal2)\.(none|\d{1,12})$/;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const nowS = () => Math.floor(Date.now() / 1000);

export async function requireUser(req: Request, deps: AuthDeps = {}): Promise<AuthContext> {
  const env = deps.env ?? process.env;
  const header = req.headers.get("authorization") ?? "";
  if (header.length > MAX_TOKEN_BYTES + 7) throw new AuthError(401, "unauthorized");

  if (isE2EStubEnabled(env)) {
    const s = STUB.exec(header);
    if (s) {
      const role = s[1] as Role;
      const amr: AmrEntry[] = s[3] === "none" ? [{ method: "password", timestamp: nowS() }] : [{ method: "totp", timestamp: Number(s[3]) }];
      const userId = role === "super_admin" ? "00000000-0000-4000-8000-0000000000a1" : "00000000-0000-4000-8000-0000000000b2";
      return { userId, role, aal: s[2] as "aal1" | "aal2", amr, token: "stub", supabase: null, stub: true };
    }
  }

  const url = env.SUPABASE_URL ?? "";
  const key = env.SUPABASE_PUBLISHABLE_KEY ?? "";
  if (!url || !key) throw new AuthError(503, "auth_unavailable");

  const m = BEARER.exec(header);
  const token = m?.[1];
  if (!token || token.length > MAX_TOKEN_BYTES) throw new AuthError(401, "unauthorized");

  const factory = deps.createClient ?? factoryOverride ?? defaultClientFactory;
  const supabase = factory(url, key, token);

  let result: Awaited<ReturnType<SupabaseClient["auth"]["getClaims"]>>;
  try {
    result = await supabase.auth.getClaims(token);
  } catch {
    throw new AuthError(503, "auth_unavailable"); // JWKS fetch or runtime failure: fail closed
  }
  const { data, error } = result;
  if (error || !data) throw new AuthError(401, "unauthorized");
  const claims = data.claims as Record<string, unknown>;
  const alg = (data.header as { alg?: unknown } | undefined)?.alg;
  const now = nowS();
  if (
    alg !== "ES256" ||
    claims.iss !== `${url}/auth/v1` ||
    claims.role !== "authenticated" ||
    typeof claims.sub !== "string" || !UUID.test(claims.sub) ||
    typeof claims.exp !== "number" || claims.exp <= now ||
    claims.is_anonymous === true
  ) throw new AuthError(401, "unauthorized");
  const userId = claims.sub as string;

  let row: { role?: unknown } | null;
  try {
    const res = await supabase.from("profiles").select("role").eq("id", userId).maybeSingle();
    if (res.error) throw new AuthError(503, "auth_unavailable");
    row = res.data as { role?: unknown } | null;
  } catch {
    throw new AuthError(503, "auth_unavailable");
  }
  // No row = least-privilege "user" (task brief 1c, agent-console skill). Unknown value = 403.
  const parsed = Role.safeParse(row ? row.role : "user");
  if (!parsed.success) throw new AuthError(403, "forbidden");

  const amr: AmrEntry[] = Array.isArray(claims.amr)
    ? claims.amr.filter((a): a is AmrEntry =>
        !!a && typeof a === "object" && typeof (a as AmrEntry).method === "string" && typeof (a as AmrEntry).timestamp === "number")
    : [];
  return { userId, role: parsed.data, aal: claims.aal === "aal2" ? "aal2" : "aal1", amr, token, supabase, stub: false };
}

export function requireRole(ctx: AuthContext, role: "super_admin"): void {
  if (ctx.role !== role) throw new AuthError(403, "forbidden");
}

export function requireAal2(ctx: AuthContext): void {
  if (ctx.aal !== "aal2") throw new AuthError(403, "mfa_required");
}

export function requireStepUp(ctx: AuthContext, now: number = nowS()): void {
  const last = ctx.amr[0];
  if (!last || last.method !== "totp" || now - last.timestamp > STEP_UP_MAX_AGE_S || last.timestamp > now + CLOCK_SKEW_S)
    throw new AuthError(403, "step_up_required");
}

/** Server round-trip (getUser) for instant revocation on Approve and Revert. No-op in stub mode. */
export async function requireLiveUser(ctx: AuthContext): Promise<void> {
  if (ctx.stub) return;
  if (!ctx.supabase) throw new AuthError(503, "auth_unavailable");
  let res: Awaited<ReturnType<SupabaseClient["auth"]["getUser"]>>;
  try {
    res = await ctx.supabase.auth.getUser(ctx.token);
  } catch {
    throw new AuthError(503, "auth_unavailable");
  }
  if (res.error || res.data.user?.id !== ctx.userId) throw new AuthError(401, "unauthorized");
}

export type AuthedHandler = (req: Request, context: Context, auth: AuthContext) => Promise<Response> | Response;
export type WithAuthOptions = { superAdmin?: true; stepUp?: true; deps?: AuthDeps };

export function authErrorResponse(e: AuthError): Response {
  const headers: Record<string, string> = { "Content-Type": "application/json", "Cache-Control": "private, no-store" };
  if (e.status === 401) headers["WWW-Authenticate"] = "Bearer";
  return new Response(JSON.stringify({ error: e.code }), { status: e.status, headers });
}

/** `stepUp` implies `superAdmin`. Role runs before MFA so a `user` never learns a route needs MFA. */
export function withAuth(handler: AuthedHandler, opts: WithAuthOptions = {}) {
  return async (req: Request, context: Context): Promise<Response> => {
    try {
      const auth = await requireUser(req, opts.deps);
      if (opts.superAdmin || opts.stepUp) {
        requireRole(auth, "super_admin");
        requireAal2(auth);
      }
      if (opts.stepUp) requireStepUp(auth);
      return await handler(req, context, auth);
    } catch (e) {
      if (e instanceof AuthError) return authErrorResponse(e);
      throw e;
    }
  };
}
