import type { ZodType } from "zod";

export type JsonOptions = {
  /** Personal data: `private, no-store` (ADR 0004). Wins over cdnSeconds. */
  private?: boolean;
  /** Public data: cache at the Netlify CDN for N seconds (ADR 0003). */
  cdnSeconds?: number;
  /** Stale-while-revalidate window; default 6x cdnSeconds. */
  staleSeconds?: number;
};

export function json(data: unknown, init: ResponseInit = {}, opts: JsonOptions = {}): Response {
  const headers = new Headers(init.headers);
  headers.set("Content-Type", "application/json; charset=utf-8");
  if (opts.private || opts.cdnSeconds === undefined) {
    headers.set("Cache-Control", "private, no-store");
  } else {
    const swr = opts.staleSeconds ?? opts.cdnSeconds * 6;
    headers.set("Cache-Control", "public, max-age=0, must-revalidate");
    headers.set(
      "Netlify-CDN-Cache-Control",
      `public, s-maxage=${opts.cdnSeconds}, stale-while-revalidate=${swr}`,
    );
  }
  return new Response(JSON.stringify(data), { ...init, headers });
}

/** Safe error body: a stable code only, never internals. */
export function error(code: string, status: number, init: ResponseInit = {}): Response {
  return json({ error: code }, { ...init, status }, { private: true });
}

/** Parse and validate a JSON body. Returns data or a ready 400 `invalid_request` Response. */
export async function readJson<T>(
  req: Request,
  schema: ZodType<T>,
): Promise<{ ok: true; data: T } | { ok: false; response: Response }> {
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return { ok: false, response: error("invalid_request", 400) };
  }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { ok: false, response: error("invalid_request", 400) };
  return { ok: true, data: parsed.data };
}
