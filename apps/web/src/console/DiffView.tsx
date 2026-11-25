// Unified diff. Sable's .diff classes draw the +/− signs (CSS ::before); visually hidden text labels
// carry the meaning for screen readers, so colour is never the only cue (skill accessibility-wcag).
import { consoleCopy } from "./copy";

export type DiffLine = { kind: "add" | "del" | "ctx" | "meta"; text: string };

export function parseDiff(diff: string): DiffLine[] {
  return diff
    .split("\n")
    .filter((l) => !l.startsWith("====") && !l.startsWith("\\ No newline"))
    .map((l): DiffLine => {
      if (l.startsWith("+++") || l.startsWith("---") || l.startsWith("@@") || l.startsWith("Index:")) return { kind: "meta", text: l };
      if (l.startsWith("+")) return { kind: "add", text: l.slice(1) };
      if (l.startsWith("-")) return { kind: "del", text: l.slice(1) };
      return { kind: "ctx", text: l.startsWith(" ") ? l.slice(1) : l };
    });
}

const CLASS = { add: "diff-line diff-add", del: "diff-line diff-del", ctx: "diff-line", meta: "diff-line text-secondary" } as const;
const LABEL = { add: consoleCopy.proposal.added, del: consoleCopy.proposal.removed } as const;

export function DiffView({ diff }: { diff: string }) {
  const lines = parseDiff(diff);
  const added = lines.filter((l) => l.kind === "add").length;
  const removed = lines.filter((l) => l.kind === "del").length;
  if (added + removed === 0) return <p>{consoleCopy.proposal.noChanges}</p>;
  return (
    <section aria-label={consoleCopy.proposal.diff} className="stack">
      <p className="text-sm">
        {added} lines added, {removed} lines removed
      </p>
      <ol className="diff">
        {lines.map((l, i) => (
          <li key={i} className={CLASS[l.kind]}>
            {l.kind === "add" || l.kind === "del" ? <span className="visually-hidden">{LABEL[l.kind]}: </span> : null}
            {l.text || " "}
          </li>
        ))}
      </ol>
    </section>
  );
}
