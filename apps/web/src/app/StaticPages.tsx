import { Link } from "react-router-dom";
import { Card, EmptyState } from "../design/components";
import { copy } from "../content/copy";
import { howItWorks, scoreBands, scoreWeights } from "../content/how-it-works";
import { resources, resourcesCopy } from "../content/resources";

export function HowItWorksPage() {
  return (
    <div className="stack-lg">
      <h1>{howItWorks.title}</h1>
      <p>{howItWorks.intro}</p>
      {howItWorks.sections.map((s) => (
        <section key={s.id} className="stack" aria-labelledby={`h-${s.id}`}>
          <h2 id={`h-${s.id}`}>{s.title}</h2>
          {s.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {"bullets" in s && s.bullets ? (
            <ul className="stack">
              {s.bullets.map((b) => (
                <li key={b}>{b}</li>
              ))}
            </ul>
          ) : null}
        </section>
      ))}
      <section className="stack" aria-labelledby="w-h">
        <h2 id="w-h">{howItWorks.weightsHeading}</h2>
        <p>{howItWorks.weightsIntro}</p>
        <table>
          <tbody>
            {scoreWeights.map((w) => (
              <tr key={w.label}>
                <th scope="row" className="text-left">{w.label}</th>
                <td>{w.points}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="text-sm text-secondary">{howItWorks.weightsNote}</p>
      </section>
      <section className="stack" aria-labelledby="b-h">
        <h2 id="b-h">{howItWorks.bandsHeading}</h2>
        <ul className="stack">
          {scoreBands.map((b) => (
            <li key={b.label}>
              <span aria-hidden="true">{b.icon}</span> {b.label}: {b.range}
            </li>
          ))}
        </ul>
      </section>
      <p>{howItWorks.nextStep}</p>
      <Link className="button button--primary" to="/resume">
        {howItWorks.nextAction}
      </Link>
    </div>
  );
}

export function ResourcesPage() {
  return (
    <div className="stack-lg">
      <h1>{resourcesCopy.title}</h1>
      <p>{resourcesCopy.intro}</p>
      {resources.map((c) => (
        <section key={c.id} className="stack" aria-labelledby={`r-${c.id}`}>
          <h2 id={`r-${c.id}`}>{c.title}</h2>
          <ul className="stack">
            {c.items.map((r) => {
              const external = /^https?:/.test(r.url);
              return (
                <Card as="li" key={r.url}>
                  <div className="stack">
                    <a
                      href={r.url}
                      {...(external ? { target: "_blank", rel: "noreferrer noopener", "aria-label": `${r.title}. ${resourcesCopy.externalHint}` } : {})}
                    >
                      {r.title}
                    </a>
                    <p className="text-sm text-secondary">{r.why}</p>
                  </div>
                </Card>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function NotFoundPage() {
  return (
    <EmptyState
      title={copy.errors.notFoundTitle}
      description={copy.errors.notFoundBody}
      action={
        <Link className="button button--primary" to="/">
          {copy.errors.notFoundAction}
        </Link>
      }
    />
  );
}
