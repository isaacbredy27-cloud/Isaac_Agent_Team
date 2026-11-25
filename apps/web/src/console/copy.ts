// Console copy. Base strings come from Wren's apps/web/src/content/copy.ts.
// Keys marked NEW are not in content/copy.ts yet; Wren should move them there, then this file can re-export only.
import type { ProposalStatus } from "@schemas";
import { copy } from "../content/copy";

export const consoleCopy = {
  agents: copy.agents,
  chat: copy.chat,
  proposal: {
    ...copy.proposal,
    pageTitle: "Proposal", // NEW
    loading: "Loading proposal…", // NEW
    allProposals: "All proposals", // NEW
    reviewHeading: "Review", // NEW
    loadErrorTitle: "We couldn't load proposals", // NEW
    cancel: "Cancel", // NEW
    status: {
      pending: "Waiting for review",
      approved: "Saving", // NEW
      committed: "Saved", // NEW
      stale: "Out of date", // NEW
      failed: "Couldn't save", // NEW
      rejected: "Rejected",
    } satisfies Record<ProposalStatus, string>,
  },
} as const;
