import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Chip, EmptyState, Spinner } from "../design/components";
import { ConsoleApiError, describeError, useConsoleApi, type ConsoleAgent } from "./api";
import { Chat } from "./Chat";

const GROUP_ORDER = ["leadership", "domain", "experience", "platform", "quality"];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);

export function AgentsPage() {
  const api = useConsoleApi();
  const [agents, setAgents] = useState<ConsoleAgent[] | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    const ac = new AbortController();
    api.listAgents(ac.signal).then(setAgents, (e: unknown) => {
      if ((e as Error).name !== "AbortError") setErr(e instanceof ConsoleApiError ? e.code : "generic");
    });
    return () => ac.abort();
  }, [api.listAgents]);

  const groups = useMemo(() => {
    const m = new Map<string, ConsoleAgent[]>();
    for (const a of agents ?? []) m.set(a.group, [...(m.get(a.group) ?? []), a]);
    return [...m.entries()].sort(([a], [b]) => (GROUP_ORDER.indexOf(a) + 99) % 99 - (GROUP_ORDER.indexOf(b) + 99) % 99);
  }, [agents]);
  const current = agents?.find((a) => a.name === selected) ?? null;

  if (err) return <main className="page"><EmptyState title="Agent Console" description={describeError(err)} /></main>;
  if (!agents) return <main className="page"><Spinner label="Loading agents" /></main>;

  return (
    <main className="page stack-lg">
      <div className="row-between">
        <h1>Agent Console</h1>
        <Link className="button button--secondary" to="/agents/proposals">Proposals</Link>
      </div>
      {current ? (
        <section className="stack-lg" aria-labelledby="agent-title">
          <Chip onClick={() => setSelected(null)}>All agents</Chip>
          <Card className="stack">
            <h2 id="agent-title">{current.name}</h2>
            <p><span className="badge">{current.model}</span></p>
            <p>{current.personality}</p>
            <p className="text-secondary text-sm">{current.description}</p>
            <p className="text-sm">Owns: <span className="mono">{current.responsibilities.join(", ") || "none"}</span></p>
            <p className="text-sm">Console tools: {current.tools.join(", ")}</p>
          </Card>
          <Chat agent={current} />
        </section>
      ) : (
        groups.map(([group, list]) => (
          <section key={group} className="stack" aria-labelledby={`g-${group}`}>
            <h2 id={`g-${group}`}>{cap(group)}</h2>
            <ul className="stack" style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {list.map((a) => (
                <li key={a.name}>
                  <Card className="stack">
                    <div className="row-between">
                      <h3>{a.name}</h3>
                      <span className="badge">{a.model}</span>
                    </div>
                    <p className="text-sm">{a.personality}</p>
                    <p className="text-xs text-secondary">
                      Knowledge: {a.knowledge.docs.length} docs, {a.knowledge.examples.length} examples
                    </p>
                    <div>
                      <button type="button" className="button button--primary" onClick={() => setSelected(a.name)} aria-label={`Chat with ${a.name}`}>
                        Chat
                      </button>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          </section>
        ))
      )}
    </main>
  );
}
