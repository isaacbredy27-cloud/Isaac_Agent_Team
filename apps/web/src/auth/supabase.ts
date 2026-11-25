/// <reference types="vite/client" />
// Browser Supabase client. Only the project URL and the publishable key (both public). ADR 0006.
// Never a secret key or the legacy service_role key.
// supabase-js loads lazily on first use, so it stays out of the main bundle.
import type { SupabaseClient } from "@supabase/supabase-js";
import { SECRET_KEY_PREFIX, isPublicConfig, isStubEnabled } from "./helpers";

const url: unknown = import.meta.env.VITE_SUPABASE_URL;
const publishableKey: unknown = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

/** e2e stub: VITE_E2E_AUTH_STUB === '1' and mode 'development' or 'test'. Never on in production. */
export const authStub: boolean = isStubEnabled(import.meta.env.VITE_E2E_AUTH_STUB, import.meta.env.MODE);

/** False when env is missing (or looks like a secret key). The app still runs, with sign in off. */
export const authConfigured: boolean = !authStub && isPublicConfig(url, publishableKey);

if (typeof publishableKey === "string" && publishableKey.startsWith(SECRET_KEY_PREFIX)) {
  console.error("Refusing a secret key in the browser. Use the publishable key.");
}

let clientPromise: Promise<SupabaseClient | null> | null = null;

/** The one browser client, created on first call. Null when auth is not configured. */
export function getSupabase(): Promise<SupabaseClient | null> {
  if (!authConfigured) return Promise.resolve(null);
  if (!clientPromise) {
    clientPromise = import("@supabase/supabase-js").then(({ createClient }) =>
      createClient(url as string, publishableKey as string, {
        auth: {
          flowType: "pkce",
          persistSession: true,
          autoRefreshToken: true,
          // We exchange the PKCE code ourselves in AuthCallback / UpdatePassword.
          detectSessionInUrl: false,
        },
      }),
    );
    // A failed chunk load (offline) may retry on the next call.
    clientPromise.catch(() => {
      clientPromise = null;
    });
  }
  return clientPromise;
}

// Guards a PKCE code against double exchange (React StrictMode runs effects twice).
const exchanges = new Map<string, Promise<{ error: unknown }>>();

export function exchangeCodeOnce(code: string): Promise<{ error: unknown }> {
  let p = exchanges.get(code);
  if (!p) {
    p = getSupabase().then((sb) =>
      sb
        ? sb.auth.exchangeCodeForSession(code).then(({ error }) => ({ error }))
        : { error: new Error("not_configured") },
    );
    exchanges.set(code, p);
  }
  return p;
}
