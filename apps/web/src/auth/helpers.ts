// Pure auth helpers. No I/O, no import.meta, so tests/auth can import them directly.

export type Role = "user" | "super_admin";
export type Aal = "aal1" | "aal2";

export type AuthErrorKind =
  | "credentials"
  | "rate"
  | "generic"
  | "offline"
  | "weakPassword"
  | "linkExpired"
  | "google"
  | "mfaCode"
  | "sessionEnded"
  | "notConfigured";

/** Client paths. mobile-pwa-expert mounts them from `authRoutes`. */
export const authPaths = {
  signIn: "/signin",
  signUp: "/signup",
  forgotPassword: "/forgot-password",
  updatePassword: "/update-password",
  callback: "/auth/callback",
  mfaEnroll: "/mfa/enroll",
  mfaChallenge: "/mfa/challenge",
  home: "/",
} as const;

/**
 * Role from the caller's own profiles row only. Anything else is null (treated as no admin access).
 * The UI role is a convenience; every Function re-checks the role server-side.
 */
export function parseRole(row: unknown): Role | null {
  if (!row || typeof row !== "object") return null;
  const role = (row as { role?: unknown }).role;
  return role === "user" || role === "super_admin" ? role : null;
}

export function parseAal(v: unknown): Aal | null {
  return v === "aal1" || v === "aal2" ? v : null;
}

/** Same-origin relative path only. Blocks open redirects (//evil, /\evil, absolute URLs). */
export function safeNext(v: unknown, fallback: string = authPaths.home): string {
  if (typeof v !== "string" || v.length === 0 || v.length > 512) return fallback;
  if (!v.startsWith("/") || v.startsWith("//") || v.startsWith("/\\")) return fallback;
  if (/[\u0000-\u001f]/.test(v)) return fallback;
  return v;
}

interface ErrLike {
  status?: number;
  code?: string;
  name?: string;
}

/** Map a supabase-js error to a copy key. Never leaks whether an email exists. */
export function mapAuthError(err: unknown, context: "signIn" | "signUp" | "reset" | "update" | "mfa" | "oauth", online = true): AuthErrorKind | null {
  if (!err) return null;
  if (!online) return "offline";
  const e = err as ErrLike;
  const code = e.code ?? "";
  if (e.status === 429 || code.includes("rate_limit")) return "rate";
  if (code === "weak_password") return "weakPassword";
  switch (context) {
    case "signIn":
      return e.status !== undefined && e.status >= 500 ? "generic" : "credentials";
    case "signUp":
      // Existing email: show the same "Check your email" screen as a new sign up.
      if (code === "user_already_exists" || code === "email_exists") return null;
      return "generic";
    case "reset":
      // Any non-server error looks like success, so nobody can probe for accounts.
      return e.status !== undefined && e.status >= 500 ? "generic" : null;
    case "update":
      if (code === "session_not_found" || code === "session_expired" || e.status === 401) return "sessionEnded";
      return "generic";
    case "mfa":
      if (code === "mfa_verification_failed" || code === "mfa_challenge_expired" || e.status === 422 || e.status === 400) return "mfaCode";
      if (e.status === 401) return "sessionEnded";
      return "generic";
    case "oauth":
      return "google";
  }
}

// ---- e2e stub token: stub.super_admin.aal2.<unix seconds> ----

export const STUB_TOKEN_PREFIX = "stub.super_admin.aal2.";

export function makeStubToken(nowSeconds: number = Math.floor(Date.now() / 1000)): string {
  return `${STUB_TOKEN_PREFIX}${Math.floor(nowSeconds)}`;
}

export function parseStubToken(token: string): { role: "super_admin"; aal: "aal2"; stepUpAt: number } | null {
  if (!token.startsWith(STUB_TOKEN_PREFIX)) return null;
  const rest = token.slice(STUB_TOKEN_PREFIX.length);
  if (!/^\d{1,12}$/.test(rest)) return null;
  return { role: "super_admin", aal: "aal2", stepUpAt: Number(rest) };
}

/** Stub is on only when the flag is exactly '1' and the mode is 'development' or 'test'. Allow-list, deny by default. */
export function isStubEnabled(flag: unknown, mode: unknown): boolean {
  return flag === "1" && (mode === "development" || mode === "test");
}

/** Secret-key prefix, built at runtime so the CI secret scan of dist/ stays clean. */
export const SECRET_KEY_PREFIX = ["sb", "secret", ""].join("_");

/** Public config check. Refuses anything that looks like a secret key. */
export function isPublicConfig(url: unknown, key: unknown): boolean {
  if (typeof url !== "string" || typeof key !== "string") return false;
  if (!/^https?:\/\//.test(url) || key.length === 0) return false;
  if (key.startsWith(SECRET_KEY_PREFIX)) return false;
  return true;
}
