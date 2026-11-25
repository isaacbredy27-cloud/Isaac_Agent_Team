// GET /api/agents → { agents: AgentSummary[] }. super_admin + aal2 (docs/agent-console.md §4.1).
import type { Config } from "@netlify/functions";
import { withAuth } from "./_lib/auth/index";
import { error, json } from "./_lib/platform/http";
import { listAgents, toSummary } from "./_lib/console/bundle";

export default withAuth(
  async (req) => {
    if (req.method !== "GET") return error("method_not_allowed", 405);
    return json({ agents: listAgents().map(toSummary) }, {}, { private: true });
  },
  { superAdmin: true },
);

export const config: Config = {
  path: "/api/agents",
  method: "GET",
  rateLimit: { windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
