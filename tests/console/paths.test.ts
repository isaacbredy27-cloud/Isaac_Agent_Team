import { describe, expect, it } from "vitest";
import { validatePath } from "../../netlify/functions/_lib/auth/paths";
import { containsSecret, prepareProposalFiles } from "../../netlify/functions/_lib/console/proposals";

const DOCS = ["docs/**"];

describe("proposal path validation (deny wins)", () => {
  it.each([
    ["netlify.toml", "denied"],
    ["netlify/functions/agents-chat.ts", "denied"],
    ["package.json", "denied"],
    [".github/workflows/ci.yml", "denied"],
    [".env.production", "denied"],
    ["docs/.env", "denied"],
    ["docs/cert.pem", "denied"],
    ["scripts/build-agent-manifest.mjs", "denied"],
    ["../etc/passwd", "traversal"],
    ["/etc/passwd", "absolute"],
    ["docs/%2e%2e/x", "bad_chars"],
    ["docs\\x.md", "bad_chars"],
    ["docs/./x.md", "not_canonical"],
    ["tools/x.ts", "not_allowed"],
  ])("rejects %s (%s)", (p, reason) => {
    expect(validatePath(p, [...DOCS, "netlify/**", "scripts/**", "**"])).toMatchObject({ ok: false, reason });
  });

  it("rejects a globally allowed path outside the agent's own globs", () => {
    expect(validatePath("packages/scoring/x.ts", DOCS)).toEqual({ ok: false, reason: "not_allowed" });
  });

  it("accepts an allowed path inside the agent's globs", () => {
    expect(validatePath("docs/README.md", DOCS)).toEqual({ ok: true, path: "docs/README.md" });
  });

  it("rejects the whole proposal when any file is denied", async () => {
    const res = await prepareProposalFiles(
      { title: "t", rationale: "r", files: [{ path: "docs/a.md", action: "update", content: "x" }, { path: "netlify.toml", action: "update", content: "y" }] },
      ["docs/**", "netlify.toml"],
      async () => "old",
    );
    expect(res.ok).toBe(false);
    if (!res.ok) expect(res.errors.join()).toMatch(/netlify\.toml.*denied/);
  });

  it("rejects secrets and builds a diff for clean files", async () => {
    expect(containsSecret("key=sk-ant-api03-abcdefghijklmnop")).toBe(true);
    const bad = await prepareProposalFiles({ title: "t", rationale: "r", files: [{ path: "docs/a.md", action: "update", content: "github_pat_ABCDEFGHIJKLMNOPQRSTUVWX" }] }, DOCS, async () => "old");
    expect(bad).toMatchObject({ ok: false });
    const good = await prepareProposalFiles({ title: "t", rationale: "r", files: [{ path: "docs/a.md", action: "update", content: "new\n" }] }, DOCS, async () => "old\n");
    expect(good.ok).toBe(true);
    if (good.ok) {
      expect(good.diff).toContain("-old");
      expect(good.diff).toContain("+new");
    }
  });
});
