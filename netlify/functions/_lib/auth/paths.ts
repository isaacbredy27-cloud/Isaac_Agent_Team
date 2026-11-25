// Proposal path validator (skill agent-console, authorization). Owner: security-expert.
// Order: syntax checks -> canonical form -> deny (wins) -> global allow AND agent globs.
import { posix } from "node:path";
import agentPaths from "../../../../config/agent-paths.json" with { type: "json" };

export type PathLists = { allow: readonly string[]; deny: readonly string[] };
export type PathVerdict = { ok: true; path: string } | { ok: false; reason: PathRejectReason };
export type PathRejectReason =
  | "empty" | "too_long" | "bad_chars" | "absolute" | "traversal" | "not_canonical" | "denied" | "not_allowed";

export const GLOBAL_PATHS: PathLists = { allow: agentPaths.allow, deny: agentPaths.deny };
const MAX_PATH = 512;
// Strict charset: blocks NUL, control chars, backslash, '%' (encoded forms), ':' and non-ASCII look-alikes.
const SAFE = /^[A-Za-z0-9._@+\-/]+$/;

const cache = new Map<string, RegExp>();
/** Tiny glob: `**` / `**\/` any depth, `*` within a segment, `?` one char. Everything else literal. */
export function globToRegExp(glob: string, ignoreCase = false): RegExp {
  const key = `${ignoreCase ? "i" : ""}:${glob}`;
  const hit = cache.get(key);
  if (hit) return hit;
  let re = "";
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i] ?? "";
    if (c === "*" && glob[i + 1] === "*") {
      if (glob[i + 2] === "/") { re += "(?:[^/]+/)*"; i += 2; } else { re += ".*"; i += 1; }
    } else if (c === "*") re += "[^/]*";
    else if (c === "?") re += "[^/]";
    else re += c.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  }
  const out = new RegExp(`^${re}$`, ignoreCase ? "i" : "");
  cache.set(key, out);
  return out;
}

export const matchesAny = (path: string, globs: readonly string[], ignoreCase = false): boolean =>
  globs.some((g) => globToRegExp(g, ignoreCase).test(path));

/**
 * Validate a repo-relative path proposed by an agent. Treat the input as hostile.
 * Deny matching is case-insensitive (stricter); allow matching is exact.
 */
export function validatePath(path: unknown, agentGlobs: readonly string[], lists: PathLists = GLOBAL_PATHS): PathVerdict {
  if (typeof path !== "string" || path.length === 0) return { ok: false, reason: "empty" };
  if (path.length > MAX_PATH) return { ok: false, reason: "too_long" };
  if (!SAFE.test(path)) return { ok: false, reason: "bad_chars" };
  if (path.startsWith("/")) return { ok: false, reason: "absolute" };
  if (path.split("/").includes("..")) return { ok: false, reason: "traversal" };
  const norm = posix.normalize(path);
  if (norm !== path || path.endsWith("/") || path.split("/").includes(".")) return { ok: false, reason: "not_canonical" };
  if (matchesAny(norm, lists.deny, true)) return { ok: false, reason: "denied" };
  if (!matchesAny(norm, lists.allow) || !matchesAny(norm, agentGlobs)) return { ok: false, reason: "not_allowed" };
  return { ok: true, path: norm };
}
