// Auth context. Role comes from the caller's own profiles row (RLS), never user_metadata.
// The UI uses role and aal for routing only. Every Function re-checks token, role, aal2 and step-up.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { authConfigured, authStub, supabase } from "./supabase";
import { authPaths, makeStubToken, mapAuthError, parseAal, parseRole, type Aal, type AuthErrorKind, type Role } from "./helpers";

export interface AuthResult {
  error: AuthErrorKind | null;
}

export interface TotpEnrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

export interface AuthContextValue {
  configured: boolean;
  stub: boolean;
  loading: boolean;
  session: Session | null;
  user: User | null;
  role: Role | null;
  aal: { current: Aal | null; next: Aal | null };
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<AuthResult>;
  resetPassword(email: string): Promise<AuthResult>;
  updatePassword(password: string): Promise<AuthResult>;
  signInWithGoogle(): Promise<AuthResult>;
  /** Current access token, refreshed by supabase-js. Null when signed out. */
  getAccessToken(): Promise<string | null>;
  /** Re-read role and aal (after MFA verify or refresh). */
  refresh(): Promise<void>;
  mfaEnroll(): Promise<AuthResult & { enrollment?: TotpEnrollment }>;
  /** Verify a code for a factor (enrolment) or the first verified TOTP factor (challenge, step-up). */
  mfaVerify(code: string, factorId?: string): Promise<AuthResult>;
  hasVerifiedTotp(): Promise<boolean>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

const online = () => (typeof navigator === "undefined" ? true : navigator.onLine !== false);
const origin = () => (typeof window === "undefined" ? "" : window.location.origin);

// ---------- e2e stub (never in production builds; see supabase.ts) ----------

const STUB_USER = {
  id: "00000000-0000-4000-8000-000000000001",
  email: "e2e-admin@example.test",
  aud: "authenticated",
  app_metadata: {},
  user_metadata: {},
  created_at: "2026-01-01T00:00:00Z",
} as unknown as User;

function stubSession(token: string): Session {
  return {
    access_token: token,
    refresh_token: "stub",
    token_type: "bearer",
    expires_in: 3600,
    expires_at: Math.floor(Date.now() / 1000) + 3600,
    user: STUB_USER,
  } as Session;
}

function useStubAuth(): AuthContextValue {
  const [session, setSession] = useState<Session | null>(() => stubSession(makeStubToken()));
  const ok: AuthResult = { error: null };
  const signIn = useCallback(async () => {
    setSession(stubSession(makeStubToken()));
    return ok;
  }, []);
  return useMemo<AuthContextValue>(
    () => ({
      configured: true,
      stub: true,
      loading: false,
      session,
      user: session ? STUB_USER : null,
      role: session ? "super_admin" : null,
      aal: session ? { current: "aal2", next: "aal2" } : { current: null, next: null },
      signIn,
      signUp: async () => ok,
      signOut: async () => {
        setSession(null);
        return ok;
      },
      resetPassword: async () => ok,
      updatePassword: async () => ok,
      signInWithGoogle: signIn,
      getAccessToken: async () => session?.access_token ?? null,
      refresh: async () => {},
      mfaEnroll: async () => ({ error: null, enrollment: { factorId: "stub", qrCode: "", secret: "STUBSTUBSTUBSTUB" } }),
      mfaVerify: async (code: string) => {
        if (!/^\d{6}$/.test(code)) return { error: "mfaCode" };
        // Step-up refresh: a new token with a fresh timestamp.
        setSession(stubSession(makeStubToken()));
        return ok;
      },
      hasVerifiedTotp: async () => true,
    }),
    [session, signIn],
  );
}

// ---------- real Supabase ----------

const NOT_CONFIGURED: AuthResult = { error: "notConfigured" };

function useSupabaseAuth(): AuthContextValue {
  const [loading, setLoading] = useState<boolean>(authConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [role, setRole] = useState<Role | null>(null);
  const [aal, setAal] = useState<{ current: Aal | null; next: Aal | null }>({ current: null, next: null });
  const seq = useRef(0);

  const load = useCallback(async (s: Session | null) => {
    const mine = ++seq.current;
    setSession(s);
    if (!supabase || !s) {
      setRole(null);
      setAal({ current: null, next: null });
      setLoading(false);
      return;
    }
    const [profile, level] = await Promise.all([
      supabase.from("profiles").select("role").eq("id", s.user.id).maybeSingle(),
      supabase.auth.mfa.getAuthenticatorAssuranceLevel(),
    ]);
    if (mine !== seq.current) return; // a newer auth event won
    setRole(profile.error ? null : parseRole(profile.data));
    setAal({ current: parseAal(level.data?.currentLevel), next: parseAal(level.data?.nextLevel) });
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!supabase) return;
    const client = supabase;
    let active = true;
    client.auth.getSession().then(({ data }) => {
      if (active) void load(data.session);
    });
    const { data: sub } = client.auth.onAuthStateChange((_event, s) => {
      // Do not await Supabase calls inside this callback; defer them.
      setTimeout(() => {
        if (active) void load(s);
      }, 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, [load]);

  const refresh = useCallback(async () => {
    if (!supabase) return;
    const { data } = await supabase.auth.getSession();
    await load(data.session);
  }, [load]);

  return useMemo<AuthContextValue>(() => {
    const sb = supabase;
    if (!sb) {
      const off = async () => NOT_CONFIGURED;
      return {
        configured: false,
        stub: false,
        loading: false,
        session: null,
        user: null,
        role: null,
        aal: { current: null, next: null },
        signIn: off,
        signUp: off,
        signOut: off,
        resetPassword: off,
        updatePassword: off,
        signInWithGoogle: off,
        getAccessToken: async () => null,
        refresh: async () => {},
        mfaEnroll: off,
        mfaVerify: off,
        hasVerifiedTotp: async () => false,
      };
    }
    return {
      configured: true,
      stub: false,
      loading,
      session,
      user: session?.user ?? null,
      role,
      aal,
      async signIn(email, password) {
        const { error } = await sb.auth.signInWithPassword({ email, password });
        return { error: mapAuthError(error, "signIn", online()) };
      },
      async signUp(email, password) {
        const { error } = await sb.auth.signUp({
          email,
          password,
          options: { emailRedirectTo: `${origin()}${authPaths.callback}` },
        });
        return { error: mapAuthError(error, "signUp", online()) };
      },
      async signOut() {
        const { error } = await sb.auth.signOut();
        return { error: error ? mapAuthError(error, "update", online()) : null };
      },
      async resetPassword(email) {
        const { error } = await sb.auth.resetPasswordForEmail(email, {
          redirectTo: `${origin()}${authPaths.updatePassword}`,
        });
        return { error: mapAuthError(error, "reset", online()) };
      },
      async updatePassword(password) {
        const { error } = await sb.auth.updateUser({ password });
        return { error: mapAuthError(error, "update", online()) };
      },
      async signInWithGoogle() {
        const { error } = await sb.auth.signInWithOAuth({
          provider: "google",
          options: { redirectTo: `${origin()}${authPaths.callback}` },
        });
        return { error: mapAuthError(error, "oauth", online()) };
      },
      async getAccessToken() {
        const { data } = await sb.auth.getSession();
        return data.session?.access_token ?? null;
      },
      refresh,
      async mfaEnroll() {
        // Drop stale unverified TOTP factors first, so a retry does not hit a name clash.
        const listed = await sb.auth.mfa.listFactors();
        for (const f of listed.data?.all ?? []) {
          if (f.factor_type === "totp" && f.status === "unverified") await sb.auth.mfa.unenroll({ factorId: f.id });
        }
        const { data, error } = await sb.auth.mfa.enroll({ factorType: "totp" });
        if (error || !data) return { error: mapAuthError(error ?? new Error("enroll"), "mfa", online()) };
        return { error: null, enrollment: { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret } };
      },
      async mfaVerify(code, factorId) {
        let id = factorId;
        if (!id) {
          const listed = await sb.auth.mfa.listFactors();
          id = listed.data?.totp.find((f) => f.status === "verified")?.id;
        }
        if (!id) return { error: "generic" };
        const { error } = await sb.auth.mfa.challengeAndVerify({ factorId: id, code });
        if (error) return { error: mapAuthError(error, "mfa", online()) };
        await refresh();
        return { error: null };
      },
      async hasVerifiedTotp() {
        const listed = await sb.auth.mfa.listFactors();
        return (listed.data?.totp ?? []).some((f) => f.status === "verified");
      },
    };
  }, [loading, session, role, aal, refresh]);
}

const useAuthImpl = authStub ? useStubAuth : useSupabaseAuth;

export function AuthProvider({ children }: { children: ReactNode }) {
  const value = useAuthImpl();
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
