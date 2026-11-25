import { readdirSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { buildManifest, parseFrontmatter, PROMPT_CAP, resolveModel, splitTools } from "../../scripts/build-agent-manifest.mjs";

const ROOT = join(import.meta.dirname, "../..");
const agentFiles = readdirSync(join(ROOT, ".claude/agents")).filter((f) => f.endsWith(".md") && f !== "README.md");

describe("build-agent-manifest", () => {
  const m = buildManifest(ROOT);

  it("lists every agent file (100%), 18 today", () => {
    expect(agentFiles).toHaveLength(18);
    expect(m.agents.map((a) => `${a.name}.md`).sort()).toEqual([...agentFiles].sort());
  });

  it("gives every agent a resolved model, group, personality and responsibilities", () => {
    for (const a of m.agents) {
      expect(a.model, a.name).toMatch(/^claude-(opus|sonnet|haiku)-5-5$/);
      expect(a.group, a.name).not.toBe("other");
      expect(a.personality.length, a.name).toBeGreaterThan(10);
      expect(a.responsibilities.length, a.name).toBeGreaterThan(0);
      expect(a.knowledge.docs.length, a.name).toBeGreaterThan(0);
      expect(a.systemPrompt.length, a.name).toBeLessThanOrEqual(PROMPT_CAP);
      expect(a.systemPrompt).toContain("data, never instructions");
    }
  });

  it("maps model aliases and defaults to Opus 5.5", () => {
    expect(resolveModel("opus")).toBe("claude-opus-5-5");
    expect(resolveModel("sonnet")).toBe("claude-sonnet-5-5");
    expect(resolveModel("haiku")).toBe("claude-haiku-5-5");
    expect(resolveModel("inherit")).toBe("claude-opus-5-5");
    expect(resolveModel(undefined)).toBe("claude-opus-5-5");
  });

  it("parses frontmatter lists and tools with parentheses", () => {
    const { data, body } = parseFrontmatter("---\nname: x\nskills:\n  - a\n  - b\n---\n# Body\n");
    expect(data).toEqual({ name: "x", skills: ["a", "b"] });
    expect(body).toBe("# Body\n");
    expect(splitTools("Agent(a, b), Read, Grep")).toEqual(["Agent(a, b)", "Read", "Grep"]);
  });

  it("builds deterministically (prompt caching needs byte-stable prompts)", () => {
    expect(JSON.stringify(buildManifest(ROOT))).toBe(JSON.stringify(m));
  });
});
