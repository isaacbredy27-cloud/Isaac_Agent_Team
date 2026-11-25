import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { Proposal } from "@schemas";
import { Card, EmptyState, Spinner } from "../design/components";
import { ConsoleApiError, describeError, useConsoleApi } from "./api";
import { consoleCopy } from "./copy";

const c = consoleCopy;
export const STATUS_LABEL: Record<Proposal["status"], string> = c.proposal.status;

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
        <h1>{c.agents.proposalsHeading}</h1>
        <Link className="button button--ghost" to="/agents">{c.agents.title}</Link>
      </div>
      {err ? <EmptyState title={c.proposal.loadErrorTitle} description={describeError(err)} /> : null}
      {!err && !items ? <Spinner label={c.proposal.loading} /> : null}
      {items && items.length === 0 ? <EmptyState title={c.agents.proposalsEmpty} /> : null}
      {items && items.length > 0 ? (
        <ul className="stack">
          {items.map((p) => (
            <li key={p.id}>
              <Card className="stack">
                <Link to={`/agents/proposals/${p.id}`}>
                  <h2 className="text-sm">#{p.id} {p.title}</h2>
                </Link>
                <p className="text-xs text-secondary">
                  {p.agent} · {c.proposal.fileCount(p.files.length)} · <span className="badge">{STATUS_LABEL[p.status]}</span>
                </p>
              </Card>
            </li>
          ))}
        </ul>
      ) : null}
    </main>
  );
}
