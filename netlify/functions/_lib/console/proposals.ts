// Proposal validation and storage (docs/agent-console.md §6, ADR 0002).
// Order: Zod → path rules (deny wins) → size → secret scan → base SHA → diff → store (pending).
import { getStore } from "@netlify/blobs";
import { createTwoFilesPatch } from "diff";
import { z } from "zod";
import { ProposalSchema, type Proposal, type ProposalFile } from "../../../../packages/schemas/src/index";
import { validatePath, GLOBAL_PATHS } from "../auth/paths";

export const MAX_FILE_BYTES = 200 * 1024;
export const MAX_FILES = 10;

export const ProposeChangeInputSchema = z.object({
  title: z.string().trim().min(1).max(120).regex(/^[^\r\n]+$/),
  rationale: z.string().max(4000),
  files: z
    .array(
      z.object({
        path: z.string().min(1).max(300),
        action: z.enum(["create", "update", "delete"]),
        content: z.string().optional(),
      }),
    )
    .min(1)
    .max(MAX_FILES),
});
export type ProposeChangeInput = z.infer<typeof ProposeChangeInputSchema>;

export const ReadFileInputSchema = z.object({ path: z.string().min(1).max(300) });

export const ApproveRequestSchema = z.object({ confirm: z.string().trim().min(1).max(20) });

// Common secret shapes. A match rejects the whole proposal.
const SECRET_PATTERNS: RegExp[] = [
  /sk-ant-[A-Za-z0-9_-]{10,}/,
  /\bgh[pousr]_[A-Za-z0-9]{20,}/,
  /github_pat_[A-Za-z0-9_]{20,}/,
  /sb_secret_[A-Za-z0-9_-]{10,}/,
  /\bAKIA[0-9A-Z]{16}\b/,
  /-----BEGIN [A-Z ]*PRIVATE KEY-----/,
  /\bxox[abpr]-[A-Za-z0-9-]{10,}/,
];
export const containsSecret = (text: string): boolean => SECRET_PATTERNS.some((r) => r.test(text));

export type FileReader = (path: string) => Promise<string | null>;
export type ValidationResult =
  | { ok: true; files: ProposalFile[]; diff: string }
  | { ok: false; errors: string[] };

/** Validate every file; any failure rejects the whole proposal (no partial proposals). */
export async function prepareProposalFiles(
  input: ProposeChangeInput,
  agentGlobs: readonly string[],
  readAtBase: FileReader,
): Promise<ValidationResult> {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const f of input.files) {
    const v = validatePath(f.path, agentGlobs);
    if (!v.ok) errors.push(`${JSON.stringify(f.path.slice(0, 120))}: ${v.reason}`);
    else if (seen.has(v.path)) errors.push(`${v.path}: duplicate`);
    else seen.add(v.path);
    if (f.action !== "delete" && f.content === undefined) errors.push(`${f.path}: content required`);
    if (f.content !== undefined && Buffer.byteLength(f.content, "utf8") > MAX_FILE_BYTES) errors.push(`${f.path}: too_large`);
    if (f.content !== undefined && containsSecret(f.content)) errors.push(`${f.path}: secret_detected`);
  }
  if (errors.length) return { ok: false, errors };

  const files: ProposalFile[] = [];
  const patches: string[] = [];
  for (const f of input.files) {
    const before = await readAtBase(f.path);
    if (f.action === "create" && before !== null) errors.push(`${f.path}: already exists (use update)`);
    if (f.action !== "create" && before === null) errors.push(`${f.path}: does not exist (use create)`);
    if (errors.length) continue;
    const after = f.action === "delete" ? undefined : (f.content ?? "");
    files.push({ path: f.path, action: f.action, ...(before !== null ? { before } : {}), ...(after !== undefined ? { after } : {}) });
    patches.push(
      createTwoFilesPatch(
        f.action === "create" ? "/dev/null" : `a/${f.path}`,
        f.action === "delete" ? "/dev/null" : `b/${f.path}`,
        before ?? "",
        after ?? "",
      ),
    );
  }
  if (errors.length) return { ok: false, errors };
  return { ok: true, files, diff: patches.join("\n") };
}

// ---------- Storage ----------
export const proposalsStore = () => getStore({ name: "proposals", consistency: "strong" });
const key = (id: string) => `p/${id.padStart(8, "0")}`;
const ID_RE = /^[1-9][0-9]{0,7}$/;
export const isProposalId = (id: unknown): id is string => typeof id === "string" && ID_RE.test(id);

/** Sequential numeric IDs so the approver can type the number. onlyIfNew prevents two writers taking one ID. */
export async function saveNewProposal(p: Omit<Proposal, "id">): Promise<Proposal> {
  const store = proposalsStore();
  const seq = ((await store.get("seq", { type: "json" })) as { n?: number } | null)?.n ?? 0;
  for (let n = seq + 1; n < seq + 50; n++) {
    const proposal = ProposalSchema.parse({ ...p, id: String(n) });
    const res = await store.setJSON(key(proposal.id), proposal, { onlyIfNew: true });
    if (res.modified) {
      await store.setJSON("seq", { n });
      return proposal;
    }
  }
  throw new Error("proposal_id_exhausted");
}

export async function getProposal(id: string): Promise<{ proposal: Proposal; etag?: string } | null> {
  if (!isProposalId(id)) return null;
  const res = await proposalsStore().getWithMetadata(key(id), { type: "json" });
  if (!res) return null;
  const parsed = ProposalSchema.safeParse(res.data);
  return parsed.success ? { proposal: parsed.data, etag: res.etag } : null;
}

/** Conditional write: returns false if someone else changed the proposal first. */
export async function updateProposal(p: Proposal, etag?: string): Promise<boolean> {
  const res = await proposalsStore().setJSON(key(p.id), ProposalSchema.parse(p), etag ? { onlyIfMatch: etag } : {});
  return res.modified;
}

export async function listProposals(limit = 100): Promise<Proposal[]> {
  const store = proposalsStore();
  const { blobs } = await store.list({ prefix: "p/" });
  const keys = blobs.map((b) => b.key).sort().reverse().slice(0, limit);
  const out: Proposal[] = [];
  for (const k of keys) {
    const parsed = ProposalSchema.safeParse(await store.get(k, { type: "json" }));
    if (parsed.success) out.push(parsed.data);
  }
  return out;
}

/** read_file may read any globally allowed, non-denied path (not limited to the agent's own globs). */
export const validateReadPath = (path: string) => validatePath(path, GLOBAL_PATHS.allow);
