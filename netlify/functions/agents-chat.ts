// POST /api/agents/chat → Server-Sent Events. super_admin + aal2 (docs/agent-console.md §5).
// Events (ChatEventSchema): text | proposal | error | done. System prompt comes from the server bundle only.
import Anthropic from "@anthropic-ai/sdk";
import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { ChatRequestSchema, type ChatEvent } from "../../packages/schemas/src/index";
import { withAuth } from "./_lib/auth/index";
import { error, readJson } from "./_lib/platform/http";
import { audit, hashSub } from "./_lib/console/audit";
import { getAgent, type BundledAgent } from "./_lib/console/bundle";
import { createGitHub, githubEnv } from "./_lib/console/github";
import { prepareProposalFiles, saveNewProposal } from "./_lib/console/proposals";
import { TOOLS, createToolRunner } from "./_lib/console/tools";

const ROUTE = "/api/agents/chat";
const MAX_ROUNDS = 8;
const SOFT_DEADLINE_MS = 45_000; // sync functions stop at 60 s (skill netlify-functions)
const MAX_HISTORY = 40;
const CONV_ID = /^[A-Za-z0-9-]{8,64}$/;
const FAKE_CONTEXTS = new Set(["dev", "test"]);

/** Canned Claude for e2e. Same rule as the auth stub: only CONTEXT dev/test, never Deploy Previews or production. */
export const isFakeClaudeEnabled = (env: Record<string, string | undefined> = process.env): boolean =>
  env.E2E_FAKE_CLAUDE === "1" && typeof env.CONTEXT === "string" && FAKE_CONTEXTS.has(env.CONTEXT);

type Send = (ev: ChatEvent) => void;

export default withAuth(
  async (req, _context, auth) => {
    if (req.method !== "POST") return error("method_not_allowed", 405);
    const body = await readJson(req, ChatRequestSchema);
    if (!body.ok) return body.response;
    const agent = getAgent(body.data.agent);
    if (!agent) return error("not_found", 404);
    const convId = body.data.conversationId;
    if (convId !== undefined && !CONV_ID.test(convId)) return error("invalid_request", 400);

    const encoder = new TextEncoder();
    const stream = new ReadableStream<Uint8Array>({
      async start(controller) {
        let open = true;
        const send: Send = (ev) => {
          if (open) controller.enqueue(encoder.encode(`data: ${JSON.stringify(ev)}\n\n`));
        };
        try {
          await audit({ route: ROUTE, action: "chat", sub: auth.userId, agent: agent.name, result: "started" });
          if (isFakeClaudeEnabled()) await runFake(agent, auth.userId, send);
          else await runClaude(agent, auth.userId, body.data.message, convId, send, req.signal);
        } catch (e) {
          send({ type: "error", error: e instanceof Anthropic.RateLimitError ? "rate_limited" : "upstream_error" });
        } finally {
          send({ type: "done" });
          open = false;
          controller.close();
        }
      },
    });
    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream; charset=utf-8",
        "Cache-Control": "private, no-store",
        "X-Accel-Buffering": "no",
      },
    });
  },
  { superAdmin: true },
);

async function runClaude(
  agent: BundledAgent,
  sub: string,
  userText: string,
  convId: string | undefined,
  send: Send,
  signal: AbortSignal,
): Promise<void> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return send({ type: "error", error: "not_configured" });

  const convStore = getStore({ name: "conversations", consistency: "strong" });
  const convKey = convId ? `${hashSub(sub)}/${agent.name}/${convId}` : null;
  const history = convKey ? (((await convStore.get(convKey, { type: "json" })) as Anthropic.MessageParam[] | null) ?? []) : [];
  const messages: Anthropic.MessageParam[] = [...trimHistory(history), { role: "user", content: userText }];

  const client = new Anthropic({ apiKey });
  const runTool = createToolRunner({ agent, sub, github: githubEnv(), onProposal: (id) => send({ type: "proposal", id }) });
  const started = Date.now();

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const stream = client.messages.stream(
      {
        model: agent.model,
        max_tokens: 64000,
        tools: TOOLS,
        tool_choice: { type: "auto" },
        system: [{ type: "text", text: agent.systemPrompt, cache_control: { type: "ephemeral" } }],
        messages,
      },
      { signal },
    );
    stream.on("text", (text) => send({ type: "text", text }));
    const msg = await stream.finalMessage();
    messages.push({ role: "assistant", content: msg.content as Anthropic.ContentBlockParam[] });

    if (msg.stop_reason === "refusal") { send({ type: "error", error: "refusal" }); break; }
    if (msg.stop_reason === "max_tokens") { send({ type: "error", error: "max_tokens" }); break; }
    if (msg.stop_reason !== "tool_use") break;

    const results: Anthropic.ToolResultBlockParam[] = [];
    for (const block of msg.content) {
      if (block.type !== "tool_use") continue;
      const out = await runTool(block.name, block.input);
      results.push({ type: "tool_result", tool_use_id: block.id, content: out.content, is_error: out.isError });
    }
    messages.push({ role: "user", content: results }); // all results in one user message
    if (Date.now() - started > SOFT_DEADLINE_MS) { send({ type: "error", error: "time_limit" }); break; }
  }

  if (convKey) {
    // A trailing tool_result turn cannot be resumed without its assistant reply; drop it.
    while (messages.length && messages.at(-1)!.role === "user" && typeof messages.at(-1)!.content !== "string") messages.pop();
    await convStore.setJSON(convKey, messages);
  }
}

/** Keep the last MAX_HISTORY messages, starting at a plain-text user turn so tool pairs stay intact. */
export function trimHistory(h: Anthropic.MessageParam[]): Anthropic.MessageParam[] {
  let out = h.slice(-MAX_HISTORY);
  const start = out.findIndex((m) => m.role === "user" && typeof m.content === "string");
  out = start < 0 ? [] : out.slice(start);
  if (out.length && out.at(-1)!.role === "user") out = out.slice(0, -1); // never two user turns in a row
  return out;
}

const FAKE_BEFORE = "# Finance Match Orlando docs\n\nStart here.\n";

async function runFake(agent: BundledAgent, sub: string, send: Send): Promise<void> {
  for (const t of [`Hi, this is ${agent.name} (test mode). `, "I drafted a small docs change for you to review."]) send({ type: "text", text: t });
  const gh = githubEnv();
  const g = gh ? createGitHub(gh) : null;
  const baseSha = g ? await g.headSha() : "0".repeat(40);
  const before = g ? await g.readFile("docs/README.md", baseSha) : FAKE_BEFORE;
  const prepared = await prepareProposalFiles(
    {
      title: "Add console test note to docs README",
      rationale: "Canned proposal from E2E_FAKE_CLAUDE test mode.",
      files: [{ path: "docs/README.md", action: before === null ? "create" : "update", content: `${before ?? ""}\nTest-mode note from the Agent Console.\n` }],
    },
    ["docs/**"],
    async () => before,
  );
  if (!prepared.ok) return send({ type: "error", error: "proposal_rejected" });
  const p = await saveNewProposal({
    agent: agent.name,
    title: "Add console test note to docs README",
    rationale: "Canned proposal from E2E_FAKE_CLAUDE test mode.",
    files: prepared.files,
    diff: prepared.diff,
    baseSha,
    status: "pending",
    requestedBy: sub,
    createdAt: new Date().toISOString(),
  });
  send({ type: "proposal", id: p.id });
}

export const config: Config = {
  path: "/api/agents/chat",
  method: "POST",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
