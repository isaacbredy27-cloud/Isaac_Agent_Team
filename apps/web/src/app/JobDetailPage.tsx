import { Link, useParams } from "react-router-dom";
import { EmptyState, ScoreBadge, Spinner, Card } from "../design/components";
import { copy } from "../content/copy";
import { useData } from "./data";

export function JobDetailPage() {
  const { id = "" } = useParams();
  const { jobs, jobsStatus, matches, profile } = useData();
  const job = jobs.find((j) => j.id === id);
  const m = matches.get(id);

  if (jobsStatus === "loading") return <Spinner label={copy.jobs.loading} />;
  if (!job)
    return (
      <EmptyState
        title={copy.detail.notFound}
        action={
          <Link className="button button--primary" to="/">
            {copy.detail.notFoundAction}
          </Link>
        }
      />
    );

  const intro = m ? (m.band === "Strong" ? copy.detail.strongIntro : m.band === "Moderate" ? copy.detail.moderateIntro : copy.detail.weakIntro) : "";
  return (
    <article className="stack-lg">
      <Link to="/">{copy.detail.backToJobs}</Link>
      <div className="stack">
        <h1>{job.title}</h1>
        <p>
          {job.company} · {job.location}
          {job.remote ? ` · ${copy.jobs.remote}` : ""}
        </p>
        {job.source === "seed" ? (
          <p className="text-sm text-secondary">
            This is a sample job for demonstration. It has no real posting to apply to.
          </p>
        ) : (
          <>
            <a className="button button--primary" href={job.url} target="_blank" rel="noreferrer noopener">
              {copy.detail.apply}
            </a>
            <p className="text-sm text-secondary">{copy.detail.applyHint}</p>
          </>
        )}
      </div>
      {m ? (
        <>
          <section className="stack" aria-labelledby="score-h">
            <h2 id="score-h">{copy.detail.scoreHeading}</h2>
            <div>
              <ScoreBadge score={m.score} band={m.band.toLowerCase() as "strong" | "moderate" | "weak"} />
            </div>
            <p>{intro}</p>
          </section>
          <section className="stack" aria-labelledby="why-h">
            <h2 id="why-h">{copy.detail.whyHeading}</h2>
            <p className="text-secondary">{copy.detail.whyIntro}</p>
            <p>{m.explanation || copy.detail.explanationFallback}</p>
          </section>
          <section className="stack" aria-labelledby="ev-h">
            <h2 id="ev-h">{copy.detail.evidenceHeading}</h2>
            <ul className="stack">
              {m.evidence.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
          </section>
          <section className="stack" aria-labelledby="gap-h">
            <h2 id="gap-h">{copy.detail.gapsHeading}</h2>
            {m.gaps.length === 0 ? (
              <p>{copy.detail.noGaps}</p>
            ) : (
              <ul className="stack">
                {m.gaps.map((g) => (
                  <li key={g.skill}>
                    {g.skill} ({g.importance})
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="stack" aria-labelledby="rec-h">
            <h2 id="rec-h">{copy.detail.recommendationHeading}</h2>
            <p>{m.recommendation.text}</p>
          </section>
        </>
      ) : (
        <Card>
          <div className="stack">
            <p>{profile ? copy.detail.explanationLoading : copy.jobs.emptyNoResume}</p>
            {!profile && (
              <Link className="button button--primary" to="/resume">
                {copy.jobs.emptyNoResumeAction}
              </Link>
            )}
          </div>
        </Card>
      )}
      <section className="stack" aria-labelledby="desc-h">
        <h2 id="desc-h">{copy.detail.title}</h2>
        <p className="pre-wrap">{job.description}</p>
      </section>
    </article>
  );
}
