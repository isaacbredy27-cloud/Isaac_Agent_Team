import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import type { GapEntry } from "@schemas";
import { Card, EmptyState, Spinner } from "../design/components";
import { copy } from "../content/copy";
import { postGaps } from "./api";
import { useData } from "./data";

export function GapsPage() {
  const { profile, jobs } = useData();
  const [gaps, setGaps] = useState<GapEntry[]>([]);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    if (!profile || jobs.length === 0) return;
    const ctl = new AbortController();
    setStatus("loading");
    postGaps(profile, jobs.map((j) => j.id).slice(0, 500), ctl.signal)
      .then((g) => {
        setGaps(g);
        setStatus("ready");
      })
      .catch(() => !ctl.signal.aborted && setStatus("error"));
    return () => ctl.abort();
  }, [profile, jobs]);

  return (
    <div className="stack-lg">
      <div className="stack">
        <h1>{copy.gaps.title}</h1>
        <p className="text-secondary">{copy.gaps.subtitle}</p>
      </div>
      {!profile ? (
        <EmptyState
          title={copy.gaps.empty}
          action={
            <Link className="button button--primary" to="/resume">
              {copy.gaps.emptyAction}
            </Link>
          }
        />
      ) : status === "loading" ? (
        <Spinner label={copy.gaps.loading} />
      ) : status === "error" ? (
        <p role="alert">{copy.gaps.error}</p>
      ) : gaps.length === 0 ? (
        <p>{copy.gaps.none}</p>
      ) : (
        <ul className="stack">
          {gaps.map((g) => (
            <Card as="li" key={`${g.kind}-${g.gap}`}>
              <div className="stack">
                <div className="row-between">
                  <h2>{g.gap}</h2>
                  <span className="text-sm">{copy.gaps.frequency(g.jobsMissing)}</span>
                </div>
                {g.link && (
                  <a href={g.link} target="_blank" rel="noreferrer noopener">
                    {copy.gaps.howToStart}
                  </a>
                )}
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
