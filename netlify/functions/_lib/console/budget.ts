// Per-user daily Claude token budget for the console (security review, skill rate-limiting).
// Blobs store "ratelimit", key budget/<hashSub>/<yyyy-mm-dd> (UTC). Counts input, output and cache tokens.
import { getStore } from "@netlify/blobs";
import { hashSub } from "./audit";

export const DAILY_TOKEN_BUDGET = 2_000_000;

const keyFor = (sub: string, now = new Date()) => `budget/${hashSub(sub)}/${now.toISOString().slice(0, 10)}`;
const store = () => getStore({ name: "ratelimit", consistency: "strong" });

export async function tokensUsedToday(sub: string): Promise<number> {
  const v = (await store().get(keyFor(sub), { type: "json" })) as { used?: unknown } | null;
  return typeof v?.used === "number" ? v.used : 0;
}

export async function isOverBudget(sub: string): Promise<boolean> {
  return (await tokensUsedToday(sub)) >= DAILY_TOKEN_BUDGET;
}

/** Conditional read-modify-write so parallel chats do not lose counts. */
export async function addTokens(sub: string, tokens: number): Promise<void> {
  if (!(tokens > 0)) return;
  const s = store();
  const key = keyFor(sub);
  for (let i = 0; i < 5; i++) {
    const cur = await s.getWithMetadata(key, { type: "json" });
    const used = typeof cur?.data?.used === "number" ? cur.data.used : 0;
    const res = await s.setJSON(key, { used: used + tokens }, cur?.etag ? { onlyIfMatch: cur.etag } : { onlyIfNew: true });
    if (res.modified) return;
  }
  console.error("budget_write_conflict");
}

type Usage = {
  input_tokens?: number | null;
  output_tokens?: number | null;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
};
export const usageTokens = (u: Usage): number =>
  (u.input_tokens ?? 0) + (u.output_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0);
