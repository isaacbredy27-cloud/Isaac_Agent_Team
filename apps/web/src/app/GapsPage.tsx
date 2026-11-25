import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, EmptyState, Spinner } from "../design/components";
import { copy } from "../content/copy";
import { useData } from "./data";

/** Gaps are counted in the browser from the top matches. No extra API call. */
export function GapsPage() {
  const { profile, matches, matchStatus } = useData();
  const rows = useMemo(() => {
    const top = [...matches.values()].sort((a, b) => b.score - a.score).slice(0, 20);
    const counts = new Map<string, { n: number; required: boolean }>();
    for (const m of top)
      for (const g of m.gaps) {
        const c = counts.get(g.skill) ?? { n: 0, required: false };
        counts.set(g.skill, { n: c.n + 1, required: c.required || g.importance === "required" });
      }
    return [...counts.entries()].sort((a, b) => b[1].n - a[1].n).slice(0, 15);
  }, [matches]);

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
      ) : matchStatus === "loading" ? (
        <Spinner label={copy.gaps.loading} />
      ) : matchStatus === "error" ? (
        <p role="alert">{copy.gaps.error}</p>
      ) : rows.length === 0 ? (
        <p>{copy.gaps.none}</p>
      ) : (
        <ul className="stack">
          {rows.map(([skill, c]) => (
            <Card as="li" key={skill}>
              <div className="row-between">
                <h2>{skill}</h2>
                <span className="text-sm">{copy.gaps.frequency(c.n)}</span>
              </div>
            </Card>
          ))}
        </ul>
      )}
    </div>
  );
}
