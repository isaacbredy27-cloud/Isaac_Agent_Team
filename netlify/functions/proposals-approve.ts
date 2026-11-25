// POST /api/proposals/:id/approve  body { confirm: "<proposal number>" }.
// super_admin + aal2 + TOTP step-up ≤ 600 s + live user + same Origin (ADR 0002, docs/agent-console.md §6.3–6.4).
// Approver = verified userId (sub), never the request body.
import type { Config } from "@netlify/functions";
import { requireLiveUser, withAuth } from "./_lib/auth/index";
import { error, json, readJson } from "./_lib/platform/http";
import { audit } from "./_lib/console/audit";
import { commitProposal, githubEnv } from "./_lib/console/github";
import { ApproveRequestSchema, MAX_FILE_BYTES, containsSecret, getProposal, updateProposal } from "./_lib/console/proposals";
import { validatePath } from "./_lib/auth/paths";
import { getAgent } from "./_lib/console/bundle";

const ROUTE = "/api/proposals/:id/approve";

export default withAuth(
  async (req, context, auth) => {
    if (req.method !== "POST") return error("method_not_allowed", 405);
    await requireLiveUser(auth);
    const origin = req.headers.get("origin");
    if (origin !== new URL(req.url).origin) return error("bad_origin", 403);

    const id = context.params?.id ?? "";
    const body = await readJson(req, ApproveRequestSchema);
    if (!body.ok) return body.response;
    const found = await getProposal(id);
    if (!found) return error("not_found", 404);
    const p = found.proposal;
    const stepUpAt = auth.amr[0]?.timestamp;
    const log = (action: string, result: string) =>
      audit({ route: ROUTE, action, sub: auth.userId, proposalId: id, agent: p.agent, result, details: { stepUpAt } });

    if (body.data.confirm !== p.id) {
      await log("approve", "confirm_mismatch");
      return error("confirm_mismatch", 400);
    }
    if (p.status !== "pending") return error("invalid_state", 409);

    // Re-check paths at approval time: the allow/deny lists may have changed since the proposal was stored.
    const agent = getAgent(p.agent);
    if (!agent || p.files.some((f) => !validatePath(f.path, agent.responsibilities).ok)) {
      await log("approve", "path_denied");
      return error("path_denied", 422);
    }

    // Re-scan content at approval time: the scanner or limits may be stricter than when the proposal was stored.
    if (p.files.some((f) => f.after !== undefined && (containsSecret(f.after) || Buffer.byteLength(f.after, "utf8") > MAX_FILE_BYTES))) {
      await log("approve", "content_blocked");
      return error("content_blocked", 422);
    }

    const gh = githubEnv();
    if (!gh) {
      await log("approve", "not_configured");
      return error("not_configured", 503);
    }

    // Approval event is recorded before any GitHub write (zero commits without approval).
    const approved = { ...p, status: "approved" as const, reviewer: auth.userId };
    if (!(await updateProposal(approved, found.etag))) return error("conflict", 409);
    await log("approve", "approved");

    try {
      const res = await commitProposal(gh, {
        id: p.id,
        agent: p.agent,
        title: p.title,
        baseSha: p.baseSha,
        files: p.files,
        approverSub: auth.userId,
      });
      if (res.status === "stale") {
        await updateProposal({ ...approved, status: "stale" });
        await log("commit", "base_sha_changed");
        return error("base_sha_changed", 409);
      }
      await updateProposal({ ...approved, status: "committed", commitSha: res.commitSha });
      await log("commit", "committed");
      return json({ commitSha: res.commitSha, commitUrl: res.commitUrl }, {}, { private: true });
    } catch {
      await updateProposal({ ...approved, status: "failed" });
      await log("commit", "failed");
      return error("commit_failed", 502);
    }
  },
  { superAdmin: true, stepUp: true },
);

export const config: Config = {
  path: "/api/proposals/:id/approve",
  method: "POST",
  rateLimit: { windowLimit: 5, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
