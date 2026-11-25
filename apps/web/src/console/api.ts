// Console API client. Bearer token from useAuth(); no identity fields in bodies (docs/agent-console.md §4.1).
import { useCallback } from "react";
import {
  AgentSummarySchema,
  ApproveResponseSchema,
  ChatEventSchema,
  ProposalSchema,
  type AgentSummary,
  type ApproveResponse,
  type ChatEvent,
  type Proposal,
} from "@schemas";
import { z } from "zod";
import { useAuth } from "../auth";

export class ConsoleApiError extends Error {
  constructor(readonly code: string, readonly status: number) {
    super(code);
  }
}

export type ConsoleAgent = AgentSummary & { persona: string; responsibilities: string[]; tools: string[] };
const ConsoleAgentSchema = AgentSummarySchema.extend({
  persona: z.string(),
  responsibilities: z.array(z.string()),
  tools: z.array(z.string()),
});

/** Human text for every error code the console Functions return. */
export const errorText: Record<string, string> = {
  unauthorized: "Your session ended. Sign in again.",
  forbidden: "This page is not available.",
  mfa_required: "Finish two-step verification to use the console.",
  step_up_required: "Confirm with your authenticator code, then press Approve again.",
  bad_origin: "Request blocked. Reload the page and try again.",
  confirm_mismatch: "The number you typed does not match this proposal.",
  base_sha_changed: "Main changed since this proposal was made. Ask the agent to redo it.",
  not_configured: "This environment cannot do that. Approve works only on production.",
  path_denied: "A file in this proposal is no longer allowed.",
  invalid_state: "This proposal is no longer pending.",
  commit_failed: "The commit failed. Nothing changed on main. Try again later.",
  rate_limited: "Too many requests. Wait a minute and try again.",
  refusal: "The agent declined this request.",
  max_tokens: "The reply was too long and stopped early.",
  time_limit: "The reply hit the time limit. Send a follow-up to continue.",
  upstream_error: "The agent is unavailable. Try again.",
  not_found: "Not found.",
};
export const describeError = (code: string): string => errorText[code] ?? "Something went wrong. Try again.";

async function readBody(res: Response): Promise<unknown> {
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const code = body && typeof body === "object" && "error" in body ? String((body as { error: unknown }).error) : "generic";
    throw new ConsoleApiError(res.status === 429 ? "rate_limited" : code, res.status);
  }
  return body;
}

/** Parse complete SSE frames from a buffer. Returns events and the unconsumed tail. */
export function parseSse(buffer: string): { events: ChatEvent[]; rest: string } {
  const events: ChatEvent[] = [];
  const frames = buffer.split("\n\n");
  const rest = frames.pop() ?? "";
  for (const frame of frames) {
    const data = frame
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!data) continue;
    try {
      const parsed = ChatEventSchema.safeParse(JSON.parse(data));
      if (parsed.success) events.push(parsed.data);
    } catch {
      /* ignore malformed frame */
    }
  }
  return { events, rest };
}

export function useConsoleApi() {
  const { getAccessToken } = useAuth();

  const authed = useCallback(
    async (path: string, init: RequestInit = {}): Promise<Response> => {
      const token = await getAccessToken();
      if (!token) throw new ConsoleApiError("unauthorized", 401);
      const headers = new Headers(init.headers);
      headers.set("Authorization", `Bearer ${token}`);
      if (init.body) headers.set("Content-Type", "application/json");
      return fetch(path, { ...init, headers, cache: "no-store" });
    },
    [getAccessToken],
  );

  const listAgents = useCallback(async (signal?: AbortSignal): Promise<ConsoleAgent[]> => {
    const body = await readBody(await authed("/api/agents", signal ? { signal } : {}));
    return z.object({ agents: z.array(ConsoleAgentSchema) }).parse(body).agents;
  }, [authed]);

  const listProposals = useCallback(async (signal?: AbortSignal): Promise<Proposal[]> => {
    const body = await readBody(await authed("/api/proposals", signal ? { signal } : {}));
    return z.object({ proposals: z.array(ProposalSchema) }).parse(body).proposals;
  }, [authed]);

  const getProposal = useCallback(async (id: string, signal?: AbortSignal): Promise<Proposal> => {
    const body = await readBody(await authed(`/api/proposals/${encodeURIComponent(id)}`, signal ? { signal } : {}));
    return z.object({ proposal: ProposalSchema }).parse(body).proposal;
  }, [authed]);

  const approve = useCallback(async (id: string, confirm: string): Promise<ApproveResponse> => {
    const res = await authed(`/api/proposals/${encodeURIComponent(id)}/approve`, { method: "POST", body: JSON.stringify({ confirm }) });
    return ApproveResponseSchema.parse(await readBody(res));
  }, [authed]);

  const reject = useCallback(async (id: string): Promise<void> => {
    await readBody(await authed(`/api/proposals/${encodeURIComponent(id)}/reject`, { method: "POST", body: "{}" }));
  }, [authed]);

  /** Streams chat events to onEvent. Resolves when the stream ends. */
  const chat = useCallback(
    async (input: { agent: string; message: string; conversationId: string }, onEvent: (e: ChatEvent) => void, signal?: AbortSignal) => {
      const res = await authed("/api/agents/chat", { method: "POST", body: JSON.stringify(input), ...(signal ? { signal } : {}) });
      if (!res.ok || !res.body) {
        await readBody(res);
        throw new ConsoleApiError("upstream_error", res.status);
      }
      const reader = res.body.pipeThrough(new TextDecoderStream()).getReader();
      let buffer = "";
      for (;;) {
        const { value, done } = await reader.read();
        if (done) break;
        const { events, rest } = parseSse(buffer + value);
        buffer = rest;
        events.forEach(onEvent);
      }
    },
    [authed],
  );

  return { listAgents, listProposals, getProposal, approve, reject, chat };
}
