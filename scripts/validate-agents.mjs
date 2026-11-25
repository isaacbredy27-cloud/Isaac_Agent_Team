#!/usr/bin/env node
// Validates the agent ecosystem (ADR 0005, docs/expert-roster.md §10–§13).
// Usage: node scripts/validate-agents.mjs        Exit code 1 on any error.
import { readFileSync, readdirSync, existsSync, statSync } from "node:fs";
import { join } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;
const AGENTS_DIR = join(ROOT, ".claude/agents");
const SKILLS_DIR = join(ROOT, ".claude/skills");
const KNOWLEDGE_DIR = join(ROOT, "knowledge");

// Roster (docs/expert-roster.md §2) — 14 required + 3 approved additions.
const ROSTER = [
  "orchestrator", "meta-agent", "software-architect", "finance-job-market-specialist", "resume-analysis-expert",
  "candidate-job-matching-expert", "job-data-integration-expert", "mobile-pwa-expert", "security-expert",
  "agent-console-engineer", "ui-designer-apple-liquid-glass", "ux-designer-apple-hig", "qa-engineer", "netlify-engineer",
  "accessibility-specialist", "privacy-compliance-specialist", "ai-systems-engineer",
];
// Skills the project lead required by name (2026-11-25 request) — all must exist.
const REQUIRED_SKILLS = [
  "netlify-functions", "netlify-deployment", "pwa-installability", "service-workers", "claude-api", "github-api", "agent-console",
  "resume-parsing", "pdf-processing", "docx-processing", "finance-job-market-analysis", "finance-career-paths", "candidate-job-scoring",
  "skill-gap-analysis", "job-data-aggregation", "greenhouse-integration", "lever-integration", "workday-integration", "icims-integration",
  "oracle-recruiting-cloud", "search-ranking", "recommendation-systems", "accessibility-wcag", "apple-hig", "apple-liquid-glass-design",
  "authentication", "authorization", "security-architecture", "rate-limiting", "privacy-and-data-protection", "observability",
  "logging-and-monitoring", "testing-strategy", "end-to-end-testing", "performance-optimization", "prompt-engineering", "agent-design",
  "orchestration-patterns", "documentation-standards",
];
const KNOWN_AGENT_FIELDS = new Set(["name", "description", "tools", "disallowedTools", "model", "permissionMode", "maxTurns", "autoCompactWindow", "skills", "mcpServers", "hooks", "memory", "background", "omitClaudeMd", "effort", "isolation", "color", "initialPrompt", "experimental"]);
const NAME_RE = /^[a-z][a-z0-9]*(-[a-z0-9]+){0,5}$/;

const errors = [], warnings = [], info = [];
const err = (m) => errors.push(m), warn = (m) => warnings.push(m);

function frontmatter(text) {
  if (!text.startsWith("---\n")) return null;
  const end = text.indexOf("\n---", 4);
  return end < 0 ? null : text.slice(4, end);
}
const field = (fm, k) => fm.match(new RegExp(`^${k}:\\s*(.*)$`, "m"))?.[1]?.trim();
const listField = (fm, k) => {
  const m = fm.match(new RegExp(`^${k}:\\s*\\n((?:\\s+-\\s+.+\\n?)+)`, "m"));
  return m ? [...m[1].matchAll(/-\s+(\S+)/g)].map((x) => x[1]) : [];
};
const globToRe = (g) => new RegExp("^" + g.replace(/[.+^${}()|[\]\\]/g, "\\$&").replace(/\*\*/g, "\u0000").replace(/\*/g, "[^/]*").replace(/\u0000/g, ".*") + "$");
const sampleOf = (g) => g.replace(/\*\*/g, "x/y").replace(/\*/g, "z");

