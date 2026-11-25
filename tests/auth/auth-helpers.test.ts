import { describe, expect, it } from "vitest";
import {
  isPublicConfig,
  isStubEnabled,
  makeStubToken,
  mapAuthError,
  parseAal,
  parseRole,
  parseStubToken,
  safeNext,
} from "../../apps/web/src/auth/helpers";

describe("parseRole (profiles row only)", () => {
  it("accepts only user and super_admin", () => {
    expect(parseRole({ role: "user" })).toBe("user");
    expect(parseRole({ role: "super_admin" })).toBe("super_admin");
    expect(parseRole({ role: "admin" })).toBeNull();
    expect(parseRole({ role: "service_role" })).toBeNull();
    expect(parseRole(null)).toBeNull();
    expect(parseRole(undefined)).toBeNull();
  });

  it("ignores a role hidden in user_metadata", () => {
    expect(parseRole({ user_metadata: { role: "super_admin" } })).toBeNull();
  });
});

describe("parseAal", () => {
  it("accepts aal1 and aal2 only", () => {
    expect(parseAal("aal1")).toBe("aal1");
    expect(parseAal("aal2")).toBe("aal2");
    expect(parseAal("aal3")).toBeNull();
    expect(parseAal(null)).toBeNull();
  });
});

describe("safeNext (no open redirects)", () => {
  it("keeps same-origin paths", () => {
    expect(safeNext("/agents")).toBe("/agents");
    expect(safeNext("/agents?x=1")).toBe("/agents?x=1");
  });
  it("rejects other origins and odd input", () => {
    for (const bad of ["//evil.example", "/\\evil.example", "https://evil.example", "javascript:alert(1)", "", "agents", "/a\nb", 42, null]) {
      expect(safeNext(bad)).toBe("/");
    }
  });
});

describe("mapAuthError (never reveals whether an email exists)", () => {
  it("returns null for no error", () => {
    expect(mapAuthError(null, "signIn")).toBeNull();
  });
  it("uses one message for any bad sign in", () => {
    expect(mapAuthError({ status: 400, code: "invalid_credentials" }, "signIn")).toBe("credentials");
    expect(mapAuthError({ status: 400, code: "email_not_confirmed" }, "signIn")).toBe("credentials");
    expect(mapAuthError({ status: 400, code: "user_not_found" }, "signIn")).toBe("credentials");
  });
  it("treats an existing email on sign up as success", () => {
    expect(mapAuthError({ status: 422, code: "user_already_exists" }, "signUp")).toBeNull();
    expect(mapAuthError({ status: 422, code: "email_exists" }, "signUp")).toBeNull();
  });
  it("treats a reset for an unknown email as success", () => {
    expect(mapAuthError({ status: 400, code: "user_not_found" }, "reset")).toBeNull();
    expect(mapAuthError({ status: 500 }, "reset")).toBe("generic");
  });
  it("maps rate limits and offline", () => {
    expect(mapAuthError({ status: 429 }, "signIn")).toBe("rate");
    expect(mapAuthError({ code: "over_email_send_rate_limit" }, "reset")).toBe("rate");
    expect(mapAuthError({ status: 400 }, "signIn", false)).toBe("offline");
  });
  it("maps MFA failures", () => {
    expect(mapAuthError({ status: 422, code: "mfa_verification_failed" }, "mfa")).toBe("mfaCode");
    expect(mapAuthError({ status: 401 }, "mfa")).toBe("sessionEnded");
  });
});

describe("e2e stub token", () => {
  it("has the shape stub.super_admin.aal2.<unix seconds>", () => {
    expect(makeStubToken(1_800_000_000)).toBe("stub.super_admin.aal2.1800000000");
    expect(parseStubToken("stub.super_admin.aal2.1800000000")).toEqual({ role: "super_admin", aal: "aal2", stepUpAt: 1_800_000_000 });
  });
  it("rejects other shapes", () => {
    expect(parseStubToken("stub.user.aal2.1")).toBeNull();
    expect(parseStubToken("stub.super_admin.aal2.")).toBeNull();
    expect(parseStubToken("stub.super_admin.aal2.12x")).toBeNull();
    expect(parseStubToken("eyJhbGciOiJFUzI1NiJ9.e30.sig")).toBeNull();
  });
  it("is never on in production mode", () => {
    expect(isStubEnabled("1", "production")).toBe(false);
    expect(isStubEnabled("1", "development")).toBe(true);
    expect(isStubEnabled("1", "test")).toBe(true);
    // Allow-list, not "anything but production": staging or custom modes stay off.
    expect(isStubEnabled("1", "e2e")).toBe(false);
    expect(isStubEnabled("1", "staging")).toBe(false);
    expect(isStubEnabled("1", undefined)).toBe(false);
    expect(isStubEnabled("true", "development")).toBe(false);
    expect(isStubEnabled(undefined, "development")).toBe(false);
  });
});

describe("isPublicConfig", () => {
  it("needs a URL and a publishable key", () => {
    expect(isPublicConfig("https://example-project.supabase.co", "sb_publishable_example")).toBe(true);
    expect(isPublicConfig(undefined, "sb_publishable_example")).toBe(false);
    expect(isPublicConfig("https://example-project.supabase.co", "")).toBe(false);
  });
  it("refuses a secret key", () => {
    expect(isPublicConfig("https://example-project.supabase.co", ["sb", "secret", "example"].join("_"))).toBe(false);
  });
});
