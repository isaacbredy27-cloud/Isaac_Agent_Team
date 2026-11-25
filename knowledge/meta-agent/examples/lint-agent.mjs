// Worked example: lint an agent file the way scripts/validate-agents.mjs does — frontmatter rules from the
// Claude Code docs plus project standards. Runs on the example agent and on every real agent in .claude/agents.
// Run: node lint-agent.mjs
import { readFileSync, readdirSync, existsSync } from "node:fs";
import assert from "node:assert/strict";

const KNOWN = new Set(["name", "description", "tools", "disallowedTools", "model", "permissionMode", "maxTurns", "autoCompactWindow", "skills", "mcpServers", "hooks", "memory", "background", "omitClaudeMd", "effort", "isolation", "color", "initialPrompt", "experimental"]);
export function lint(text, { skillsDir }) {
  const errors = [];
  if (!text.startsWith("---\n")) return ["frontmatter must start on line 1"];
  const fm = text.slice(4, text.indexOf("\n---", 4));
  const keys = [...fm.matchAll(/^([A-Za-z_]+):/gm)].map((m) => m[1]);
  for (const k of keys) if (!KNOWN.has(k)) errors.push(`unknown frontmatter field "${k}" (Claude Code ignores it silently)`);
  const name = fm.match(/^name:\s*(.+)$/m)?.[1]?.trim();
  if (!name || !/^[a-z][a-z0-9]*(-[a-z0-9]+)*$/.test(name) || name.length > 48) errors.push(`bad name "${name}"`);
  const desc = fm.match(/^description:\s*(.+)$/m)?.[1] ?? "";
  if (!desc) errors.push("missing description");
  if (desc.length > 300) errors.push(`description ${desc.length} chars > 300`);
  const tools = fm.match(/^tools:\s*(.+)$/m)?.[1] ?? "";
  if (name !== "orchestrator" && /\bAgent\b/.test(tools)) errors.push("only the orchestrator may have the Agent tool");
  if (/\bSendMessage\b/.test(tools)) errors.push("specialists must not message each other");
  if (/^memory:/m.test(fm) && !/\b(Edit|Write)\b/.test(tools)) errors.push("memory auto-grants Write/Edit to a read-only agent");
  const skills = [...fm.matchAll(/^\s+-\s+([a-z0-9-]+)\s*$/gm)].map((m) => m[1]);
  if (!skills.includes("architecture-decisions")) errors.push("must preload architecture-decisions");
  if (skills.length > 32) errors.push("more than 32 preloaded skills");
  for (const s of skills) if (skillsDir && !existsSync(`${skillsDir}/${s}/SKILL.md`)) errors.push(`skill not found: ${s}`);
  if (!/^## Before you answer/m.test(text) || !text.includes(`knowledge/${name}/`)) errors.push("missing 'Before you answer' section pointing at its knowledge folder");
  return errors;
}

const root = new URL("../../../", import.meta.url).pathname;
const skillsDir = root + ".claude/skills";
assert.deepEqual(lint(readFileSync(new URL("./good-agent.md", import.meta.url), "utf8"), { skillsDir }), []);
const bad = "---\nname: Bad_Name\ndescription: x\ntools: Read, Agent\npersonality: loud\n---\nbody";
assert.equal(lint(bad, { skillsDir }).length, 5);
const agentsDir = root + ".claude/agents";
const files = readdirSync(agentsDir).filter((f) => f.endsWith(".md") && f !== "README.md");
for (const f of files) assert.deepEqual(lint(readFileSync(`${agentsDir}/${f}`, "utf8"), { skillsDir }), [], f);
console.log(`OK: example agent clean; bad agent has 5 errors; all ${files.length} real agents in .claude/agents pass`);
