import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@netlify/blobs", () => import("./blobs-mock"));
import { resetBlobs } from "./blobs-mock";
import chat, { isFakeClaudeEnabled } from "../../netlify/functions/agents-chat";
import { getProposal } from "../../netlify/functions/_lib/console/proposals";

const now = () => Math.floor(Date.now() / 1000);
const post = (body: unknown, token = `stub.super_admin.aal2.${now()}`) =>
  chat(new Request("https://console.test/api/agents/chat", { method: "POST", headers: { authorization: `Bearer ${token}` }, body: JSON.stringify(body) }), {} as never);
const events = async (res: Response) =>
  (await res.text()).split("\n\n").filter(Boolean).map((f) => JSON.parse(f.replace(/^data: /, "")) as { type: string; [k: string]: unknown });

beforeEach(() => {
  resetBlobs();
  vi.stubEnv("E2E_AUTH_STUB", "1");
  vi.stubEnv("CONTEXT", "test");
  vi.stubEnv("GITHUB_TOKEN", "");
  vi.stubEnv("ANTHROPIC_API_KEY", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("POST /api/agents/chat", () => {
  it("fake mode is only on in dev/test contexts", () => {
    expect(isFakeClaudeEnabled({ E2E_FAKE_CLAUDE: "1", CONTEXT: "test" })).toBe(true);
    for (const CONTEXT of [undefined, "production", "deploy-preview", "branch-deploy"]) expect(isFakeClaudeEnabled({ E2E_FAKE_CLAUDE: "1", CONTEXT })).toBe(false);
  });

  it("streams canned text and a pending docs proposal in fake mode", async () => {
    vi.stubEnv("E2E_FAKE_CLAUDE", "1");
    const res = await post({ agent: "orchestrator", message: "hi" });
    expect(res.headers.get("content-type")).toMatch(/^text\/event-stream/);
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    const evs = await events(res);
    expect(evs.filter((e) => e.type === "text").length).toBeGreaterThan(0);
    const prop = evs.find((e) => e.type === "proposal");
    expect(evs.at(-1)).toEqual({ type: "done" });
    const stored = await getProposal(String(prop?.id));
    expect(stored?.proposal).toMatchObject({ status: "pending", agent: "orchestrator", files: [{ path: "docs/README.md", action: "update" }] });
  });

  it("emits not_configured without ANTHROPIC_API_KEY", async () => {
    const evs = await events(await post({ agent: "orchestrator", message: "hi" }));
    expect(evs).toEqual([{ type: "error", error: "not_configured" }, { type: "done" }]);
  });

  it("404 for an unknown agent; 403 forbidden for a user", async () => {
    expect((await post({ agent: "nope", message: "hi" })).status).toBe(404);
    expect(await (await post({ agent: "orchestrator", message: "hi" }, `stub.user.aal2.${now()}`)).json()).toEqual({ error: "forbidden" });
  });
});
