// Worked example: the Agent Console tool loop with the official SDK, using a MOCK fetch so it runs offline.
// Note: the SDK refuses NON-streaming calls whose max_tokens could exceed its 10-minute timeout (e.g. 64000).
// Use ~16000 for create(); use client.messages.stream() for 64000.
// Shows: strict tool definition, tool_use → validate input → tool_result in one user message → final answer.
// Run: node tool-loop-propose-change.mjs
import Anthropic from "@anthropic-ai/sdk";
import assert from "node:assert/strict";
import path from "node:path";

const ALLOW = ["apps/web/src/", "packages/", "data/taxonomy/", "docs/", ".claude/agents/", ".claude/skills/", "knowledge/", "tests/"];
const DENY = [/^netlify\.toml$/, /^netlify\/functions\//, /^package(-lock)?\.json$/, /^\.github\//, /^\.env/, /\.(pem|key)$/, /^scripts\//];
export function validatePath(p) {
  if (typeof p !== "string" || p.includes("\0") || p.includes("\\") || p.startsWith("/") || /%2e|%2f/i.test(p)) return "invalid path";
  const n = path.posix.normalize(p);
  if (n.startsWith("..") || n !== p) return "path must be normalized and inside the repo";
  if (DENY.some((r) => r.test(n))) return `denied path: ${n}`;
  if (!ALLOW.some((a) => n.startsWith(a))) return `not on allow-list: ${n}`;
  return null;
}

const proposeChange = {
  name: "propose_change",
  description: "Propose edits to repository files. A human reviews a diff and must approve before anything is committed.",
  strict: true,
  input_schema: {
    type: "object", additionalProperties: false, required: ["title", "rationale", "files"],
    properties: {
      title: { type: "string" }, rationale: { type: "string" },
      files: { type: "array", items: { type: "object", additionalProperties: false, required: ["path", "action", "content"],
        properties: { path: { type: "string" }, action: { type: "string", enum: ["create", "update", "delete"] }, content: { type: "string" } } } },
    },
  },
};

// Scripted responses that mirror the documented Messages API shapes.
const replies = [
  { id: "msg_1", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "tool_use", stop_details: null, stop_sequence: null,
    usage: { input_tokens: 900, output_tokens: 120, cache_read_input_tokens: 0, cache_creation_input_tokens: 0 },
    content: [{ type: "tool_use", id: "toolu_01", name: "propose_change", input: {
      title: "Lower education weight", rationale: "Every Orlando sample requires a bachelor's.",
      files: [{ path: "packages/scoring/weights.json", action: "update", content: "{\"education\":10}" },
              { path: "netlify.toml", action: "update", content: "# sneaky" }] } }] },
  { id: "msg_2", type: "message", role: "assistant", model: "claude-opus-5-5", stop_reason: "end_turn", stop_details: null, stop_sequence: null,
    usage: { input_tokens: 1100, output_tokens: 40, cache_read_input_tokens: 800, cache_creation_input_tokens: 0 },
    content: [{ type: "text", text: "Proposal #7 created for packages/scoring/weights.json. netlify.toml was rejected by policy." }] },
];
const sent = [];
const mockFetch = async (url, init) => {
  sent.push(JSON.parse(init.body));
  return new Response(JSON.stringify(replies.shift()), { status: 200, headers: { "content-type": "application/json", "request-id": "req_mock" } });
};

const client = new Anthropic({ apiKey: "sk-ant-mock", fetch: mockFetch, maxRetries: 0 });
const messages = [{ role: "user", content: "Lower the education weight to 10." }];
let response = await client.messages.create({ model: "claude-opus-5-5", max_tokens: 16000, tools: [proposeChange], tool_choice: { type: "auto" }, messages });

while (response.stop_reason === "tool_use") {
  const results = [];
  for (const block of response.content.filter((b) => b.type === "tool_use")) {
    const errors = block.input.files.map((f) => validatePath(f.path)).filter(Boolean);
    const accepted = block.input.files.filter((f) => !validatePath(f.path)).map((f) => f.path);
    results.push({ type: "tool_result", tool_use_id: block.id, is_error: accepted.length === 0,
      content: JSON.stringify({ proposalId: 7, status: "pending_human_review", accepted, rejected: errors }) });
  }
  messages.push({ role: "assistant", content: response.content }, { role: "user", content: results }); // all results in ONE user message
  response = await client.messages.create({ model: "claude-opus-5-5", max_tokens: 16000, tools: [proposeChange], tool_choice: { type: "auto" }, messages });
}

assert.equal(response.stop_reason, "end_turn");
const lastUser = sent[1].messages.at(-1);
assert.equal(lastUser.content[0].type, "tool_result");
assert.match(lastUser.content[0].content, /denied path: netlify.toml/);
assert.ok(validatePath("../secrets"));
for (const bad of ["../x", "/etc/passwd", "a\\b", "docs/%2e%2e/x", "netlify/functions/x.ts", ".github/workflows/ci.yml"]) assert.ok(validatePath(bad), bad);
console.log(response.content[0].text);
console.log("OK: tool loop ran; denied path rejected; tool_result returned in one user message; nothing committed");
