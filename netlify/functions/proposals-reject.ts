// POST /api/proposals/:id/reject. super_admin + aal2 (no step-up, §6.3).
import type { Config } from "@netlify/functions";
import { RejectRequestSchema } from "../../packages/schemas/src/index";
import { withAuth } from "./_lib/auth/index";
import { error, json, readJson } from "./_lib/platform/http";
import { audit } from "./_lib/console/audit";
import { getProposal, updateProposal } from "./_lib/console/proposals";

const ROUTE = "/api/proposals/:id/reject";

export default withAuth(
  async (req, context, auth) => {
    if (req.method !== "POST") return error("method_not_allowed", 405);
    const origin = req.headers.get("origin");
    if (origin && origin !== new URL(req.url).origin) return error("bad_origin", 403);
    const body = await readJson(req, RejectRequestSchema);
    if (!body.ok) return body.response;
    const id = context.params?.id ?? "";
    const found = await getProposal(id);
    if (!found) return error("not_found", 404);
    if (found.proposal.status !== "pending" && found.proposal.status !== "stale") return error("invalid_state", 409);
    const ok = await updateProposal({ ...found.proposal, status: "rejected", reviewer: auth.userId }, found.etag);
    if (!ok) return error("conflict", 409);
    await audit({ route: ROUTE, action: "reject", sub: auth.userId, proposalId: id, result: "rejected" });
    return json({ status: "rejected" }, {}, { private: true });
  },
  { superAdmin: true },
);

export const config: Config = {
  path: "/api/proposals/:id/reject",
  method: "POST",
  rateLimit: { windowLimit: 30, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
