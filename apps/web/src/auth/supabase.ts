/// <reference types="vite/client" />
// Browser Supabase client. Only the project URL and the publishable key (both public). ADR 0006.
// Never a secret key or the legacy service_role key.
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SECRET_KEY_PREFIX, isPublicConfig, isStubEnabled } from "./helpers";

const url: unknown = import.meta.env.VITE_SUPABASE_URL;
const publishableKey: unknown = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** e2e stub: VITE_E2E_AUTH_STUB === '1' and a non-production build mode. Never on in production. */
export const authStub: boolean = isStubEnabled(import.meta.env.VITE_E2E_AUTH_STUB, import.meta.env.MODE);

/** False when env is missing (or looks like a secret key). The app still runs, with sign in off. */
export const authConfigured: boolean = !authStub && isPublicConfig(url, publishableKey);

if (typeof publishableKey === "string" && publishableKey.startsWith(SECRET_KEY_PREFIX)) {
  console.error("Refusing a secret key in the browser. Use the publishable key.");
}

export const supabase: SupabaseClient | null = authConfigured
  ? createClient(url as string, publishableKey as string, {
      auth: {
        flowType: "pkce",
        persistSession: true,
        autoRefreshToken: true,
        // We exchange the PKCE code ourselves in AuthCallback / UpdatePassword.
        detectSessionInUrl: false,
      },
    })
  : null;

// Guards a PKCE code against double exchange (React StrictMode runs effects twice).
const exchanges = new Map<string, Promise<{ error: unknown }>>();

export function exchangeCodeOnce(code: string): Promise<{ error: unknown }> {
  if (!supabase) return Promise.resolve({ error: new Error("not_configured") });
  let p = exchanges.get(code);
  if (!p) {
    p = supabase.auth.exchangeCodeForSession(code).then(({ error }) => ({ error }));
    exchanges.set(code, p);
  }
  return p;
}
