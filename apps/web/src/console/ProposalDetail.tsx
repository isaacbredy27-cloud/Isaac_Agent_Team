// Review → type the proposal number → Approve. step_up_required opens StepUpSheet; the user presses Approve again (no auto-retry).
import { useEffect, useId, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import type { ApproveResponse, Proposal } from "@schemas";
import { StepUpSheet } from "../auth";
import { Button, Card, EmptyState, Spinner } from "../design/components";
import { ConsoleApiError, describeError, useConsoleApi } from "./api";
import { consoleCopy } from "./copy";
import { DiffView } from "./DiffView";
import { STATUS_LABEL } from "./ProposalsPage";

const c = consoleCopy.proposal;

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
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const approveRef = useRef<HTMLButtonElement>(null);
  const rejectRef = useRef<HTMLButtonElement>(null);
  const confirmId = useId();
  const helpId = useId();
  const reasonId = useId();

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
        await api.reject(p.id, reason.trim() || undefined);
        setRejecting(false);
        setP({ ...p, status: "rejected" });
        setMsg(c.rejected);
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

  if (loadErr) return <main className="page"><EmptyState title={c.pageTitle} description={describeError(loadErr)} /></main>;
  if (!p) return <main className="page"><Spinner label={c.loading} /></main>;
  const pending = p.status === "pending";

  return (
    <main className="page stack-lg">
      <Link className="button button--ghost" to="/agents/proposals">{c.allProposals}</Link>
      <Card className="stack">
        <h1>#{p.id} {p.title}</h1>
        <p className="text-sm">
          {c.from(p.agent)} · <span className="badge">{STATUS_LABEL[p.status]}</span>
        </p>
        <h2 className="text-sm">{c.rationale}</h2>
        <p className="pre-wrap">{p.rationale}</p>
        <h2 className="text-sm">{c.files}</h2>
        <ul className="text-sm">
          {p.files.map((f) => (
            <li key={f.path}>
              <span className="mono">{f.path}</span>
              {f.action === "create" ? ` (${c.newFile})` : f.action === "delete" ? ` (${c.removed})` : null}
            </li>
          ))}
        </ul>
      </Card>
      <Card><DiffView diff={p.diff} /></Card>

      {pending ? (
        <Card className="stack">
          <h2>{c.reviewHeading}</h2>
          <p className="text-sm">{c.approveHint}</p>
          <label htmlFor={confirmId}>{c.confirmLabel(p.id)}</label>
          <input id={confirmId} aria-describedby={helpId} inputMode="numeric" autoComplete="off" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          <p id={helpId} className="text-xs text-secondary">{c.confirmHelp}</p>
          <div className="row">
            <Button variant="primary" ref={approveRef} disabled={busy || confirm.trim() !== p.id} onClick={() => run("approve")}>
              {busy && !rejecting ? c.working : c.approveButton}
            </Button>
            {!rejecting ? (
              <Button variant="danger" ref={rejectRef} disabled={busy} onClick={() => setRejecting(true)}>{c.reject}</Button>
            ) : null}
          </div>
          {rejecting ? (
            <section className="stack" aria-labelledby={`${reasonId}-t`}>
              <h3 id={`${reasonId}-t`}>{c.rejectTitle}</h3>
              <label htmlFor={reasonId}>{c.rejectReasonLabel}</label>
              <textarea id={reasonId} rows={3} maxLength={2000} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
              <div className="row">
                <Button variant="danger" disabled={busy} onClick={() => run("reject")}>{busy ? c.working : c.rejectConfirm}</Button>
                <Button variant="secondary" disabled={busy} onClick={() => { setRejecting(false); setReason(""); }}>{c.cancel}</Button>
              </div>
            </section>
          ) : null}
        </Card>
      ) : null}

      {msg ? <p role="alert">{msg}</p> : null}
      {done ? (
        <p role="status">
          {c.deployed}{" "}
          <a href={done.commitUrl} rel="noreferrer" target="_blank">{c.viewCommit}</a>
        </p>
      ) : null}

      <StepUpSheet
        open={stepUp}
        onDone={() => { setStepUp(false); setMsg(c.stepUpDone); approveRef.current?.focus(); }}
        onCancel={() => { setStepUp(false); approveRef.current?.focus(); }}
      />
    </main>
  );
}
