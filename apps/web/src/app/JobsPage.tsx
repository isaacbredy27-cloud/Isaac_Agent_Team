import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, EmptyState, ScoreBadge, Spinner } from "../design/components";
import { copy } from "../content/copy";
import { useData } from "./data";

const DAY = 86_400_000;

export function JobsPage() {
  const { jobs, jobsStatus, profile, matches, matchStatus, fetchedAt, reloadJobs } = useData();
  // Search text is typed by the user and applied in the browser only. Never sent to /api/jobs.
  const [q, setQ] = useState("");
  const [remote, setRemote] = useState(false);
  const [within, setWithin] = useState(0);

  const list = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const cutoff = within ? Date.now() - within * DAY : 0;
    const out = jobs.filter(
      (j) =>
        (!needle || `${j.title} ${j.company} ${j.location}`.toLowerCase().includes(needle)) &&
        (!remote || j.remote) &&
        Date.parse(j.postedAt) >= cutoff,
    );
    const score = (id: string) => matches.get(id)?.score ?? -1;
    return out.sort((a, b) => (profile ? score(b.id) - score(a.id) : 0) || Date.parse(b.postedAt) - Date.parse(a.postedAt));
  }, [jobs, matches, profile, q, remote, within]);

  const reset = () => {
    setQ("");
    setRemote(false);
    setWithin(0);
  };

  return (
    <div className="stack-lg">
      <div className="stack">
        <h1>{copy.jobs.title}</h1>
        <p className="text-secondary">{copy.jobs.subtitle}</p>
      </div>
      {!profile && (
        <EmptyState
          title={copy.jobs.emptyNoResume}
          action={
            <Link className="button button--primary" to="/resume">
              {copy.jobs.emptyNoResumeAction}
            </Link>
          }
        />
      )}
      <form className="stack" role="search" onSubmit={(e) => e.preventDefault()}>
        <label className="stack">
          <span>{copy.jobs.searchLabel}</span>
          <input type="search" value={q} onChange={(e) => setQ(e.target.value)} style={{ minHeight: 44 }} />
        </label>
        <div className="row">
          <label className="row">
            <input type="checkbox" checked={remote} onChange={(e) => setRemote(e.target.checked)} />
            <span>{copy.jobs.remoteOnly}</span>
          </label>
          <label className="row">
            <span>Posted within</span>
            <select value={within} onChange={(e) => setWithin(Number(e.target.value))} style={{ minHeight: 44 }}>
              <option value={0}>Any time</option>
              <option value={1}>1 day</option>
              <option value={7}>7 days</option>
              <option value={30}>30 days</option>
            </select>
          </label>
          <Button variant="ghost" onClick={reset}>
            {copy.jobs.filtersReset}
          </Button>
        </div>
      </form>
      <div role="status" aria-live="polite" className="text-sm text-secondary">
        {jobsStatus === "ready" ? copy.jobs.resultCount(list.length) : null}
        {profile && matchStatus === "error" ? ` ${copy.errors.generic}` : null}
        {fetchedAt ? ` ${copy.jobs.updated(new Date(fetchedAt).toLocaleString())}` : null}
      </div>
      {jobsStatus === "loading" && <Spinner label={copy.jobs.loading} />}
      {jobsStatus === "error" && (
        <EmptyState title={copy.jobs.error} action={<Button onClick={reloadJobs}>{copy.app.tryAgain}</Button>} />
      )}
      {jobsStatus === "ready" && list.length === 0 && (
        <EmptyState
          title={jobs.length === 0 ? copy.jobs.emptyNone : copy.jobs.emptyFilters}
          action={jobs.length > 0 ? <Button onClick={reset}>{copy.jobs.emptyFiltersAction}</Button> : undefined}
        />
      )}
      <ul className="stack">
        {list.map((j) => {
          const m = matches.get(j.id);
          return (
            <Card as="li" key={j.id}>
              <div className="stack">
                <div className="row-between">
                  <h2 className="grow">
                    <Link to={`/jobs/${encodeURIComponent(j.id)}`}>{j.title}</Link>
                  </h2>
                  {m && <ScoreBadge score={m.score} band={m.band.toLowerCase() as "strong" | "moderate" | "weak"} />}
                </div>
                <p>
                  {j.company} · {j.location}
                  {j.remote ? ` · ${copy.jobs.remote}` : ""}
                </p>
                <p className="text-sm text-secondary">{copy.jobs.posted(new Date(j.postedAt).toLocaleDateString())}</p>
              </div>
            </Card>
          );
        })}
      </ul>
    </div>
  );
}
