import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button } from "../design/components";
import { ConsoleApiError, describeError, useConsoleApi, type ConsoleAgent } from "./api";
import { Markdown } from "./Markdown";

type Turn = { role: "user" | "agent"; text: string; proposals: string[]; error?: string };

export function Chat({ agent }: { agent: ConsoleAgent }) {
  const api = useConsoleApi();
  const [turns, setTurns] = useState<Turn[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const conversationId = useRef(crypto.randomUUID());
  const abort = useRef<AbortController | null>(null);
  const inputId = useId();

  useEffect(() => {
    setTurns([]);
    conversationId.current = crypto.randomUUID();
    return () => abort.current?.abort();
  }, [agent.name]);

  const patchLast = (f: (t: Turn) => Turn) => setTurns((ts) => [...ts.slice(0, -1), f(ts[ts.length - 1]!)]);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    const message = draft.trim();
    if (!message || busy) return;
    setDraft("");
    setBusy(true);
    setTurns((ts) => [...ts, { role: "user", text: message, proposals: [] }, { role: "agent", text: "", proposals: [] }]);
    abort.current = new AbortController();
    try {
      await api.chat({ agent: agent.name, message, conversationId: conversationId.current }, (ev) => {
        if (ev.type === "text") patchLast((t) => ({ ...t, text: t.text + ev.text }));
        else if (ev.type === "proposal") patchLast((t) => ({ ...t, proposals: [...t.proposals, ev.id] }));
        else if (ev.type === "error") patchLast((t) => ({ ...t, error: ev.error }));
      }, abort.current.signal);
    } catch (err) {
      if ((err as Error).name !== "AbortError") patchLast((t) => ({ ...t, error: err instanceof ConsoleApiError ? err.code : "upstream_error" }));
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="stack" aria-label={`Chat with ${agent.name}`}>
      <ol className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }} aria-live="polite" aria-busy={busy}>
        {turns.map((t, i) => (
          <li key={i} className="card stack">
            <p className="text-xs text-secondary">{t.role === "user" ? "You" : agent.persona.replace(/\*/g, "").split(".")[0] || agent.name}</p>
            {t.role === "user" ? <p style={{ whiteSpace: "pre-wrap" }}>{t.text}</p> : <Markdown text={t.text || (busy && i === turns.length - 1 ? "…" : "")} />}
            {t.proposals.map((id) => (
              <Link key={id} className="chip chip--static" to={`/agents/proposals/${id}`}>
                Review proposal #{id}
              </Link>
            ))}
            {t.error ? <p role="alert">{describeError(t.error)}</p> : null}
          </li>
        ))}
      </ol>
      <form className="row" onSubmit={onSubmit}>
        <label htmlFor={inputId} className="visually-hidden">Message {agent.name}</label>
        <textarea
          id={inputId}
          className="grow"
          rows={2}
          maxLength={20000}
          value={draft}
          placeholder="Type a message"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              e.currentTarget.form?.requestSubmit();
            }
          }}
        />
        <Button type="submit" disabled={busy || !draft.trim()}>{busy ? "Sending" : "Send"}</Button>
      </form>
    </section>
  );
}
