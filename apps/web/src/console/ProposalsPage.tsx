import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Proposal } from "@schemas";
import { Card, EmptyState, Spinner } from "../design/components";
import { ConsoleApiError, describeError, useConsoleApi } from "./api";

export const STATUS_LABEL: Record<Proposal["status"], string> = {
  pending: "Pending review",
  approved: "Approved, committing",
  rejected: "Rejected",
  committed: "Committed",
  failed: "Commit failed",
  stale: "Stale: main changed",
};

export function ProposalsPage() {
  const api = useConsoleApi();
  const [items, setItems] = useState<Proposal[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    api.listProposals(ac.signal).then(setItems, (e: unknown) => {
      if ((e as Error).name !== "AbortError") setErr(e instanceof ConsoleApiError ? e.code : "generic");
    });
    return () => ac.abort();
  }, [api.listProposals]);

  return (
    <main className="page stack-lg">
      <div className="row-between">
        <h1>Proposals</h1>
        <Link className="button button--ghost" to="/agents">Agents</Link>
      </div>
      {err ? <EmptyState title="Could not load proposals" description={describeError(err)} /> : null}
      {!err && !items ? <Spinner label="Loading proposals" /> : null}
      {items && items.length === 0 ? <EmptyState title="No proposals yet" description="Ask an agent for a change in chat." /> : null}
      {items && items.length > 0 ? (
        <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
          {items.map((p) => (
            <li key={p.id}>
              <Card className="stack">
                <Link to={`/agents/proposals/${p.id}`}>
                  <h2 className="text-sm">#{p.id} {p.title}</h2>
                </Link>
                <p className="text-xs text-secondary">
                  {p.agent} · {p.files.length} file{p.files.length === 1 ? "" : "s"} · <span className="badge">{STATUS_LABEL[p.status]}</span>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
