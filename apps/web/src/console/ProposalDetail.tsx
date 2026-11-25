// Review → type the proposal number → Approve. step_up_required opens StepUpSheet; the user presses Approve again (no auto-retry).
import { useEffect, useId, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ApproveResponse, Proposal } from "@schemas";
import { StepUpSheet } from "../auth";
import { Button, Card, EmptyState, Spinner } from "../design/components";
import { ConsoleApiError, describeError, useConsoleApi } from "./api";
import { DiffView } from "./DiffView";
import { STATUS_LABEL } from "./ProposalsPage";

export function ProposalDetail() {
  const { id = "" } = useParams();
  const api = useConsoleApi();
  const [p, setP] = useState<Proposal | null>(null);
  const [loadErr, setLoadErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [done, setDone] = useState<ApproveResponse | null>(null);
  const [stepUp, setStepUp] = useState(false);
  const approveRef = useRef<HTMLButtonElement>(null);
  const confirmId = useId();

  useEffect(() => {
    const ac = new AbortController();
    api.getProposal(id, ac.signal).then(setP, (e: unknown) => {
      if ((e as Error).name !== "AbortError") setLoadErr(e instanceof ConsoleApiError ? e.code : "generic");
    });
    return () => ac.abort();
  }, [api.getProposal, id]);

  async function run(action: "approve" | "reject") {
    if (!p || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      if (action === "approve") {
        const res = await api.approve(p.id, confirm.trim());
        setDone(res);
        setP({ ...p, status: "committed", commitSha: res.commitSha });
      } else {
        await api.reject(p.id);
        setP({ ...p, status: "rejected" });
      }
    } catch (e) {
      const code = e instanceof ConsoleApiError ? e.code : "generic";
      if (code === "step_up_required") setStepUp(true);
      if (code === "base_sha_changed") setP({ ...p, status: "stale" });
      setMsg(describeError(code));
    } finally {
      setBusy(false);
    }
  }

  if (loadErr) return <main className="page"><EmptyState title="Proposal" description={describeError(loadErr)} /></main>;
  if (!p) return <main className="page"><Spinner label="Loading proposal" /></main>;
  const pending = p.status === "pending";

  return (
    <main className="page stack-lg">
      <Link className="button button--ghost" to="/agents/proposals">All proposals</Link>
      <Card className="stack">
        <h1>#{p.id} {p.title}</h1>
        <p className="text-sm">
          From <strong>{p.agent}</strong> · <span className="badge">{STATUS_LABEL[p.status]}</span>
        </p>
        <p style={{ whiteSpace: "pre-wrap" }}>{p.rationale}</p>
        <p className="text-xs text-secondary mono">Base {p.baseSha.slice(0, 7)} · {new Date(p.createdAt).toLocaleString()}</p>
        <ul className="text-sm">
          {p.files.map((f) => <li key={f.path}><span className="mono">{f.path}</span> ({f.action})</li>)}
        </ul>
      </Card>
      <Card><DiffView diff={p.diff} /></Card>

      {pending ? (
        <Card className="stack">
          <h2>Review</h2>
          <p className="text-sm">Approving commits this change directly to main and starts a production deploy.</p>
          <label htmlFor={confirmId}>Type the proposal number ({p.id}) to approve</label>
          <input id={confirmId} inputMode="numeric" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <div className="row">
            <button ref={approveRef} type="button" className="button button--primary" disabled={busy || confirm.trim() !== p.id} onClick={() => run("approve")}>
              {busy ? "Working" : "Approve and commit"}
            </button>
            <Button variant="danger" disabled={busy} onClick={() => run("reject")}>Reject</Button>
          </div>
        </Card>
      ) : null}

      {msg ? <p role="alert">{msg}</p> : null}
      {done ? (
        <p role="status">
          Committed <a href={done.commitUrl} rel="noreferrer" target="_blank" className="mono">{done.commitSha.slice(0, 7)}</a>. Netlify is deploying it now.
        </p>
      ) : null}

      <StepUpSheet
        open={stepUp}
        onDone={() => { setStepUp(false); setMsg("Verified. Press Approve again."); approveRef.current?.focus(); }}
        onCancel={() => { setStepUp(false); approveRef.current?.focus(); }}
      />
    </main>
  );
}
