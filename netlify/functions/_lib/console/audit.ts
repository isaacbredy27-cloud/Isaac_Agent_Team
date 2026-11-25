// Console audit events (skill audit-logging). Hashed sub only; never tokens, prompts or file contents.
import { createHash, randomUUID } from "node:crypto";
import { getStore } from "@netlify/blobs";

export type AuditEvent = {
  route: string;
  action: string;
  sub: string;
  result: string;
  proposalId?: string;
  agent?: string;
};

export const hashSub = (sub: string): string => createHash("sha256").update(sub).digest("hex").slice(0, 32);

/** Best effort: an audit write failure is logged as a code, and never breaks the request. */
export async function audit(e: AuditEvent): Promise<void> {
  const at = new Date().toISOString();
  const { sub, ...rest } = e;
  try {
    const store = getStore({ name: "audit", consistency: "strong" });
    await store.setJSON(`console/${at.slice(0, 10)}/${at}-${randomUUID()}`, { at, subHash: hashSub(sub), ...rest });
  } catch {
    console.error("audit_write_failed", e.route, e.action);
  }
}
