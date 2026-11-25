import { useCallback, useId, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import type { CandidateProfile } from "@schemas";
import { Button, Card, EmptyState, Sheet, Spinner } from "../design/components";
import { copy } from "../content/copy";
import { ApiError, postResume } from "./api";
import { useData } from "./data";

type ListKey = "skills" | "titles" | "certifications" | "education";

function ListEditor({ label, items, onChange }: { label: string; items: string[]; onChange: (v: string[]) => void }) {
  const [draft, setDraft] = useState("");
  const id = useId();
  const add = () => {
    const v = draft.trim();
    if (v && !items.includes(v)) onChange([...items, v]);
    setDraft("");
  };
  return (
    <fieldset className="stack">
      <legend>
        <h3>{label}</h3>
      </legend>
      <ul className="row">
        {items.map((s) => (
          <li key={s}>
            <button type="button" className="chip" aria-label={`Remove ${s}`} onClick={() => onChange(items.filter((x) => x !== s))}>
              {s} ×
            </button>
          </li>
        ))}
      </ul>
      <div className="row">
        <label htmlFor={id} className="visually-hidden">{`Add to ${label}`}</label>
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          style={{ minHeight: 44 }}
        />
        <Button variant="secondary" onClick={add}>
          Add
        </Button>
      </div>
    </fieldset>
  );
}

function errorText(e: unknown): string {
  if (e instanceof ApiError) {
    if (e.code === "file_too_large" || e.status === 413) return copy.upload.errorSize;
    if (e.code === "unsupported_type" || e.status === 415) return copy.upload.errorType;
    if (e.code === "empty_text" || e.status === 422) return copy.upload.errorEmpty;
    if (e.status === 429) return copy.errors.rateLimit;
  }
  if (!navigator.onLine) return copy.offline.uploadNeedsNet;
  return copy.upload.errorGeneric;
}

export function ResumePage() {
  const { profile, setProfile, deleteMyData } = useData();
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<CandidateProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [confirm, setConfirm] = useState(false);
  const [deleted, setDeleted] = useState(false);
  const closeConfirm = useCallback(() => setConfirm(false), []);

  const current = draft ?? profile;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const input = file ?? text.trim();
    if (!input) return;
    if (file && file.size > 5 * 1024 * 1024) return setError(copy.upload.errorSize);
    setBusy(true);
    setError("");
    setDeleted(false);
    try {
      const p = await postResume(input);
      setProfile(p);
      setDraft(null);
      setFile(null);
      setText("");
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  const edit = (patch: Partial<CandidateProfile>) => {
    if (!current) return;
    setSaved(false);
    setDraft({ ...current, ...patch });
  };

  return (
    <div className="stack-lg">
      <h1>{current ? copy.resume.title : copy.upload.title}</h1>
      {deleted && !current && <p role="status">{copy.resume.deleted}</p>}
      {current ? (
        <section className="stack-lg" aria-label={copy.resume.title}>
          <p className="text-secondary">{copy.resume.intro}</p>
          {(["skills", "titles", "certifications", "education"] as ListKey[]).map((k) => (
            <ListEditor key={k} label={copy.resume[k]} items={current[k]} onChange={(v) => edit({ [k]: v })} />
          ))}
          <label className="stack">
            <span>{copy.resume.years}</span>
            <input
              type="number"
              min={0}
              max={70}
              value={current.yearsExperience}
              onChange={(e) => edit({ yearsExperience: Math.min(70, Math.max(0, Number(e.target.value) || 0)) })}
              style={{ minHeight: 44 }}
            />
          </label>
          <div className="row">
            <Button
              disabled={!draft}
              onClick={() => {
                if (draft) setProfile(draft);
                setDraft(null);
                setSaved(true);
              }}
            >
              {copy.resume.save}
            </Button>
            <Button variant="danger" onClick={() => setConfirm(true)}>
              Delete my data
            </Button>
          </div>
          <p role="status">{saved ? copy.resume.saved : ""}</p>
          <p className="text-sm text-secondary">{copy.upload.privacy}</p>
        </section>
      ) : (
        <EmptyState title={copy.resume.empty} />
      )}
      <Card as="section" aria-labelledby="up-h">
        <form className="stack" onSubmit={submit}>
          <h2 id="up-h">{current ? copy.resume.replace : copy.upload.cta}</h2>
          <label className="stack">
            <span>{copy.upload.chooseFile}</span>
            <input
              type="file"
              accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            />
            <span className="text-sm text-secondary">{copy.upload.dropHint}</span>
          </label>
          <label className="stack">
            <span>{copy.upload.pasteLabel}</span>
            <textarea rows={6} value={text} onChange={(e) => setText(e.target.value)} />
          </label>
          <Button type="submit" disabled={busy || (!file && !text.trim())}>
            {copy.upload.submit}
          </Button>
          <div role="status" aria-live="polite">
            {busy ? <Spinner label={copy.upload.reading} /> : null}
          </div>
          {error && <p role="alert">{error}</p>}
        </form>
      </Card>
      {current && (
        <Link className="button button--secondary" to="/">
          {copy.jobs.title}
        </Link>
      )}
      <Sheet open={confirm} title={copy.resume.deleteConfirmTitle} onClose={closeConfirm} closeLabel={copy.app.cancel}>
        <div className="stack">
          <p>{copy.resume.deleteConfirmBody}</p>
          <Button
            variant="danger"
            onClick={() => {
              deleteMyData();
              setDraft(null);
              setConfirm(false);
              setDeleted(true);
            }}
          >
            {copy.resume.deleteConfirm}
          </Button>
        </div>
      </Sheet>
    </div>
  );
}