// ---------- skills ----------
const skillDirs = readdirSync(SKILLS_DIR).filter((d) => statSync(join(SKILLS_DIR, d)).isDirectory());
const skills = {};
for (const d of skillDirs) {
  const p = join(SKILLS_DIR, d, "SKILL.md");
  if (!existsSync(p)) { err(`skill ${d}: missing SKILL.md`); continue; }
  const text = readFileSync(p, "utf8"), fm = frontmatter(text);
  if (!fm) { err(`skill ${d}: frontmatter must start on line 1`); continue; }
  const name = field(fm, "name"), desc = field(fm, "description") ?? "";
  if (name !== d) err(`skill ${d}: name "${name}" must equal folder name`);
  if (!NAME_RE.test(d)) err(`skill ${d}: bad name`);
  if (!desc) err(`skill ${d}: missing description`);
  if (desc.length > 1536) err(`skill ${d}: description ${desc.length} chars > 1536 listing cap`);
  if (/^disable-model-invocation:\s*true/m.test(fm)) warn(`skill ${d}: disable-model-invocation prevents preloading into agents`);
  const owner = fm.match(/^\s+owner:\s*(\S+)/m)?.[1];
  const backups = (fm.match(/^\s+backups:\s*\[(.*)\]/m)?.[1] ?? "").split(",").map((s) => s.trim()).filter(Boolean);
  const lines = text.split("\n").length;
  if (lines > 500) err(`skill ${d}: ${lines} lines > 500`);
  for (const [label, re] of [["Purpose", /^## Purpose/m], ["Use when", /^## Use when/m], ["Inputs → Outputs", /^## Inputs/m], ["Best practices", /^## (Best practices|Rules|Practices|Principles)/m], ["Common mistakes", /^## Common mistakes/m], ["References", /^## References/m]])
    if (!re.test(text)) err(`skill ${d}: missing section "${label}"`);
  skills[d] = { owner, backups, usedBy: [] };
}
for (const s of REQUIRED_SKILLS) if (!skills[s]) err(`required skill missing: ${s}`);

// ---------- agents ----------
const agentFiles = readdirSync(AGENTS_DIR).filter((f) => f.endsWith(".md") && f !== "README.md");
const agents = {};
const ownedGlobs = [];
for (const f of agentFiles) {
  const text = readFileSync(join(AGENTS_DIR, f), "utf8"), fm = frontmatter(text);
  if (!fm) { err(`agent ${f}: frontmatter must start on line 1`); continue; }
  const name = field(fm, "name"), desc = field(fm, "description") ?? "", tools = field(fm, "tools") ?? "";
  if (name + ".md" !== f) err(`agent ${f}: name "${name}" must match file name`);
  if (!NAME_RE.test(name ?? "") || (name ?? "").length > 48) err(`agent ${f}: bad name`);
  if (!desc) err(`agent ${name}: missing description`);
  if (desc.length > 300) err(`agent ${name}: description ${desc.length} chars > 300`);
  for (const k of [...fm.matchAll(/^([A-Za-z_]+):/gm)].map((m) => m[1])) if (!KNOWN_AGENT_FIELDS.has(k)) err(`agent ${name}: unknown frontmatter field "${k}" (Claude Code ignores it)`);
  if (!["opus", "sonnet", "haiku"].includes(field(fm, "model"))) err(`agent ${name}: model must be opus, sonnet or haiku (see docs/agent-brains.md)`);
  if (!/^## Persona\n/m.test(text)) err(`agent ${name}: missing "## Persona" section`);
  if (name !== "orchestrator" && /\bAgent\b/.test(tools)) err(`agent ${name}: only the orchestrator may have the Agent tool`);
  if (/\bSendMessage\b/.test(tools)) err(`agent ${name}: specialists must not message each other`);
  if (/^memory:/m.test(fm)) err(`agent ${name}: memory auto-grants write tools; not allowed`);
  const sk = listField(fm, "skills");
  if (!sk.includes("architecture-decisions")) err(`agent ${name}: must preload architecture-decisions`);
  if (sk.length > 32) err(`agent ${name}: more than 32 preloaded skills`);
  for (const s of sk) { if (!skills[s]) err(`agent ${name}: skill not found "${s}"`); else skills[s].usedBy.push(name); }
  for (const s of sk) if (!text.includes("`" + s + "`")) err(`agent ${name}: body must reference skill \`${s}\``);
  // required body sections
  for (const h of ["## Before you answer", "## Mission", "## When to invoke", "## You own", "## You must not", "## Success criteria", "## Collaboration", "## Skills", "## Console profile"])
    if (!text.includes(h)) err(`agent ${name}: missing section "${h}"`);
  if (!text.includes(`knowledge/${name}/`) || !/prefer that knowledge over your memory/i.test(text)) err(`agent ${name}: Before-you-answer must point at knowledge/${name}/ and prefer it over memory`);
  // console profile
  const prof = text.match(/```yaml console-profile\n([\s\S]*?)```/)?.[1];
  if (!prof) { err(`agent ${name}: missing console-profile block`); continue; }
  for (const k of ["display_name", "group", "personality", "responsibilities", "escalates_to", "version", "status", "human_owner"]) if (!new RegExp(`^${k}:`, "m").test(prof)) err(`agent ${name}: console-profile missing ${k}`);
  let globs = [];
  try { globs = JSON.parse(prof.match(/^responsibilities:\s*(\[.*\])\s*$/m)?.[1] ?? "[]"); } catch { err(`agent ${name}: responsibilities must be a JSON array`); }
  for (const g of globs) ownedGlobs.push({ agent: name, glob: g });
  // knowledge folder
  const kd = join(KNOWLEDGE_DIR, name);
  const docs = existsSync(join(kd, "docs")) ? readdirSync(join(kd, "docs")).filter((x) => x.endsWith(".md")) : [];
  const ex = existsSync(join(kd, "examples")) ? readdirSync(join(kd, "examples")).filter((x) => !statSync(join(kd, "examples", x)).isDirectory()) : [];
  if (docs.length < 1) err(`agent ${name}: knowledge/${name}/docs has no notes`);
  for (const dfile of docs) if (!/https?:\/\//.test(readFileSync(join(kd, "docs", dfile), "utf8"))) err(`knowledge ${name}/docs/${dfile}: no source link`);
  const exCount = ex.filter((x) => /\.(mjs|md|css|html|json|js|ts|toml)$/.test(x)).length;
  if (exCount < 2) err(`agent ${name}: knowledge/${name}/examples needs at least 2 examples (has ${exCount})`);
  agents[name] = { sk, text };
}
for (const r of ROSTER) if (!agents[r]) err(`roster agent missing: ${r}`);
for (const a of Object.keys(agents)) if (!ROSTER.includes(a)) warn(`agent ${a} is not in the roster`);

// ---------- skill ownership & usage ----------
for (const [s, v] of Object.entries(skills)) {
  if (!v.owner || !agents[v.owner]) err(`skill ${s}: owner "${v.owner}" is not an agent`);
  else if (!agents[v.owner].sk.includes(s)) err(`skill ${s}: owner ${v.owner} does not preload it`);
  if (!v.backups.length) err(`skill ${s}: needs at least one backup`);
  for (const b of v.backups) if (!agents[b]) err(`skill ${s}: backup "${b}" is not an agent`);
  if (!v.usedBy.length) err(`skill ${s}: not used by any agent`);
}

// ---------- path ownership overlap ----------
for (let i = 0; i < ownedGlobs.length; i++) for (let j = i + 1; j < ownedGlobs.length; j++) {
  const a = ownedGlobs[i], b = ownedGlobs[j];
  if (a.agent === b.agent) continue;
  if (globToRe(a.glob).test(sampleOf(b.glob)) || globToRe(b.glob).test(sampleOf(a.glob))) err(`path overlap: ${a.agent} "${a.glob}" vs ${b.agent} "${b.glob}"`);
}

// ---------- duplicated responsibilities (text that should live in a skill) ----------
const lineOwners = new Map();
for (const [name, { text }] of Object.entries(agents)) {
  const body = text.replace(/## Before you answer[\s\S]*?(?=\n## )/, "");
  for (const line of new Set(body.split("\n").map((l) => l.trim()).filter((l) => l.length > 60 && !l.startsWith("Preloaded:") && !l.startsWith("Via the orchestrator") && !l.startsWith("responsibilities:")))) {
    lineOwners.set(line, [...(lineOwners.get(line) ?? []), name]);
  }
}
for (const [line, owners] of lineOwners) if (owners.length > 1) err(`duplicated responsibility text in ${owners.join(", ")}: "${line.slice(0, 80)}…" → move to a skill`);

// ---------- report ----------
const total = Object.values(skills).length;
info.push(`${Object.keys(agents).length} agents (roster ${ROSTER.length}), ${total} skills (${REQUIRED_SKILLS.length} required by name), ${ownedGlobs.length} owned path globs`);
for (const w of warnings) console.log("WARN  " + w);
for (const e of errors) console.log("ERROR " + e);
console.log(info.join("\n"));
console.log(errors.length ? `FAILED with ${errors.length} error(s)` : "PASSED: all agent, skill, knowledge and ownership checks");
process.exit(errors.length ? 1 : 0);
