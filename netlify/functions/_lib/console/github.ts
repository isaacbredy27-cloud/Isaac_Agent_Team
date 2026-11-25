// GitHub REST via fetch (skill github-api, ADR 0001/0002). Token stays server-side and is never logged.
export class GitHubError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "GitHubError";
  }
}
export class NotConfiguredError extends Error {
  constructor() {
    super("not_configured");
    this.name = "NotConfiguredError";
  }
}

export type GitHubEnv = { token: string; owner: string; repo: string; apiBase: string };

const REPO_RE = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const SHA_RE = /^[0-9a-f]{40}$/;

/** Reads env inside the handler. Deploy Previews and branch deploys never get a write path (ADR 0001). */
export function githubEnv(env: Record<string, string | undefined> = process.env): GitHubEnv | null {
  const token = env.GITHUB_TOKEN ?? "";
  const full = env.GITHUB_REPO ?? "";
  if (!token || !REPO_RE.test(full)) return null;
  if (env.CONTEXT === "deploy-preview" || env.CONTEXT === "branch-deploy") return null;
  const [owner, repo] = full.split("/") as [string, string];
  return { token, owner, repo, apiBase: (env.GITHUB_API_BASE || "https://api.github.com").replace(/\/+$/, "") };
}

export function createGitHub(cfg: GitHubEnv) {
  const base = `${cfg.apiBase}/repos/${cfg.owner}/${cfg.repo}`;
  async function gh<T>(method: string, path: string, body?: unknown): Promise<T> {
    const res = await fetch(base + path, {
      method,
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${cfg.token}`,
        "X-GitHub-Api-Version": "2026-03-10",
        "User-Agent": "finance-match-agent-console",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    if (!res.ok) throw new GitHubError(res.status, `github_${res.status}`);
    return (await res.json()) as T;
  }

  async function headSha(): Promise<string> {
    const ref = await gh<{ object?: { sha?: string } }>("GET", "/git/ref/heads/main");
    const sha = ref.object?.sha ?? "";
    if (!SHA_RE.test(sha)) throw new GitHubError(502, "github_bad_ref");
    return sha;
  }

  /** File text at a commit, or null if it does not exist. ≤ 1 MB (Contents API). */
  async function readFile(path: string, ref: string): Promise<string | null> {
    try {
      const encoded = path.split("/").map(encodeURIComponent).join("/");
      const f = await gh<{ type?: string; encoding?: string; content?: string }>("GET", `/contents/${encoded}?ref=${ref}`);
      if (f.type !== "file" || f.encoding !== "base64" || typeof f.content !== "string") return null;
      return Buffer.from(f.content, "base64").toString("utf8");
    } catch (e) {
      if (e instanceof GitHubError && e.status === 404) return null;
      throw e;
    }
  }

  return { gh, headSha, readFile, commitUrl: (sha: string) => `https://github.com/${cfg.owner}/${cfg.repo}/commit/${sha}` };
}

export type CommitFile = { path: string; action: "create" | "update" | "delete"; after?: string };
export type CommitInput = { id: string; agent: string; title: string; baseSha: string; files: CommitFile[]; approverSub: string };
export type CommitResult = { status: "committed"; commitSha: string; commitUrl: string } | { status: "stale"; headSha: string };

export const commitMessage = (p: Pick<CommitInput, "agent" | "title" | "id" | "approverSub">): string =>
  `agent(${p.agent}): ${p.title.replace(/[\r\n]+/g, " ").trim()}\n\nProposal: #${p.id}\nApproved-by: ${p.approverSub}`;

/** One atomic commit on main (ADR 0002): ref → base-SHA check → blobs → tree → commit → PATCH ref (force:false). Serial calls. */
export async function commitProposal(cfg: GitHubEnv, p: CommitInput): Promise<CommitResult> {
  const g = createGitHub(cfg);
  const head = await g.headSha();
  if (head !== p.baseSha) return { status: "stale", headSha: head };
  const commit = await g.gh<{ tree?: { sha?: string } }>("GET", `/git/commits/${head}`);
  const baseTree = commit.tree?.sha;
  if (!baseTree) throw new GitHubError(502, "github_bad_commit");
  const entries: Array<{ path: string; mode: "100644"; type: "blob"; sha: string | null }> = [];
  for (const f of p.files) {
    if (f.action === "delete") {
      entries.push({ path: f.path, mode: "100644", type: "blob", sha: null });
      continue;
    }
    const blob = await g.gh<{ sha: string }>("POST", "/git/blobs", {
      content: Buffer.from(f.after ?? "", "utf8").toString("base64"),
      encoding: "base64",
    });
    entries.push({ path: f.path, mode: "100644", type: "blob", sha: blob.sha });
  }
  const tree = await g.gh<{ sha: string }>("POST", "/git/trees", { base_tree: baseTree, tree: entries });
  const created = await g.gh<{ sha: string }>("POST", "/git/commits", {
    message: commitMessage(p),
    tree: tree.sha,
    parents: [head],
  });
  if (!SHA_RE.test(created.sha)) throw new GitHubError(502, "github_bad_commit");
  try {
    await g.gh("PATCH", "/git/refs/heads/main", { sha: created.sha, force: false });
  } catch (e) {
    // 422 = not a fast-forward: main moved between our ref read and the update.
    if (e instanceof GitHubError && e.status === 422) return { status: "stale", headSha: head };
    throw e;
  }
  return { status: "committed", commitSha: created.sha, commitUrl: g.commitUrl(created.sha) };
}
