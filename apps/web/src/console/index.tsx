// Console routes for mobile-pwa-expert to mount. Every route is wrapped in RequireSuperAdmin (UI convenience only;
// Functions enforce access, docs/agent-console.md §4.1).
import type { RouteObject } from "react-router-dom";
import { RequireSuperAdmin } from "../auth";
import { AgentsPage } from "./AgentsPage";
import { ProposalsPage } from "./ProposalsPage";
import { ProposalDetail } from "./ProposalDetail";

export const consoleRoutes: RouteObject[] = [
  { path: "/agents", element: <RequireSuperAdmin><AgentsPage /></RequireSuperAdmin> },
  { path: "/agents/proposals", element: <RequireSuperAdmin><ProposalsPage /></RequireSuperAdmin> },
  { path: "/agents/proposals/:id", element: <RequireSuperAdmin><ProposalDetail /></RequireSuperAdmin> },
];
