import { describe, it, expect } from "vitest";
import { validatePath, globToRegExp, GLOBAL_PATHS } from "../../netlify/functions/_lib/auth/paths.ts";

const ALL = ["**"];
const reason = (p: unknown, g: readonly string[] = ALL) => { const v = validatePath(p, g); return v.ok ? "ok" : v.reason; };

describe("validatePath", () => {
  it("allows global-allowed paths inside agent globs", () => {
    expect(reason("apps/web/src/App.tsx")).toBe("ok");
    expect(reason("docs/security/x.md", ["docs/security/**"])).toBe("ok");
    expect(reason(".claude/skills/a/SKILL.md")).toBe("ok");
  });
  it.each([
    ["../etc/passwd", "traversal"], ["docs/../netlify.toml", "traversal"], ["docs/a/..", "traversal"],
    ["/etc/passwd", "absolute"], ["docs\\a.md", "bad_chars"], ["docs/a\0.md", "bad_chars"],
    ["docs/%2e%2e/netlify.toml", "bad_chars"], ["docs/%2fetc", "bad_chars"], ["C:/x.md", "bad_chars"],
    ["docs/ä.md", "bad_chars"], ["docs//a.md", "not_canonical"], ["./docs/a.md", "not_canonical"],
    ["docs/./a.md", "not_canonical"], ["docs/", "not_canonical"], ["", "empty"], [42, "empty"],
    ["docs/" + "a".repeat(600), "too_long"],
  ])("rejects %j as %s", (p, r) => expect(reason(p)).toBe(r));
  it.each([
    "netlify.toml", "NETLIFY.TOML", "netlify/functions/x.ts", "package.json", "package-lock.json",
    ".github/workflows/ci.yml", ".env", ".env.local", "docs/.env", "packages/a/.env.prod",
    "docs/key.pem", "docs/.env/x.md", "packages/x/id.key", "scripts/build.mjs",
  ])("denies %s", (p) => expect(reason(p)).not.toBe("ok"));
  it("deny wins over allow and agent globs", () => {
    const lists = { allow: ["**"], deny: ["docs/secret/**"] };
    expect(validatePath("docs/secret/a.md", ["docs/**"], lists)).toEqual({ ok: false, reason: "denied" });
  });
  it("requires both global allow and agent globs", () => {
    expect(reason("README.md")).toBe("not_allowed");
    expect(reason("netlify/edge/x.ts")).toBe("not_allowed");
    expect(reason("packages/scoring/a.ts", ["docs/**"])).toBe("not_allowed");
    expect(reason("docs/a.md", [])).toBe("not_allowed");
  });
  it("glob matcher semantics", () => {
    expect(globToRegExp("package*.json").test("package-lock.json")).toBe(true);
    expect(globToRegExp("package*.json").test("a/package.json")).toBe(false);
    expect(globToRegExp("**/*.pem").test("k.pem")).toBe(true);
    expect(globToRegExp("docs/*.md").test("docs/a/b.md")).toBe(false);
    expect(globToRegExp("a.b").test("axb")).toBe(false);
  });
  it("config has the skill lists", () => {
    expect(GLOBAL_PATHS.allow).toContain("tests/**");
    expect(GLOBAL_PATHS.deny).toEqual(expect.arrayContaining(["netlify.toml", "netlify/functions/**", "package*.json", ".github/**", ".env*", "**/*.pem", "**/*.key", "scripts/**"]));
  });
  it("fuzz: no accepted path contains traversal or a denied target", () => {
    const parts = ["docs", "..", ".", "netlify.toml", "%2e", "a.md", "", "\\", ".env", "packages"];
    for (let i = 0; i < 3000; i++) {
      const p = Array.from({ length: 1 + (i % 4) }, (_, k) => parts[(i * 7 + k * 13 + (i >> k)) % parts.length]).join("/");
      const v = validatePath(p, ALL);
      if (v.ok) {
        expect(v.path.split("/")).not.toContain("..");
        expect(v.path.toLowerCase()).not.toMatch(/^netlify\.toml$|(^|\/)\.env|%|\\/);
      }
    }
  });
});
