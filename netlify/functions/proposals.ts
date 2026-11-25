// GET /api/proposals[?status=] and GET /api/proposals/:id. super_admin + aal2.
import type { Config } from "@netlify/functions";
import { ProposalStatusSchema } from "../../packages/schemas/src/index";
import { withAuth } from "./_lib/auth/index";
import { error, json } from "./_lib/platform/http";
import { getProposal, isProposalId, listProposals } from "./_lib/console/proposals";

export default withAuth(
  async (req, context) => {
    if (req.method !== "GET") return error("method_not_allowed", 405);
    const id = context.params?.id;
    if (id !== undefined) {
      if (!isProposalId(id)) return error("not_found", 404);
      const found = await getProposal(id);
      return found ? json({ proposal: found.proposal }, {}, { private: true }) : error("not_found", 404);
    }
    const statusRaw = new URL(req.url).searchParams.get("status");
    const status = statusRaw === null ? undefined : ProposalStatusSchema.safeParse(statusRaw);
    if (status && !status.success) return error("invalid_request", 400);
    const all = await listProposals();
    return json({ proposals: status ? all.filter((p) => p.status === status.data) : all }, {}, { private: true });
  },
  { superAdmin: true },
);

export const config: Config = {
  path: ["/api/proposals", "/api/proposals/:id"],
  method: "GET",
  rateLimit: { windowLimit: 20, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
